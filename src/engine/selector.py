from __future__ import annotations
from collections import defaultdict

from src.database import db
from src.engine.checked import is_checked
from src.utils.logger import get_logger

logger = get_logger("selector")


class Selector:

    def is_valid(self, product):

        if not product.article:
            logger.debug("Skipping article=None (no article)")
            return False

        if not product.name:
            logger.debug("Skipping article=%s: no name", product.article)
            return False

        # Отбрасываем товары без цены
        if not product.sale_price and not product.price:
            logger.debug("Skipping article=%s: no price (sale=%s, price=%s)", product.article, product.sale_price, product.price)
            return False

        # Отбрасываем уже опубликованные товары
        if db.is_published(product.article):
            logger.debug("Skipping article=%s: already published", product.article)
            return False

        # Отбрасываем уже проверенные товары (из checked_articles.json)
        if is_checked(product.article):
            logger.debug("Skipping article=%s: already checked", product.article)
            return False

        return True

    def score(self, product, mode: str | None = None):

        score = 0

        if mode is None:
            mode = db.get_setting("mode", "mixed")

        # -----------------------------
        # Рейтинг
        # -----------------------------
        rating = product.rating or 0

        if rating >= 4.9:
            score += 30
        elif rating >= 4.8:
            score += 25
        elif rating >= 4.7:
            score += 20
        elif rating >= 4.5:
            score += 10

        # -----------------------------
        # Отзывы (зависит от режима)
        # -----------------------------
        feedbacks = product.feedbacks or 0

        if mode == "new":
            if feedbacks == 0:
                score += 50  # Огромный буст для абсолютных новинок
            elif feedbacks <= 10:
                score += 45
            elif feedbacks <= 300:
                score += 30
            elif feedbacks <= 1000:
                score += 15
            else:
                score += 5

        elif mode == "popular":
            if feedbacks >= 3000:
                score += 40
            elif feedbacks >= 1000:
                score += 30
            elif feedbacks >= 500:
                score += 20
            elif feedbacks >= 100:
                score += 10
            elif feedbacks >= 20:
                score += 5

        else:  # mixed
            if feedbacks >= 3000:
                score += 30
            elif feedbacks >= 1000:
                score += 25
            elif feedbacks >= 500:
                score += 20
            elif feedbacks >= 100:
                score += 10
            elif feedbacks >= 20:
                score += 5

        # -----------------------------
        # Фото
        # -----------------------------
        photos = product.photos or 0

        if photos >= 10:
            score += 10
        elif photos >= 5:
            score += 5

        # -----------------------------
        # Цена
        # -----------------------------
        if product.sale_price:
            score += 10
        elif product.price:
            score += 5

        return score

    def select(
        self,
        products,
        limit=None,
        per_category=None,
    ):
        if per_category is None:
            per_category = int(db.get_setting("products_per_category", "50"))

        mode = db.get_setting("mode", "mixed")

        # Читаем настройки фильтрации из БД
        try:
            min_rating = float(db.get_setting("min_rating", "4.5"))
        except (ValueError, TypeError):
            min_rating = 4.5
        try:
            max_price = int(db.get_setting("max_price", "10000"))
        except (ValueError, TypeError):
            max_price = 10000

        # Фильтруем валидные товары
        valid_products = []

        # Счётчики причин отбраковки
        reject_no_article = 0
        reject_no_name = 0
        reject_no_price = 0
        reject_published = 0
        reject_checked = 0
        reject_rating = 0
        reject_price = 0

        for product in products:

            if not product.article:
                reject_no_article += 1
                continue

            if not product.name:
                reject_no_name += 1
                continue

            if not product.sale_price and not product.price:
                reject_no_price += 1
                continue

            # Фильтр по минимальному рейтингу из настроек
            if product.rating and product.rating < min_rating:
                reject_rating += 1
                continue

            # Фильтр по максимальной цене из настроек
            effective_price = product.sale_price or product.price or 0
            if effective_price > max_price:
                reject_price += 1
                continue

            if db.is_published(product.article):
                reject_published += 1
                continue

            if is_checked(product.article):
                reject_checked += 1
                continue

            valid_products.append(product)

        logger.info(
            "Select stats: valid=%s, rejected: no_article=%s no_name=%s no_price=%s "
            "rating<%.1f=%s price>%d=%s published=%s checked=%s (total=%s)",
            len(valid_products),
            reject_no_article, reject_no_name, reject_no_price,
            min_rating, reject_rating,
            max_price, reject_price,
            reject_published, reject_checked,
            len(products),
        )

        if not valid_products:
            return []

        # Группируем по категориям
        by_category = defaultdict(list)
        for product in valid_products:
            cat = product.category or "Другое"
            by_category[cat].append(product)

        # Из каждой категории берём топ-per_category по score
        result = []
        category_counts = []

        for cat_name, cat_products in by_category.items():
            cat_products.sort(
                key=lambda p: self.score(p, mode=mode),
                reverse=True,
            )
            taken = cat_products[:per_category]
            result.extend(taken)
            category_counts.append((cat_name, len(taken)))

        # Глобальный лимит (если задан)
        if limit is not None:
            result = result[:limit]

        logger.info(
            "Selected %s products from %s categories (per_category=%s, mode=%s, "
            "min_rating=%.1f, max_price=%d): %s",
            len(result),
            len(by_category),
            per_category,
            mode,
            min_rating,
            max_price,
            ", ".join(f"{cat}={count}" for cat, count in category_counts),
        )

        return result