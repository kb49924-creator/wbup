"""
Асинхронный загрузчик каталога продавца Wildberries (Engine 2.0).
Использует aiohttp (Мобильное API) для моментального и безопасного обхода 403 Forbidden.

Стратегия:
Вместо тяжёлого Playwright, который триггерит Qrator JS-challenge, 
мы используем эмуляцию мобильного приложения (appType=1) и iPhone User-Agent.
"""

from __future__ import annotations
import asyncio
import random
import aiohttp
from src.wb.catalog import WBCatalog
from src.database import db
from src.utils.logger import get_logger

logger = get_logger("catalog_fetcher")

# Заголовки, которые делают нас "мобильным приложением" в глазах WB
HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Accept": "*/*",
    "Origin": "https://www.wildberries.ru",
    "Referer": "https://www.wildberries.ru/"
}

_shared_session: aiohttp.ClientSession | None = None


async def _get_shared_session() -> aiohttp.ClientSession:
    """Возвращает постоянную оптимизированную сессию с пулом TCP-соединений."""
    global _shared_session
    if _shared_session is None or _shared_session.closed:
        connector = aiohttp.TCPConnector(
            limit=100,
            limit_per_host=30,
            ttl_dns_cache=600,
            use_dns_cache=True,
            keepalive_timeout=60,
        )
        _shared_session = aiohttp.ClientSession(
            connector=connector,
            headers=HEADERS,
        )
    return _shared_session


class WBCatalogFetcher:
    """Асинхронно загружает каталог продавца через легковесное API."""

    def __init__(self, session=None):
        self.catalog = WBCatalog()
        # session теперь игнорируется, оставляем для обратной совместимости в engine.py
        self._total = 0

    async def get_products(self, supplier_id: int) -> list | None:
        """Получает каталог продавца асинхронно через aiohttp."""
        cached = self._load_from_cache(supplier_id)
        if cached is not None:
            logger.debug("Cache hit for seller %s (%s products)", supplier_id, len(cached))
            return cached

        try:
            logger.info("Fetching catalog (Mobile API) for seller %s...", supplier_id)
            
            url = f"https://catalog.wb.ru/sellers/v4/catalog?appType=1&dest=-1257786&supplier={supplier_id}"
            
            http_session = await _get_shared_session()
            # Делаем до 3 попыток в случае 429 (Rate Limit)
            catalog_data = None
            for attempt in range(1, 4):
                try:
                    async with http_session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        if response.status == 200:
                            catalog_data = await response.json()
                            break
                        elif response.status == 429:
                            logger.warning("WB Rate limit (429) for seller %s, attempt %s/3. Waiting...", supplier_id, attempt)
                            await asyncio.sleep(random.uniform(2, 5))
                        else:
                            logger.error("Unexpected status %s for seller %s", response.status, supplier_id)
                            break
                except Exception as req_err:
                    if attempt == 3:
                        raise req_err
                    await asyncio.sleep(1.0)
            
            if not catalog_data:
                logger.warning("Failed to get catalog data for seller %s after 3 attempts", supplier_id)
                return None
                    
            self._total = catalog_data.get("data", {}).get("total", 0)
            if self._total == 0 and "total" in catalog_data:
                self._total = catalog_data.get("total", 0)
            
            # Защита от изменения структуры ответа
            products_raw = catalog_data.get("data", {}).get("products", [])
            if not products_raw and "products" in catalog_data:
                products_raw = catalog_data.get("products", [])
            
            # Парсим через наш catalog (ему нужен формат {'products': [...]})
            products = self.catalog.parse_products({'products': products_raw})
            
            if products:
                try:
                    ttl = int(db.get_setting("cache_ttl_seconds", "21600"))
                except (ValueError, TypeError):
                    ttl = 21600
                db.cache_set(f"catalog:{supplier_id}", catalog_data, ttl_seconds=ttl)
                
            logger.info("✅ OK: seller %s -> %s products", supplier_id, len(products))
            return products
                
        except Exception as e:
            logger.warning("API fetch failed for seller %s: %s", supplier_id, e)
            return None

    def _load_from_cache(self, supplier_id: int) -> list | None:
        cached_data = db.cache_get(f"catalog:{supplier_id}")
        if cached_data is None:
            return None
            
        products_raw = cached_data.get("data", {}).get("products", [])
        if not products_raw and "products" in cached_data:
            products_raw = cached_data.get("products", [])
            
        products = self.catalog.parse_products({'products': products_raw})
        
        total = cached_data.get("data", {}).get("total", len(products))
        if total == len(products) and "total" in cached_data:
            total = cached_data.get("total", len(products))
            
        self._total = total
        return products

    @property
    def total(self):
        return self._total