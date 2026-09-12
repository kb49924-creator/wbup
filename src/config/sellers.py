"""
Список продавцов для отслеживания.

Продавцы хранятся в SQLite (data/database.db).
Изменения сохраняются мгновенно через БД.
"""

from src.database import db

# Загружаем при импорте
SELLERS = db.get_all_sellers()


def save():
    """Совместимость со старым кодом — данные уже сохранены в БД."""
    # Перезагружаем список из БД (на случай изменений из другого потока)
    global SELLERS
    SELLERS = db.get_all_sellers()


def get_enabled_sellers():
    """Возвращает список активных продавцов."""
    return db.get_enabled_sellers()


def get_seller_ids():
    """Возвращает список ID активных продавцов."""
    return [
        seller["supplier_id"]
        for seller in get_enabled_sellers()
    ]