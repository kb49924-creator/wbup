"""
Модуль для отслеживания уже проверенных товаров.
Хранит {артикул: timestamp} в data/checked_articles.json.
При повторной проверке эти товары пропускаются.
Записи старше 7 дней автоматически удаляются.
"""

from __future__ import annotations
import json
import time
from pathlib import Path

from src.utils.logger import get_logger

logger = get_logger("checked")

CHECKED_FILE = Path("data/checked_articles.json")

# TTL: 7 дней (в секундах)
CHECKED_TTL = 7 * 24 * 3600

# Словарь {article: timestamp}
_checked: dict[int, float] = {}
_loaded = False


def _load():
    """Загружает проверенные артикулы из файла, удаляя устаревшие."""
    global _checked, _loaded
    if _loaded:
        return
    _loaded = True
    try:
        if CHECKED_FILE.exists():
            with open(CHECKED_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            now = time.time()
            # Фильтруем: удаляем записи старше TTL
            before = len(data)
            _checked = {
                int(k): v
                for k, v in data.items()
                if now - v < CHECKED_TTL
            }
            expired = before - len(_checked)
            if expired:
                logger.info("Cleaned %s expired checked articles", expired)
                _save()  # сразу сохраняем очищенный список
            logger.info("Loaded %s checked articles", len(_checked))
        else:
            _checked = {}
            logger.info("No checked articles file yet")
    except Exception as e:
        logger.warning("Failed to load checked articles: %s", e)
        _checked = {}


def _save():
    """Сохраняет проверенные артикулы в файл."""
    try:
        CHECKED_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CHECKED_FILE, "w", encoding="utf-8") as f:
            json.dump(_checked, f, ensure_ascii=False, indent=2)
        logger.debug("Saved %s checked articles", len(_checked))
    except Exception as e:
        logger.warning("Failed to save checked articles: %s", e)


def is_checked(article: int) -> bool:
    """Проверяет, был ли артикул уже проверен."""
    _load()
    return article in _checked


def mark_checked(article: int):
    """Отмечает артикул как проверенный."""
    _load()
    _checked[article] = time.time()


def get_total() -> int:
    """Возвращает количество проверенных артикулов."""
    _load()
    return len(_checked)


def clear_all():
    """Очищает весь список проверенных артикулов."""
    global _checked
    _checked = {}
    _save()
    logger.info("Checked articles cleared")