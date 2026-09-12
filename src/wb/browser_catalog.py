from __future__ import annotations
from src.wb.catalog import WBCatalog
from src.wb.session import WBSession
from src.database import db
from src.utils.logger import get_logger

logger = get_logger("browser_catalog")


class WBBrowserCatalog:

    def __init__(self, session: WBSession):

        self.session = session
        self.catalog = WBCatalog()

        self._total = 0

    def get_products(self, supplier_id: int):

        # Пробуем загрузить из кэша
        cached = self._load_from_cache(supplier_id)
        if cached is not None:
            logger.info("Cache hit for seller %s (%s products)", supplier_id, len(cached))
            return cached

        # Загружаем через браузер (сохраняет в кэш внутри)
        products = self._fetch_from_browser(supplier_id)

        return products or []

    def _load_from_cache(self, supplier_id: int) -> list | None:
        """Загружает товары из кэша БД."""
        cached_data = db.cache_get(f"catalog:{supplier_id}")
        if cached_data is None:
            return None

        # Парсим сохранённый JSON через catalog
        products = self.catalog.parse_products(cached_data)
        self._total = cached_data.get("total", len(products))
        logger.debug("Loaded %s products from cache for seller %s", len(products), supplier_id)
        return products

    def _fetch_from_browser(self, supplier_id: int) -> list | None:
        """Загружает товары через браузер и сохраняет сырые данные."""
        page = self.session.page

        try:
            # Запускаем ожидание ответа ДО перехода на страницу
            with page.expect_response(
                lambda r: "/__internal/u-catalog/sellers/v4/catalog" in r.url,
                timeout=30000,  # 30 секунд таймаут на API-ответ
            ) as resp:

                page.goto(
                    f"https://www.wildberries.ru/seller/{supplier_id}",
                    wait_until="commit",  # минимальное ожидание — только начало навигации
                )

            data = resp.value.json()

            if not data:
                self._total = 0
                return []

            self._total = data.get("total", 0)

            products = self.catalog.parse_products(data)

            # Сохраняем сырые данные в кэш
            if products:
                try:
                    ttl = int(db.get_setting("cache_ttl_seconds", "21600"))
                except (ValueError, TypeError):
                    ttl = 21600
                db.cache_set(f"catalog:{supplier_id}", data, ttl_seconds=ttl)
                logger.info("Cached %s products for seller %s (ttl=%ss)", len(products), supplier_id, ttl)

            return products

        except Exception as e:
            logger.error("Failed to fetch catalog for seller %s: %s", supplier_id, e)
            return None

    @property
    def total(self):

        return self._total