"""
HTTP-клиент с кастомным DNS resolution для Wildberries.

Системный DNS не резолвит *.wbbasket.ru, но nslookup через 1.1.1.1 работает.
Однако subprocess.run() с nslookup зависает на Windows при захвате stdout.

РЕШЕНИЕ: Используем urllib3.HTTPSConnectionPool напрямую к IP-адресам
с assert_hostname для проверки SSL-сертификата.

IP-адреса для basket-доменов получены через nslookup и захардкожены.
"""

from __future__ import annotations
import ssl
import random
from typing import Optional
from urllib3 import HTTPSConnectionPool
from urllib.parse import urlparse

from src.utils.logger import get_logger

logger = get_logger("wb_http_client")

# User-Agent для запросов
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
)

# Таймауты
CONNECT_TIMEOUT = 10
READ_TIMEOUT = 15

# Известные IP-адреса для basket-{n}.wbbasket.ru (получены через nslookup)
# Все basket используют один из этих IP
BASKET_IPS = [
    "213.184.157.13",
    "85.198.78.80",
    "85.198.78.82",
    "185.138.255.116",
    "213.184.156.52",
    "185.138.254.80",
]

# Кэш connection pool'ов: (ip, hostname) -> HTTPSConnectionPool
_pool_cache: dict[tuple[str, str], HTTPSConnectionPool] = {}


def _get_pool(ip: str, hostname: str) -> HTTPSConnectionPool:
    """Создаёт или возвращает кэшированный connection pool.

    Соединяется напрямую к IP, но проверяет SSL-сертификат по hostname.

    Args:
        ip: IP-адрес для соединения.
        hostname: Оригинальный hostname для проверки SSL.

    Returns:
        HTTPSConnectionPool.
    """
    key = (ip, hostname)
    if key not in _pool_cache:
        _pool_cache[key] = HTTPSConnectionPool(
            host=ip,
            port=443,
            cert_reqs=ssl.CERT_REQUIRED,
            assert_hostname=hostname,
            timeout=CONNECT_TIMEOUT,
            maxsize=4,
            block=False,
        )
    return _pool_cache[key]


def _is_basket_domain(host: str) -> bool:
    """Проверяет, является ли домен basket-доменом."""
    return host.startswith("basket-") and host.endswith(".wbbasket.ru")


def fetch_url(url: str, timeout: Optional[int] = None) -> Optional[bytes]:
    """Скачивает файл по URL.

    Для basket-доменов использует прямой IP-адрес (без DNS).
    Для остальных доменов использует обычный HTTPS (системный DNS).

    Args:
        url: URL для скачивания.
        timeout: Таймаут в секундах.

    Returns:
        bytes или None при ошибке.
    """
    parsed = urlparse(url)
    host = parsed.hostname
    path = parsed.path + ("?" + parsed.query if parsed.query else "")

    if not host:
        logger.error("Invalid URL: %s", url)
        return None

    read_timeout = timeout or READ_TIMEOUT

    # Для basket-доменов используем прямой IP
    if _is_basket_domain(host):
        return _fetch_via_ip(url, host, path, read_timeout)

    # Для остальных доменов (wildberries.ru, wb.ru) — системный DNS
    return _fetch_via_dns(url, host, path, read_timeout)


def _fetch_via_ip(url: str, host: str, path: str, timeout: int) -> Optional[bytes]:
    """Скачивает через прямой IP (для basket-доменов).

    Перебирает известные IP-адреса, пока один не сработает.

    Args:
        url: Исходный URL (для логов).
        host: Оригинальный hostname.
        path: Путь запроса.
        timeout: Таймаут.

    Returns:
        bytes или None.
    """
    # Перемешиваем IP для распределения нагрузки
    ips = list(BASKET_IPS)
    random.shuffle(ips)

    for ip in ips:
        try:
            pool = _get_pool(ip, host)
            response = pool.request(
                "GET",
                path,
                headers={
                    "Host": host,
                    "User-Agent": USER_AGENT,
                    "Accept": "image/webp,image/*,*/*",
                    "Accept-Encoding": "identity",
                    "Connection": "keep-alive",
                },
                timeout=timeout,
                retries=1,
                preload_content=True,
            )

            if response.status == 200:
                body = response.data
                if len(body) >= 20000:
                    logger.debug(
                        "Downloaded %s: %d bytes (via IP %s)", url, len(body), ip
                    )
                    return body
                else:
                    logger.debug(
                        "Response too small for %s: %d bytes (IP %s)",
                        url, len(body), ip,
                    )
                    return None
            else:
                logger.debug(
                    "HTTP %d for %s (IP %s)", response.status, url, ip
                )

        except Exception as e:
            logger.debug("Failed via IP %s for %s: %s", ip, url, e)
            continue

    logger.debug("All IPs failed for %s", url)
    return None


def _fetch_via_dns(url: str, host: str, path: str, timeout: int) -> Optional[bytes]:
    """Скачивает через системный DNS (для wildberries.ru, wb.ru).

    Args:
        url: Исходный URL (для логов).
        host: Hostname.
        path: Путь запроса.
        timeout: Таймаут.

    Returns:
        bytes или None.
    """
    try:
        pool = HTTPSConnectionPool(
            host=host,
            port=443,
            cert_reqs=ssl.CERT_REQUIRED,
            timeout=CONNECT_TIMEOUT,
            maxsize=4,
            block=False,
        )
        response = pool.request(
            "GET",
            path,
            headers={
                "Host": host,
                "User-Agent": USER_AGENT,
                "Accept": "image/webp,image/*,*/*",
                "Accept-Encoding": "identity",
                "Connection": "keep-alive",
            },
            timeout=timeout,
            retries=1,
            preload_content=True,
        )

        if response.status == 200:
            body = response.data
            if len(body) >= 20000:
                logger.debug("Downloaded %s: %d bytes", url, len(body))
                return body
            else:
                logger.debug("Response too small for %s: %d bytes", url, len(body))
                return None
        else:
            logger.debug("HTTP %d for %s", response.status, url)
            return None

    except Exception as e:
        logger.debug("Failed to fetch %s: %s", url, e)
        return None


def check_url(url: str, min_size: int = 20000) -> bool:
    """Проверяет, доступен ли URL.

    Делает GET-запрос с Range для проверки доступности без скачивания всего файла.

    Args:
        url: URL для проверки.
        min_size: Минимальный размер контента.

    Returns:
        True если URL доступен.
    """
    parsed = urlparse(url)
    host = parsed.hostname
    path = parsed.path + ("?" + parsed.query if parsed.query else "")

    if not host:
        return False

    timeout = 5

    if _is_basket_domain(host):
        ips = list(BASKET_IPS)
        random.shuffle(ips)
        for ip in ips:
            try:
                pool = _get_pool(ip, host)
                response = pool.request(
                    "GET",
                    path,
                    headers={
                        "Host": host,
                        "User-Agent": USER_AGENT,
                        "Accept": "image/webp,image/*,*/*",
                        "Range": "bytes=0-0",
                    },
                    timeout=timeout,
                    retries=1,
                    preload_content=True,
                )
                if response.status in (200, 206):
                    content_length = response.headers.get("Content-Length")
                    if content_length and int(content_length) >= min_size:
                        return True
                    if response.status == 200:
                        return len(response.data) >= min_size
                    return True
            except Exception:
                continue
        return False
    else:
        try:
            pool = HTTPSConnectionPool(
                host=host, port=443, cert_reqs=ssl.CERT_REQUIRED, timeout=timeout,
            )
            response = pool.request(
                "GET",
                path,
                headers={
                    "Host": host,
                    "User-Agent": USER_AGENT,
                    "Accept": "image/webp,image/*,*/*",
                    "Range": "bytes=0-0",
                },
                timeout=timeout,
                retries=1,
                preload_content=True,
            )
            if response.status in (200, 206):
                content_length = response.headers.get("Content-Length")
                if content_length and int(content_length) >= min_size:
                    return True
                if response.status == 200:
                    return len(response.data) >= min_size
                return True
            return False
        except Exception:
            return False