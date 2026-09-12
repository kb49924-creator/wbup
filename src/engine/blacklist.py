"""
Blacklist товаров без фото.

Хранит артикулы товаров, у которых нет реальных фото (заглушки).
Такие товары автоматически исключаются при проверке новинок.
"""

from __future__ import annotations
import json
from pathlib import Path

from src.utils.logger import get_logger

logger = get_logger("blacklist")

BLACKLIST_FILE = Path("data/blacklist.json")

# Множество артикулов в blacklist (кэш)
_blacklist: set[int] = set()


def _load():
    """Загружает blacklist из файла."""
    global _blacklist
    try:
        if not BLACKLIST_FILE.exists():
            _blacklist = set()
            return
        with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        _blacklist = set(data) if isinstance(data, list) else set()
        logger.debug("Loaded %s articles in blacklist", len(_blacklist))
    except Exception as e:
        logger.warning("Failed to load blacklist: %s", e)
        _blacklist = set()


def _save():
    """Сохраняет blacklist в файл."""
    try:
        BLACKLIST_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(BLACKLIST_FILE, "w", encoding="utf-8") as f:
            json.dump(sorted(_blacklist), f, ensure_ascii=False, indent=2)
        logger.debug("Saved %s articles to blacklist", len(_blacklist))
    except Exception as e:
        logger.warning("Failed to save blacklist: %s", e)


def is_blacklisted(article: int) -> bool:
    """Проверяет, есть ли артикул в blacklist."""
    if not _blacklist:
        _load()
    return article in _blacklist


def add_to_blacklist(article: int):
    """Добавляет артикул в blacklist."""
    if not _blacklist:
        _load()
    _blacklist.add(article)
    _save()
    logger.info("Added article=%s to blacklist", article)


def add_batch(articles: list[int]):
    """Добавляет несколько артикулов в blacklist."""
    if not _blacklist:
        _load()
    added = 0
    for a in articles:
        if a not in _blacklist:
            _blacklist.add(a)
            added += 1
    if added:
        _save()
        logger.info("Added %s articles to blacklist", added)


def remove_from_blacklist(article: int):
    """Удаляет артикул из blacklist."""
    if not _blacklist:
        _load()
    _blacklist.discard(article)
    _save()
    logger.info("Removed article=%s from blacklist", article)


def get_all() -> list[int]:
    """Возвращает список всех артикулов в blacklist."""
    if not _blacklist:
        _load()
    return sorted(_blacklist)


def get_total() -> int:
    """Возвращает количество артикулов в blacklist."""
    if not _blacklist:
        _load()
    return len(_blacklist)


def clear_all():
    """Очищает весь blacklist (удаляет все артикулы)."""
    global _blacklist
    _blacklist = set()
    _save()
    logger.info("Blacklist cleared")


# Загружаем blacklist при импорте
_load()