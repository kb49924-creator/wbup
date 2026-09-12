from __future__ import annotations
from src.wb.models import Product
from src.wb.category import detect_category, detect_gender
from src.utils.logger import get_logger

logger = get_logger("catalog")


def _estimate_baskets(article: int) -> list[int]:
    """Оценивает наиболее вероятные basket-номера для артикула.
    
    Использует несколько эмпирических формул и возвращает список
    отсортированных приоритетных basket-номеров.
    
    Args:
        article: Артикул товара WB.
        
    Returns:
        Отсортированный список вероятных basket-номеров (до 20).
    """
    vol = article // 100000
    baskets = set()
    
    # Основные эмпирические формулы WB (сервера WB зациклены в диапазоне 1..30)
    est1 = vol // 187 + 1
    est2 = vol // 190 + 1
    est3 = vol // 185 + 1
    
    for b in [est1, est2, est3, (vol % 100) + 1, ((vol // 10) % 100) + 1]:
        norm_b = ((b - 1) % 100) + 1
        baskets.add(norm_b)
    
    # Добавляем ближайшие соседние корзины
    main_b = ((est1 - 1) % 100) + 1
    for delta in range(-5, 6):
        cand = ((main_b + delta - 1) % 100) + 1
        baskets.add(cand)
    
    # Сортируем по приоритету
    result = sorted(baskets, key=lambda b: abs(b - main_b))
    return [b for b in result if 1 <= b <= 99][:20]


def _wb_photo_urls(article: int, index: int = 1) -> list[str]:
    """Формирует список URL фото Wildberries по артикулу (расширенный перебор basket).
    
    Актуальный формат (2026): https://basket-{N}.wbbasket.ru/vol{vol}/part{part}/{article}/images/big/{index}.webp
    
    Генерирует URL для 20 наиболее вероятных basket-номеров + оба домена (.wbbasket.ru + .wb.ru).
    Это даёт до 40 URL на каждое фото, что значительно повышает шанс успеха без
    необходимости медленного перебора через Playwright.
    
    Args:
        article: Артикул товара.
        index: Индекс фото (1-based).
        
    Returns:
        Список URL для проверки (от наиболее вероятного к наименее).
    """
    vol = article // 100000
    part = article // 1000
    path = f"/vol{vol}/part{part}/{article}/images/big/{index}.webp"
    
    baskets = _estimate_baskets(article)
    
    urls = []
    for basket in baskets:
        if 0 <= basket <= 99:
            # Основной домен
            urls.append(f"https://basket-{basket}.wbbasket.ru{path}")
            # Fallback домен
            urls.append(f"https://basket-{basket}.wb.ru{path}")
    
    return urls


class WBCatalog:

    def parse_products(self, data: dict) -> list[Product]:

        products = []

        for item in data.get("products", []):

            # -------------------------
            # Цвета
            # -------------------------

            colors = [
                color.get("name")
                for color in item.get("colors", [])
                if color.get("name")
            ]

            # -------------------------
            # Цена
            # -------------------------

            price = None
            sale_price = None
            discount = None

            sizes = item.get("sizes", [])

            if sizes:

                first_size = sizes[0]

                price_data = first_size.get("price", {})

                logger.info(
                    "Catalog raw price_data for %s: keys=%s values=%s",
                    item.get("id"),
                    list(price_data.keys()) if price_data else "no price_data",
                    price_data,
                )

                # Пробуем разные названия полей (API Wildberries меняется)
                price = (
                    price_data.get("basic")
                    or price_data.get("total")
                    or price_data.get("price")
                )
                sale_price = (
                    price_data.get("product")
                    or price_data.get("sale")
                )

                if price is not None:
                    price //= 100

                if sale_price is not None:
                    sale_price //= 100

                if (
                    price
                    and sale_price
                    and price > 0
                ):
                    discount = round(
                        (1 - sale_price / price) * 100
                    )

            logger.info(
                "Catalog price for %s: price=%s sale=%s discount=%s",
                item.get("id"), price, sale_price, discount,
            )

            # -------------------------
            # Фото (формируем URL из артикула)
            # -------------------------

            article = item.get("id")
            pics = item.get("pics", 0) or 0
            photo_urls = []
            photo_fallbacks: dict[int, list[str]] = {}  # index -> [fallback_urls]
            if article:
                # Всегда формируем хотя бы 1 фото, даже если pics=0
                max_photos = max(pics, 1)
                for i in range(1, min(max_photos + 1, 6)):  # макс 5 фото
                    urls = _wb_photo_urls(article, i)
                    photo_urls.append(urls[0])  # основной URL
                    if len(urls) > 1:
                        photo_fallbacks[i] = urls[1:]  # fallback-домены

            # -------------------------
            # Создание Product
            # -------------------------

            cat = detect_category(item.get("name", ""))
            brand_name = item.get("brand") or item.get("supplier") or ""
            product = Product(

                # Основное
                article=article,
                imt_id=item.get("root"),

                # Название
                name=item.get("name"),
                brand=brand_name,

                # Категория
                category=cat,
                gender=detect_gender(item.get("name", ""), cat, brand_name),

                # Продавец
                supplier_id=item.get("supplierId"),
                supplier_name=item.get("supplier"),

                # Рейтинг
                rating=item.get("reviewRating"),
                feedbacks=item.get("feedbacks"),

                # Фото
                photos=pics,
                photo_urls=photo_urls,
                photo_fallbacks=photo_fallbacks,

                # Цвета
                colors=colors,

                # Размеры
                sizes=sizes,

                # Цена
                price=price,
                sale_price=sale_price,
                discount=discount,

                # Ссылка
                url=f"https://www.wildberries.ru/catalog/{article}/detail.aspx",
            )

            products.append(product)

        return products