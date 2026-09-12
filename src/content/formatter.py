import random

HEADERS = [
    "✨ Сегодня нашли",
    "💎 Новая подборка",
    "🔥 Свежие находки",
    "⚡ Новинки дня",
    "🤍 Ловите подборку",
    "🌟 Сегодня рекомендуем",
    "🛍 Новое поступление",
]


class PostFormatter:
    """
    Формирует красивый текст поста.
    Каждый товар — гиперссылка с кратким названием категории.
    """

    def _product_url(self, article: int) -> str:
        return f"https://www.wildberries.ru/catalog/{article}/detail.aspx"

    def _format_price(self, product) -> str:
        """Форматирует цену товара с расчетом скидки."""
        sale_price = getattr(product, "sale_price", None)
        base_price = getattr(product, "price", None)
        discount = getattr(product, "discount", None)

        if sale_price is not None and sale_price > 0:
            price = sale_price
            # Вычисляем скидку, если она не задана явно
            if discount is None and base_price and base_price > sale_price:
                discount = int(round((1.0 - sale_price / base_price) * 100))
        elif base_price is not None and base_price > 0:
            price = base_price
        else:
            return "Цена уточняется"

        price_str = f"{int(price):,}".replace(",", " ")
        if discount and discount > 5:
            return f"{price_str}₽ <i>(-{discount}%)</i>"
        return f"{price_str}₽"

    def _short_name(self, product, category: str) -> str:
        """Возвращает краткое название товара для ссылки."""
        if getattr(product, "category", None):
            return product.category
        if category:
            return category
        if getattr(product, "name", None):
            words = product.name.split()
            return words[0].capitalize() if words else "Товар"
        return "Товар"

    def _generate_hashtags(self, category: str, products: list) -> str:
        """Генерирует релевантные хэштеги для поста."""
        tags = set(["#wildberries", "#wb", "#находки"])
        
        # Хэштег категории
        cat_clean = "".join(c for c in category.lower() if c.isalnum() or c == "_").strip()
        if cat_clean and len(cat_clean) > 2:
            tags.add(f"#{cat_clean}")

        # Хэштеги брендов
        for p in products[:3]:
            brand = getattr(p, "brand", None)
            if brand:
                b_clean = "".join(c for c in brand.lower() if c.isalnum() or c == "_").strip()
                if b_clean and len(b_clean) > 2:
                    tags.add(f"#{b_clean}")

        return " ".join(list(tags)[:6])

    def format(
        self,
        category: str,
        products: list,
        max_length: int = 1024,
        include_hashtags: bool = True,
    ):

        if not products:
            return ""

        header = random.choice(HEADERS)

        # Берём категорию из первого товара
        cat_name = getattr(products[0], "category", None) or category or "Одежда"

        lines = [
            header,
            "",
            f"🏷 <b>{cat_name}</b>",
            "",
        ]

        for index, product in enumerate(products, start=1):
            price_line = self._format_price(product)
            url = getattr(product, "url", None) or self._product_url(product.article)

            # Краткое название — категория товара (или первое слова из названия)
            short_name = self._short_name(product, category)

            # Гиперссылка
            lines.append(f'<a href="{url}">{index}️⃣ {short_name}</a> — {price_line}')

        if include_hashtags:
            hashtags = self._generate_hashtags(cat_name, products)
            if hashtags:
                lines.append("")
                lines.append(hashtags)

        full_text = "\n".join(lines)

        # Если текст превышает лимит — убираем заголовок
        if len(full_text) > max_length:
            lines = [
                f"🏷 <b>{cat_name}</b>",
                "",
            ]
            for index, product in enumerate(products, start=1):
                price_line = self._format_price(product)
                url = getattr(product, "url", None) or self._product_url(product.article)
                short_name = self._short_name(product, category)
                lines.append(f'<a href="{url}">{index}️⃣ {short_name}</a> — {price_line}')
            if include_hashtags:
                hashtags = self._generate_hashtags(cat_name, products)
                if hashtags:
                    lines.append("")
                    lines.append(hashtags)
            full_text = "\n".join(lines)

        # Если всё ещё длиннее — обрезаем принудительно
        if len(full_text) > max_length:
            full_text = full_text[: max_length - 3] + "..."

        return full_text