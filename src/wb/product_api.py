from __future__ import annotations
from src.wb.models import Product
from src.wb.session import WBSession
from src.wb.category import detect_category
from src.utils.logger import get_logger

logger = get_logger("product_api")


class WBProductAPI:

    def __init__(self, session: WBSession):
        self.session = session

    def get_product(self, article: int) -> Product | None:

        page = self.session.page

        with page.expect_response(
            lambda r: "__internal/u-card/cards/v4/detail" in r.url
        ) as resp:

            page.goto(
                f"https://www.wildberries.ru/catalog/{article}/detail.aspx",
                wait_until="domcontentloaded",
            )

            page.wait_for_timeout(3000)

        data = resp.value.json()

        products = data.get("products", [])

        if not products:
            return None

        item = products[0]

        # -------------------------
        # Цены
        # -------------------------

        # Логируем все ключи item, чтобы понять структуру
        logger.info(
            "Detail API item keys for %s: %s",
            article, list(item.keys()),
        )

        price = None
        sale_price = None

        # 1) Пробуем price на верхнем уровне
        price_data = item.get("price", {})
        if price_data and isinstance(price_data, dict):
            price = (
                price_data.get("basic")
                or price_data.get("total")
                or price_data.get("price")
            )
            sale_price = (
                price_data.get("product")
                or price_data.get("sale")
            )

        # 2) Если не нашли — пробуем sizes[0].price (как в каталоге)
        if price is None and sale_price is None:
            sizes = item.get("sizes", [])
            if sizes:
                size_price_data = sizes[0].get("price", {})
                logger.info(
                    "Trying sizes[0].price for %s: keys=%s values=%s",
                    article,
                    list(size_price_data.keys()) if size_price_data else "no keys",
                    size_price_data,
                )
                if size_price_data and isinstance(size_price_data, dict):
                    price = (
                        size_price_data.get("basic")
                        or size_price_data.get("total")
                        or size_price_data.get("price")
                    )
                    sale_price = (
                        size_price_data.get("product")
                        or size_price_data.get("sale")
                    )

        # 3) Если всё ещё нет — пробуем salePrice/price на верхнем уровне (другой формат API)
        if price is None and sale_price is None:
            price = item.get("priceU") or item.get("price")
            sale_price = item.get("salePriceU") or item.get("salePrice")
            logger.info(
                "Trying top-level priceU/salePriceU for %s: price=%s sale=%s",
                article, price, sale_price,
            )

        # 4) Если price в копейках (больше 10000) — делим на 100
        logger.info(
            "Raw prices for %s: price=%s sale_price=%s",
            article, price, sale_price,
        )

        if price is not None:
            if price > 10000:  # скорее всего в копейках
                price //= 100

        if sale_price is not None:
            if sale_price > 10000:  # скорее всего в копейках
                sale_price //= 100

        logger.info(
            "Parsed prices for %s: price=%s sale_price=%s",
            article, price, sale_price,
        )

        discount = None

        if price and sale_price and price > 0:
            discount = round(
                (1 - sale_price / price) * 100
            )

        # -------------------------
        # Фото
        # -------------------------

        photos = item.get("pics", 0)

        photo_urls = []

        images = page.locator("img")

        count = images.count()

        for i in range(count):

            src = images.nth(i).get_attribute("src")

            if not src:
                continue

            # Берём только большие фотографии товара
            if "/images/big/" in src:

                if src.startswith("//"):
                    src = "https:" + src

                if src not in photo_urls:
                    photo_urls.append(src)

        name = item.get("name")

        return Product(

            # Основное
            article=item.get("id"),
            imt_id=item.get("root"),

            # Название
            name=name,
            brand=item.get("brand"),

            # Категория (определяем по названию)
            category=detect_category(name or ""),

            # Продавец
            supplier_id=item.get("supplierId"),
            supplier_name=item.get("supplier"),

            # Рейтинг
            rating=item.get("reviewRating"),
            feedbacks=item.get("feedbacks"),

            # Фото
            photos=photos,
            photo_urls=photo_urls,

            # Цены
            price=price,
            sale_price=sale_price,
            discount=discount,

            # Ссылка
            url=f"https://www.wildberries.ru/catalog/{article}/detail.aspx",
        )