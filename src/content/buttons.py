"""
Модуль создания inline-кнопок для Telegram-постов.
Обеспечивает быстрый переход в карточку товара на Wildberries (с поддержкой Universal Links для мобильного приложения WB).
"""
from typing import Optional, List, Dict, Any


class PostButtons:
    """
    Создает интерактивные inline-кнопки для Telegram-постов.
    """

    def create(
        self,
        category: str,
        products: list,
    ) -> List[Dict[str, str]]:
        """
        Формирует список кнопок для перехода на Wildberries.
        Каждая кнопка ведет на https://www.wildberries.ru/catalog/{article}/detail.aspx,
        что открывает карточку товара прямо в приложении Wildberries на iOS и Android.
        """
        if not products:
            return []

        buttons = []
        is_single = len(products) == 1

        for i, p in enumerate(products[:4], 1):
            name = getattr(p, 'name', None) or (p.get('name') if isinstance(p, dict) else '') or 'Товар'
            short_name = name[:20].strip() + ("…" if len(name) > 20 else "")
            article = getattr(p, 'article', None) or (p.get('article') if isinstance(p, dict) else '')
            price = getattr(p, 'sale_price', None) or getattr(p, 'price', None)
            if price is None and isinstance(p, dict):
                price = p.get('sale_price') or p.get('price')

            price_str = f" • {int(price)} ₽" if price else ""

            if is_single:
                label = f"🛍 Купить на Wildberries{price_str}"
            else:
                label = f"🛍 #{i} {short_name}{price_str}"

            url = f"https://www.wildberries.ru/catalog/{article}/detail.aspx"
            buttons.append({"text": label, "url": url})

        return buttons