import json
import os

from src.wb.browser_catalog import WBBrowserCatalog
from src.config import CACHE_DIR


class WBMonitor:

    def __init__(self, catalog: WBBrowserCatalog):

        self.catalog = catalog

        self.cache_dir = str(CACHE_DIR)

        os.makedirs(self.cache_dir, exist_ok=True)

    def _file(self, supplier_id: int):

        return os.path.join(
            self.cache_dir,
            f"{supplier_id}.json"
        )

    def load(self, supplier_id: int):

        file = self._file(supplier_id)

        if not os.path.exists(file):

            return {
                "supplier_id": supplier_id,
                "articles": []
            }

        with open(file, "r", encoding="utf-8") as f:
            return json.load(f)

    def save(self, supplier_id: int, articles):

        with open(
            self._file(supplier_id),
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                {
                    "supplier_id": supplier_id,
                    "articles": articles
                },
                f,
                indent=4,
                ensure_ascii=False
            )

    def check(self, supplier_id: int):

        products = self.catalog.get_products(supplier_id)

        if not products:
            print("Не удалось получить каталог продавца.")
            return []

        cache = self.load(supplier_id)

        old_articles = set(cache["articles"])

        current_articles = []

        new_products = []

        for product in products:

            current_articles.append(product.article)

            if product.article not in old_articles:
                new_products.append(product)

        self.save(
            supplier_id,
            current_articles
        )

        return new_products