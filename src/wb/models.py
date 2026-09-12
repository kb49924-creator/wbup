from __future__ import annotations
from dataclasses import dataclass, field, asdict


@dataclass
class Product:

    # Основное
    article: int
    imt_id: int | None = None

    # Название
    name: str | None = None
    brand: str | None = None

    # Продавец
    supplier_id: int | None = None
    supplier_name: str | None = None

    # Категория
    category: str | None = None
    root_category: str | None = None
    gender: str | None = None  # "male", "female", "unisex"

    # WB
    vendor_code: str | None = None
    slug: str | None = None

    # Описание
    description: str | None = None

    # Рейтинг
    rating: float | None = None
    feedbacks: int | None = None

    # Фото
    photos: int = 0
    photo_urls: list[str] = field(default_factory=list)
    photo_fallbacks: dict[int, list[str]] = field(default_factory=dict)

    # Цены
    price: int | None = None
    sale_price: int | None = None
    discount: int | None = None

    # Размеры
    sizes: list[dict] = field(default_factory=list)

    # Цвета
    colors: list[str] = field(default_factory=list)

    # Характеристики
    options: list[dict] = field(default_factory=list)

    # Ссылка на товар
    url: str | None = None

    def to_dict(self) -> dict:
        """Сериализует Product в dict для JSON."""
        return asdict(self)

    @staticmethod
    def from_dict(data: dict) -> "Product":
        """Восстанавливает Product из dict (из JSON)."""
        return Product(**data)