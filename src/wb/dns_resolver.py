"""
Кастомный DNS resolver для доменов Wildberries.

Системный socket.getaddrinfo() не резолвит домены *.wbbasket.ru,
но nslookup из командной строки работает (через системный DNS-клиент Windows).

Используем WinDNS API (dnsapi.dll) напрямую через ctypes.
Это единственный способ, который не зависает (не создаёт дочерний процесс).
"""

from __future__ import annotations
import ctypes
import ctypes.wintypes
import socket
import threading
import time
from typing import Optional

from src.utils.logger import get_logger

logger = get_logger("dns_resolver")

# Константы DNS API
DNS_TYPE_A = 0x0001
DNS_QUERY_STANDARD = 0x00000000
DNS_FREE_TYPE_RECORD = 0  # FreeRecordList


class DNS_A_DATA(ctypes.Structure):
    _fields_ = [("IpAddress", ctypes.c_byte * 4)]


class DNS_RECORD(ctypes.Structure):
    pass


DNS_RECORD._fields_ = [
    ("pNext", ctypes.POINTER(DNS_RECORD)),
    ("pName", ctypes.c_wchar_p),
    ("wType", ctypes.c_ushort),
    ("wDataLength", ctypes.c_ushort),
    ("Flags", ctypes.c_ulong),
    ("dwTtl", ctypes.c_ulong),
    ("dwReserved", ctypes.c_ulong),
    ("Data", DNS_A_DATA),
]

# Загружаем dnsapi.dll
_dnsapi = ctypes.windll.dnsapi
_DnsQuery = _dnsapi.DnsQuery_W
_DnsQuery.argtypes = [
    ctypes.c_wchar_p,  # pszName
    ctypes.c_ushort,   # wType
    ctypes.c_ulong,    # Options
    ctypes.c_void_p,   # pExtra
    ctypes.POINTER(ctypes.POINTER(DNS_RECORD)),  # ppQueryResults
    ctypes.c_void_p,   # pReserved
]
_DnsQuery.restype = ctypes.c_ulong

_DnsRecordListFree = _dnsapi.DnsRecordListFree
_DnsRecordListFree.argtypes = [
    ctypes.POINTER(DNS_RECORD),
    ctypes.c_ulong,
]
_DnsRecordListFree.restype = None

# Кэш: domain -> (ip_list, timestamp)
_cache: dict[str, tuple[list[str], float]] = {}
_cache_lock = threading.Lock()
_CACHE_TTL = 300  # 5 минут


def resolve(domain: str) -> Optional[str]:
    """Резолвит домен через WinDNS API (dnsapi.dll).

    Не создаёт дочерних процессов, не зависает.
    Использует системный DNS-клиент Windows (который может использовать DoH).

    Args:
        domain: Доменное имя (например, "basket-17.wbbasket.ru").

    Returns:
        str: IP-адрес или None.
    """
    now = time.time()

    # Проверяем кэш
    with _cache_lock:
        if domain in _cache:
            ips, ts = _cache[domain]
            if now - ts < _CACHE_TTL:
                return ips[0] if ips else None
            else:
                del _cache[domain]

    # Резолвим DNS через WinDNS API
    ips = _resolve_windns(domain)

    # Кэшируем результат
    with _cache_lock:
        _cache[domain] = (ips, time.time())

    if ips:
        logger.debug("Resolved %s -> %s", domain, ips[0])
        return ips[0]
    else:
        logger.debug("Domain %s not resolved", domain)
        return None


def _resolve_windns(domain: str) -> list[str]:
    """Резолвит домен через WinDNS API (DnsQuery_W).

    Returns:
        list[str]: Список IP-адресов.
    """
    record_ptr = ctypes.POINTER(DNS_RECORD)()
    try:
        result = _DnsQuery(
            domain,
            DNS_TYPE_A,
            DNS_QUERY_STANDARD,
            None,
            ctypes.byref(record_ptr),
            None,
        )

        if result != 0:
            return []

        ips = []
        r = record_ptr
        while r:
            if r.contents.wType == DNS_TYPE_A:
                ip_bytes = bytes(r.contents.Data.IpAddress)
                ip = socket.inet_ntoa(ip_bytes)
                ips.append(ip)
            r = r.contents.pNext

        return ips

    except Exception as e:
        logger.debug("WinDNS error for %s: %s", domain, e)
        return []

    finally:
        if record_ptr:
            try:
                _DnsRecordListFree(record_ptr, DNS_FREE_TYPE_RECORD)
            except Exception:
                pass


def resolve_basket(basket_num: int) -> Optional[str]:
    """Резолвит basket-{n}.wbbasket.ru.

    Args:
        basket_num: Номер корзины (0-99).

    Returns:
        IP-адрес или None.
    """
    return resolve(f"basket-{basket_num}.wbbasket.ru")


def clear_cache():
    """Очищает кэш DNS."""
    with _cache_lock:
        _cache.clear()
    logger.debug("DNS cache cleared")