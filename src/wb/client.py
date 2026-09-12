from __future__ import annotations
import time
from typing import NamedTuple

from src.wb.session import WBSession
from src.wb.product_api import WBProductAPI
from src.wb.catalog_fetcher import WBCatalogFetcher
from src.utils.logger import get_logger

logger = get_logger("client")


class CatalogResult(NamedTuple):
    """Результат запроса каталога продавца.

    Позволяет отличить успешный ответ (даже пустой каталог)
    от ошибки соединения/сессии.
    """
    products: list
    error: str | None = None

    @property
    def is_error(self) -> bool:
        return self.error is not None

    @property
    def is_empty(self) -> bool:
        return not self.products and not self.error


class WBClient:

    def __init__(self):

        self.session = WBSession()
        self.session.start()

        self.api = WBProductAPI(self.session)
        self.catalog = WBCatalogFetcher(self.session)

    def get_product(self, article: int, retries: int = 2):

        for attempt in range(1, retries + 1):

            try:

                # Проверяем, жива ли сессия
                if not self.session.ensure_alive():
                    logger.error("Session is dead, cannot get product %s", article)
                    return None

                return self.api.get_product(article)

            except Exception as e:

                error_str = str(e).lower()

                # Если ошибка связана с закрытием страницы — пересоздаём сессию
                if "closed" in error_str or "target" in error_str:
                    logger.warning(
                        "Browser error on get_product %s (attempt %s/%s): %s",
                        article, attempt, retries, e,
                    )
                    if attempt < retries:
                        self.session.ensure_alive()
                        time.sleep(2)
                        continue

                logger.error("Failed to get product %s: %s", article, e)
                return None

        return None

    def get_seller_products(self, supplier_id: int, retries: int = 2) -> CatalogResult:
        """Получает каталог товаров продавца.

        Returns:
            CatalogResult.products — список товаров (может быть пустым,
                если у продавца нет товаров или все отфильтрованы).
            CatalogResult.error — строка с описанием ошибки, если запрос
                не удался (таймаут, сессия умерла, сетевые проблемы).
                Если None — запрос выполнен успешно.
        """
        for attempt in range(1, retries + 1):

            try:

                # Проверяем, жива ли сессия
                if not self.session.ensure_alive():
                    msg = f"Session is dead, cannot get catalog for {supplier_id}"
                    logger.error(msg)
                    return CatalogResult([], error=msg)

                products = self.catalog.get_products(supplier_id)
                # get_products() возвращает [] при ошибках, None — если кэш пуст
                if products is None:
                    return CatalogResult([], error=f"Empty cache for seller {supplier_id}")
                return CatalogResult(products)

            except Exception as e:

                error_str = str(e).lower()

                if "closed" in error_str or "target" in error_str:
                    logger.warning(
                        "Browser error on get_seller_products %s (attempt %s/%s): %s",
                        supplier_id, attempt, retries, e,
                    )
                    if attempt < retries:
                        self.session.ensure_alive()
                        time.sleep(2)
                        continue

                logger.error("Failed to get catalog for seller %s: %s", supplier_id, e)
                return CatalogResult([], error=str(e))

        return CatalogResult([], error=f"All {retries} attempts failed for seller {supplier_id}")

    @property
    def total(self):

        return self.catalog.total

    def stop(self):
        """Останавливает клиент.

        ВАЖНО: Не закрывает сессию Playwright, чтобы избежать
        лишнего запуска/остановки браузера при каждой проверке.
        Браузер закроется автоматически при завершении процесса.
        """
        pass
