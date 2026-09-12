from __future__ import annotations
import json
import asyncio
from pathlib import Path
import concurrent.futures
from src.wb.client import WBClient
from src.engine.selector import Selector
from src.telegram.publisher import TelegramPublisher
from src.database import db
from src.utils.logger import get_logger

logger = get_logger("engine")

NEW_PRODUCTS_FILE = Path("data/new_products.json")


class Engine:

    def __init__(self):
        self.selector = Selector()
        self.publisher = TelegramPublisher()

        # Для превью — последний сгенерированный пост
        self.last_preview_text: str | None = None
        self.last_preview_keyboard: dict | None = None
        self.last_preview_photos: list[str] | None = None  # список путей к фото
        self.last_preview_category: str | None = None
        self.last_preview_products: list | None = None

        # Аккумулятор для сбора товаров от всех продавцов
        self._all_selected_products: list = []

    # ---------------------------------
    # Обработка продавцов (Асинхронно)
    # ---------------------------------

    async def _fetch_seller_catalog(self, seller, fetcher):
        """Асинхронно получает каталог одного продавца и фильтрует его."""
        import time as _time
        _t0 = _time.time()
        
        supplier_id = seller["supplier_id"]
        logger.info("Processing seller %s...", supplier_id)
        
        products = await fetcher.get_products(supplier_id)
        
        if not products:
            logger.info("Empty catalog or error for seller %s (%.1fs)", supplier_id, _time.time() - _t0)
            return []
            
        # Динамический лимит: топ-N% от каталога (настройка check_percent)
        percent = int(db.get_setting("check_percent", "30"))
        limit = max(10, min(100, int(len(products) * percent / 100)))
        products_to_check = products[:limit]
        
        # Отбор
        selected = self.selector.select(products_to_check)
        if selected:
            logger.info("✅ Selected %s new products for seller %s (%.1fs)", len(selected), supplier_id, _time.time() - _t0)
        return selected

    async def _process_all_sellers_async(self, sellers):
        """Асинхронно собирает товары со всех продавцов."""
        from src.wb.catalog_fetcher import WBCatalogFetcher
        from src.wb.session import AsyncWBSession
        import asyncio
        
        all_new_products = []
        session = AsyncWBSession()
        
        try:
            await session.start()
            fetcher = WBCatalogFetcher(session)
            
            # Ограничиваем количество одновременных вкладок браузера (1 для безопасности от Qrator)
            semaphore = asyncio.Semaphore(1)
            
            async def bounded_fetch(seller):
                async with semaphore:
                    import random
                    await asyncio.sleep(random.uniform(2, 5))
                    return await self._fetch_seller_catalog(seller, fetcher)
                    
            tasks = [bounded_fetch(seller) for seller in sellers]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for res in results:
                if isinstance(res, list):
                    all_new_products.extend(res)
                else:
                    logger.error("Error in seller fetch task: %s", res)
        finally:
            await session.stop()
                    
        return all_new_products

    def process_seller(self, seller):
        """Legacy метод для совместимости. Теперь используется только для теста одного продавца."""
        import asyncio
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            try:
                import nest_asyncio
                nest_asyncio.apply()
                selected = loop.run_until_complete(self._process_all_sellers_async([seller]))
            except Exception:
                selected = []
        else:
            selected = asyncio.run(self._process_all_sellers_async([seller]))
        if selected:
            self._all_selected_products.extend(selected)
            self.last_preview_products = selected
            self.last_preview_category = selected[0].category or "Одежда"


    def save_products_to_file(self):
        """Сохраняет last_preview_products в data/new_products.json."""
        if not self.last_preview_products:
            logger.info("No products to save")
            return
        try:
            NEW_PRODUCTS_FILE.parent.mkdir(parents=True, exist_ok=True)
            data = [p.to_dict() for p in self.last_preview_products]
            with open(NEW_PRODUCTS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info("Saved %s products to %s", len(data), NEW_PRODUCTS_FILE)
        except Exception as e:
            logger.error("Failed to save products to file: %s", e)

    @staticmethod
    def load_products_from_file() -> list | None:
        """Загружает продукты из data/new_products.json."""
        from src.wb.models import Product
        try:
            if not NEW_PRODUCTS_FILE.exists():
                logger.info("No new products file found")
                return None
            with open(NEW_PRODUCTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            products = [Product.from_dict(item) for item in data]
            logger.info("Loaded %s products from %s", len(products), NEW_PRODUCTS_FILE)
            return products
        except Exception as e:
            logger.error("Failed to load products from file: %s", e)
            return None

    @staticmethod
    def remove_published_from_file(published_articles: set[int]) -> int:
        """Удаляет опубликованные товары из new_products.json.

        Args:
            published_articles: множество артикулов опубликованных товаров.

        Returns:
            Количество удалённых товаров.
        """
        from src.wb.models import Product
        try:
            if not NEW_PRODUCTS_FILE.exists():
                return 0

            with open(NEW_PRODUCTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

            products = [Product.from_dict(item) for item in data]
            before = len(products)
            products = [p for p in products if p.article not in published_articles]
            removed = before - len(products)

            if removed > 0:
                data = [p.to_dict() for p in products]
                with open(NEW_PRODUCTS_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                logger.info(
                    "Removed %s published products from %s, %s remaining",
                    removed, NEW_PRODUCTS_FILE, len(products),
                )
            else:
                logger.info("No published products to remove from file")

            return removed
        except Exception as e:
            logger.error("Failed to remove published products: %s", e)
            return 0

    @staticmethod
    def clear_products_file() -> bool:
        """Очищает файл new_products.json (удаляет все товары из списка).

        Returns:
            True если файл был очищен.
        """
        try:
            if NEW_PRODUCTS_FILE.exists():
                NEW_PRODUCTS_FILE.unlink()
                logger.info("Cleared products file: %s", NEW_PRODUCTS_FILE)
            else:
                logger.info("Products file already empty")
            return True
        except Exception as e:
            logger.error("Failed to clear products file: %s", e)
            return False

    # ---------------------------------
    # Все продавцы
    # ---------------------------------

    def run(self, allowed_categories: list[str] | None = None, progress_callback=None):

        """
        Запускает проверку всех продавцов.

        Args:
            allowed_categories: список категорий для фильтрации.
                Если None — берётся из настройки scheduler_categories.
            progress_callback: функция для отправки прогресса.
                Вызывается с аргументами (stage: str, current: int, total: int, message: str).
        """

        from src.config.sellers import get_enabled_sellers

        sellers = get_enabled_sellers()

        logger.info(
            "Sellers in DB: %s", len(sellers)
        )

        # Определяем разрешённые категории
        if allowed_categories is None:
            cats_str = db.get_setting("scheduler_categories", "")
            allowed_categories = [c.strip() for c in cats_str.split(",") if c.strip()] if cats_str else []

        if allowed_categories:
            logger.info("Filtering by categories: %s", allowed_categories)

        # Сбрасываем аккумулятор
        self._all_selected_products = []

        total_sellers = len(sellers)
        
        # Запускаем асинхронный сбор
        logger.info("Starting async seller processing for %s sellers...", total_sellers)
        import asyncio
        
        # We might be in a thread without an event loop, so get_event_loop() can raise RuntimeError
        try:
            loop = asyncio.get_event_loop()
            is_running = loop.is_running()
        except RuntimeError:
            is_running = False

        if is_running:
            import nest_asyncio
            nest_asyncio.apply()
            
        try:
            selected_products = asyncio.run(self._process_all_sellers_async(sellers))
        except Exception as e:
            logger.exception("Error in asyncio.run(_process_all_sellers_async): %s", e)
            raise
        
        # Интеграция глобального поиска (опционально)
        try:
            from src.wb.global_search import WBGlobalSearch
            global_search = WBGlobalSearch()
            if allowed_categories:
                logger.info("Starting global search for categories: %s", allowed_categories)
                global_products = asyncio.run(global_search.search(allowed_categories, limit=20))
                if global_products:
                    # Фильтруем глобальные товары через Selector
                    valid_global = self.selector.select(global_products)
                    logger.info("Global search yielded %s valid products", len(valid_global))
                    selected_products.extend(valid_global)
        except Exception as e:
            logger.error("Global search failed: %s", e)
            
        if selected_products:
            self._all_selected_products.extend(selected_products)


        # Сохраняем ВСЕ накопленные товары в last_preview_products и в файл
        if self._all_selected_products:
            self.last_preview_products = self._all_selected_products
            logger.info("Total products collected from all sellers: %s", len(self._all_selected_products))
        self.save_products_to_file()

    # ---------------------------------
    # Закрытие
    # ---------------------------------

    def close(self):
        pass