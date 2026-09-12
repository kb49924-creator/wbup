#!/usr/bin/env python3
"""
Запуск Telegram-бота с меню управления.

Использование:
    python scripts/run_bot.py

Для работы требуется переменная окружения BOT_TOKEN
или значение по умолчанию в src/config/__init__.py.
"""

import sys
import pathlib
import time

# Добавляем корень проекта в путь поиска модулей
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from src.utils.logger import get_logger
from src.telegram.handlers import BotHandlers
from src.config import CLEAR_IMAGE_CACHE_ON_START, IMAGES_DIR

logger = get_logger("run_bot")


def clear_image_cache():
    """Очищает кэш изображений (original/ и no_bg/)."""
    import shutil
    deleted = 0
    for subdir in ["original", "no_bg"]:
        d = IMAGES_DIR / subdir
        if d.exists():
            # Сохраняем папку logo/ внутри original/
            logo_dir = d / "logo"
            for f in d.iterdir():
                if f.is_file():
                    f.unlink()
                    deleted += 1
            # Восстанавливаем logo/ если удалили
            if not logo_dir.exists():
                logo_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Cleared %d cached images on startup", deleted)


def main():
    """Запускает бота с автоматическим восстановлением при ошибках."""

    logger.info("=== Telegram Bot - Wildberries Channel Manager ===")

    # Очистка кэша изображений при старте (если включено в настройках)
    if CLEAR_IMAGE_CACHE_ON_START:
        logger.info("CLEAR_IMAGE_CACHE_ON_START=True, clearing image cache...")
        clear_image_cache()
    else:
        logger.info("CLEAR_IMAGE_CACHE_ON_START=False, keeping image cache")

    while True:

        try:

            handlers = BotHandlers()
            handlers.start_polling()

        except KeyboardInterrupt:

            logger.info("Bot stopped by user.")
            break

        except Exception as e:

            logger.error("Bot crashed: %s. Restarting in 5s...", e)
            time.sleep(5)


if __name__ == "__main__":
    main()