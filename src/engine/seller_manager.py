import re

from src.wb.client import WBClient
from src.database import db
from src.config.sellers import get_enabled_sellers


class SellerManager:

    def __init__(self):

        self.client = WBClient()

    # ---------------------------------
    # Получение артикула
    # ---------------------------------

    def extract_article(self, text: str) -> int:

        text = text.strip()

        if text.isdigit():
            return int(text)

        patterns = [
            r"/catalog/(\d+)/",
            r"/catalog/(\d+)"
        ]

        for pattern in patterns:

            match = re.search(pattern, text)

            if match:
                return int(match.group(1))

        raise ValueError("Артикул не найден.")

    # ---------------------------------
    # Добавление продавца
    # ---------------------------------

    def add(self, text: str):

        try:

            article = self.extract_article(text)

            product = self.client.get_product(article)

            if product is None:

                print("\n❌ Не удалось получить информацию о товаре.")
                return

            for seller in get_enabled_sellers():

                if seller["supplier_id"] == product.supplier_id:

                    print("\n⚠️ Этот продавец уже есть в базе.")
                    return product

            # Добавляем в SQLite
            db.add_seller(product.supplier_id, product.brand)

            print("\n========== ТОВАР ==========\n")

            print(f"Артикул:           {product.article}")
            print(f"Название:          {product.name}")
            print(f"Бренд:             {product.brand}")

            print(f"Категория:         {product.category}")

            print(f"Цена:              {product.price}")
            print(f"Цена со скидкой:   {product.sale_price}")
            print(f"Скидка:            {product.discount}")

            print(f"ID продавца:       {product.supplier_id}")
            print(f"Продавец:          {product.supplier_name}")

            print(f"Рейтинг:           {product.rating}")
            print(f"Отзывы:            {product.feedbacks}")

            print(f"Количество фото:   {product.photos}")
            print(f"Ссылок на фото:    {len(product.photo_urls)}")

            if product.photo_urls:
                print(f"Первая фотография: {product.photo_urls[0]}")

            print("\n✅ Продавец успешно добавлен!")

            return product

        finally:

            self.client.stop()


if __name__ == "__main__":

    manager = SellerManager()

    value = input("Введите ссылку или артикул WB: ")

    manager.add(value)