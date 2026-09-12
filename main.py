#!/usr/bin/env python3
"""
Wildberries Channel Manager — Web GUI First
============================================

Главная точка входа в программу.
Управление системой ТОЛЬКО через Web GUI: http://localhost:8501

Web GUI предоставляет полный интерфейс для:
    - Мониторинга каталогов продавцов Wildberries
    - Умного отбора товаров по рейтингу, отзывам, цене
    - Автоматической публикации в Telegram-канал
    - Создания красивых карточек-коллажей с фото товаров
    - Планировщика автоматической проверки
    - Полного управления продавцами через браузер

Telegram-бот (handlers.py) удалён как устаревший.
Publisher остаётся для отправки постов из Web GUI.

Использование:
    python main.py                        # Показать инструкции
    python main.py --check                # Разовая проверка всех продавцов
    python main.py --stats                # Статистика базы данных
    python main.py --clear-cache          # Очистка кэша изображений
    
    # Запуск Web GUI (рекомендуемый способ):
    cd web_gui && python server.py
    # или: start_web_gui.sh / start_web_gui.bat
"""

import argparse
import sys
import pathlib

if sys.platform != 'win32':
    try:
        import uvloop
        uvloop.install()
    except ImportError:
        pass

# Добавляем корень проекта в путь поиска модулей
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from src.utils.logger import get_logger
from src.config import CLEAR_IMAGE_CACHE_ON_START, IMAGES_DIR

logger = get_logger("main")


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


def show_instructions():
    """Показывает инструкции по запуску Web GUI."""
    print("""
+----------------------------------------------------------+
|          Wildberries Channel Manager                     |
|          Управление через Web GUI                        |
+----------------------------------------------------------+

1️⃣ Запустите Web GUI сервер:

   Windows:
     web_gui\start_web_gui.bat
   
   Linux/Mac:
     ./web_gui/start_web_gui.sh
   
   Или вручную:
     python web_gui/server.py

2️⃣ Откройте браузер:
   http://localhost:8501

3️⃣ Возможности Web GUI:
   * Dashboard — статистика и быстрые действия
   * Sellers — управление продавцами
   * Catalog — навигация по товарам и выбор
   * Preview — просмотр и публикация поста
   * Scheduler — автоматическая проверка
   * Settings — настройки фильтрации
   * Photo AI — разметка и обучение модели ИИ

4️⃣ Telegram-бот удалён как устаревший.
   Публикация в Telegram работает через Web GUI.

""")


def check_sellers():
    """Разовая проверка всех продавцов без запуска Web GUI."""
    from src.engine.engine import Engine
    from src.config.sellers import get_enabled_sellers

    logger.info("=== One-time seller check ===")

    engine = Engine()
    sellers = get_enabled_sellers()

    if not sellers:
        logger.warning("No enabled sellers found. Add sellers first via Web GUI.")
        return

    for seller in sellers:
        logger.info("Checking seller: %s (ID: %s)", seller.get("brand", "?"), seller["supplier_id"])
        engine.process_seller(seller)

    # Генерируем пост из всех накопленных товаров
    if engine._all_selected_products:
        from src.telegram.publisher import TelegramPublisher
        publisher = TelegramPublisher()
        category = engine._all_selected_products[0].category or "Одежда"
        
        # Публикуем напрямую (без текста генерации)
        publisher.publish(category, engine._all_selected_products)
        logger.info("Published post with %d products", len(engine._all_selected_products))
    else:
        logger.info("No new products found")


def show_stats():
    """Показывает статистику базы данных."""
    from src.database import db

    db.init()
    sellers = db.get_all_sellers()
    publications_count = db.get_publications_count()

    print("\n" + "=" * 50)
    print("СТАТИСТИКА")
    print("=" * 50)
    print(f"Продавцов:          {len(sellers)}")
    print(f"  Активных:         {len([s for s in sellers if s.get('enabled')])}")
    print(f"Публикаций:         {publications_count}")
    print("=" * 50 + "\n")


def main():
    """Главная функция с парсингом аргументов командной строки."""
    parser = argparse.ArgumentParser(
        description="Wildberries Channel Manager - Web GUI First",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Recommended launch method:
  web_gui\\start_web_gui.bat      (Windows)
  ./web_gui/start_web_gui.sh     (Linux/Mac)
  python web_gui/server.py       (manual launch)

Examples:
  python main.py                Show instructions
  python main.py --check        One-time seller check
  python main.py --stats        Database statistics
  python main.py --clear-cache  Clear image cache
        """,
    )

    parser.add_argument(
        "--check",
        action="store_true",
        help="One-time check all sellers",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show database statistics",
    )
    parser.add_argument(
        "--clear-cache",
        action="store_true",
        help="Clear image cache",
    )

    args = parser.parse_args()

    if args.check:
        check_sellers()
    elif args.stats:
        show_stats()
    elif args.clear_cache:
        clear_image_cache()
        logger.info("Image cache cleared manually")
    else:
        show_instructions()


if __name__ == "__main__":
    main()