"""
Настройка логирования для проекта.

Логи пишутся в файл data/logs/bot.log с ротацией по дням
и дублируются в консоль (stdout).
"""

import logging
import sys
from pathlib import Path

# Директория для логов
LOG_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOG_FILE = LOG_DIR / "bot.log"

# Формат лога
_FORMAT = (
    "[%(asctime)s] %(levelname)-8s %(name)s | %(message)s"
)
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Настройка корневого логгера
_logger = logging.getLogger("wb")
_logger.setLevel(logging.DEBUG)
_logger.handlers.clear()

# File handler (ротация по дням)
try:
    from logging.handlers import TimedRotatingFileHandler

    file_handler = TimedRotatingFileHandler(
        LOG_FILE,
        when="midnight",
        interval=1,
        backupCount=14,  # хранить 14 дней
        encoding="utf-8",
    )
except Exception:
    # Fallback на простой FileHandler если TimedRotating недоступен
    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")

file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter(_FORMAT, _DATE_FORMAT))
_logger.addHandler(file_handler)

# Console handler (stdout)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(logging.Formatter(_FORMAT, _DATE_FORMAT))
_logger.addHandler(console_handler)


def get_logger(name: str = "wb") -> logging.Logger:
    """Возвращает логгер с указанным именем (дочерний от wb)."""
    return _logger.getChild(name)


# Для обратной совместимости — можно импортировать напрямую
debug = _logger.debug
info = _logger.info
warning = _logger.warning
error = _logger.error
critical = _logger.critical