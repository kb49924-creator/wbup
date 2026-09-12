"""Кэширование результатов проверки товаров.

Сохраняет хеш от списка артикулов каталога продавца.
Если хеш не изменился — товары, уже прошедшие фото-проверку,
не проверяются заново.

Файл кэша: data/check_cache.json
Структура:
{
    "seller_<id>": {
        "catalog_hash": "sha256",
        "valid_articles": [123, 456],
        "blacklisted_articles": [789]
    }
}
"""

from __future__ import annotations
import json
import hashlib
from pathlib import Path

CACHE_FILE = Path("data/check_cache.json")

logger = __import__("logging").getLogger("cache_check")


def _load() -> dict:
    """Загружает кэш из файла."""
    if not CACHE_FILE.exists():
        return {}
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning("Failed to load check cache: %s", e)
        return {}


def _save(cache: dict):
    """Сохраняет кэш в файл."""
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning("Failed to save check cache: %s", e)


def _catalog_hash(articles: list[int]) -> str:
    """Вычисляет SHA256-хеш от отсортированного списка артикулов."""
    sorted_arts = sorted(articles)
    raw = ",".join(str(a) for a in sorted_arts)
    return hashlib.sha256(raw.encode()).hexdigest()


def get_cached_result(supplier_id: int, catalog_articles: list[int]) -> dict | None:
    """Возвращает кэшированный результат, если хеш каталога совпадает.

    Args:
        supplier_id: ID продавца.
        catalog_articles: список артикулов из каталога.

    Returns:
        dict с ключами 'valid_articles' и 'blacklisted_articles',
        или None если кэш устарел.
    """
    cache = _load()
    key = f"seller_{supplier_id}"
    cached = cache.get(key)
    if not cached:
        return None

    current_hash = _catalog_hash(catalog_articles)
    if cached.get("catalog_hash") != current_hash:
        logger.info(
            "Catalog hash changed for seller %s, cache invalid",
            supplier_id,
        )
        return None

    valid = cached.get("valid_articles", [])
    blacklisted = cached.get("blacklisted_articles", [])

    # Защита от битого кэша: если valid пустой, а blacklisted > 50% от каталога —
    # это почти наверняка ошибка (например, ThreadPoolExecutor сломал Playwright).
    # В таком случае игнорируем кэш и проверяем заново.
    total_cached = len(valid) + len(blacklisted)
    if not valid and blacklisted and total_cached > 0:
        ratio = len(blacklisted) / total_cached
        if ratio > 0.5 and total_cached >= 5:
            logger.warning(
                "Cache looks corrupted for seller %s: %s valid, %s blacklisted "
                "(ratio=%.0f%%). Ignoring cache.",
                supplier_id, len(valid), len(blacklisted), ratio * 100,
            )
            # Удаляем битый кэш
            del cache[key]
            _save(cache)
            return None

    logger.info(
        "Cache hit for seller %s: %s valid, %s blacklisted",
        supplier_id,
        len(valid),
        len(blacklisted),
    )
    return cached


def save_cached_result(
    supplier_id: int,
    catalog_articles: list[int],
    valid_articles: list[int],
    blacklisted_articles: list[int],
):
    """Сохраняет результат проверки в кэш.

    Args:
        supplier_id: ID продавца.
        catalog_articles: полный список артикулов из каталога (для хеша).
        valid_articles: артикулы, прошедшие фото-проверку.
        blacklisted_articles: артикулы без фото.
    """
    cache = _load()
    key = f"seller_{supplier_id}"
    cache[key] = {
        "catalog_hash": _catalog_hash(catalog_articles),
        "valid_articles": valid_articles,
        "blacklisted_articles": blacklisted_articles,
    }
    _save(cache)
    logger.info(
        "Saved cache for seller %s: %s valid, %s blacklisted",
        supplier_id,
        len(valid_articles),
        len(blacklisted_articles),
    )


def clear_all():
    """Очищает весь кэш проверок."""
    if CACHE_FILE.exists():
        try:
            CACHE_FILE.unlink()
            logger.info("Cleared check cache")
        except Exception as e:
            logger.warning("Failed to clear check cache: %s", e)