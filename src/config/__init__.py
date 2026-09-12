"""
Конфигурация проекта.

Настройки загружаются из переменных окружения (.env файла).
"""

import os
from pathlib import Path

# Корень проекта
ROOT_DIR = Path(__file__).resolve().parent.parent.parent

# ---------------------------
# Telegram
# ---------------------------

BOT_TOKEN = os.getenv(
    "BOT_TOKEN",
    "8734971912:AAGmygfEBD69qibXSiH1q_lM3JUmCPTXy4c",
)

CHANNEL_USERNAME = os.getenv(
    "CHANNEL_USERNAME",
    "@wbuppp",
)

# ---------------------------
# Proxy для Telegram API
# ---------------------------
# Пример: socks5://user:pass@127.0.0.1:1080
#         http://proxy.example.com:8080

TELEGRAM_PROXY = os.getenv("TELEGRAM_PROXY", "")

# ---------------------------
# Режим отбора товаров
# ---------------------------
#   "popular" — популярные (много отзывов)
#   "new"     — новые (20-300 отзывов)
#   "mixed"   — смешанный

MODE = os.getenv("MODE", "mixed")

# ---------------------------
# Пути к данным
# ---------------------------

DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "database.db"
CACHE_DIR = DATA_DIR / "cache"
IMAGES_DIR = DATA_DIR / "images"

# ---------------------------
# Пути для изображений (ImageRenderer)
# ---------------------------

LOGO_DIR = IMAGES_DIR / "original" / "logo"   # папка с фоновым файлом
CARDS_DIR = IMAGES_DIR / "cards"               # готовые карточки-коллажи
NO_BG_DIR = IMAGES_DIR / "no_bg"               # фото без фона (кэш rembg)
CARD_SIZE = 1080                               # размер квадратной карточки (1:1)

# ---------------------------
# Параметры отбора
# ---------------------------

MIN_RATING = 4.7
MAX_PRICE = 3500
PRODUCTS_PER_SELLER = 2

# ---------------------------
# Кэш изображений
# ---------------------------
# Если True — при запуске бота удаляются все ранее скачанные фото
# и фото без фона. Это полезно после обновления алгоритмов
# выбора фото или удаления фона, чтобы применить новые версии.
# Если False — фото переиспользуются (экономит трафик и время).
CLEAR_IMAGE_CACHE_ON_START = os.getenv("CLEAR_IMAGE_CACHE_ON_START", "false").lower() == "true"
