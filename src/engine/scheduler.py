"""
Планировщик автоматической проверки новых товаров.

Запускает Engine с заданным интервалом и отправляет
результат (предпросмотр) указанному chat_id.
"""

from __future__ import annotations
import threading
import time

from src.engine.engine import Engine
from src.database import db
from src.utils.logger import get_logger

logger = get_logger("scheduler")


class Scheduler:
    """Планировщик периодической проверки товаров."""

    def __init__(self, notify_chat_id: int | None = None, engine=None):
        """
        Args:
            notify_chat_id: ID чата для уведомлений о результатах проверки.
            engine: Экземпляр Engine для переиспользования (постоянная WBSession).
        """
        self._timer: threading.Timer | None = None
        self._running = False
        self._notify_chat_id = notify_chat_id
        self._lock = threading.Lock()
        self._engine = engine

    # ---------------------------------
    # Свойства
    # ---------------------------------

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def interval_minutes(self) -> int:
        """Интервал проверки из настроек БД (в минутах)."""
        try:
            return int(db.get_setting("check_interval_minutes", "60"))
        except (ValueError, TypeError):
            return 60

    @property
    def interval_seconds(self) -> int:
        return max(self.interval_minutes * 60, 60)  # минимум 1 минута

    # ---------------------------------
    # Управление
    # ---------------------------------

    def start(self):
        """Запускает планировщик."""
        with self._lock:
            if self._running:
                logger.warning("Scheduler already running")
                return False

            self._running = True
            logger.info(
                "Scheduler started (interval=%smin)",
                self.interval_minutes,
            )

            # Запускаем первый цикл
            self._schedule_next()
            return True

    def stop(self):
        """Останавливает планировщик."""
        with self._lock:
            if not self._running:
                return False

            self._running = False

            if self._timer:
                self._timer.cancel()
                self._timer = None

            logger.info("Scheduler stopped")
            return True

    # ---------------------------------
    # Внутренняя логика
    # ---------------------------------

    def _schedule_next(self):
        """Планирует следующий запуск."""
        if not self._running:
            return

        self._timer = threading.Timer(
            self.interval_seconds,
            self._tick,
        )
        self._timer.daemon = True
        self._timer.start()

        next_time = time.strftime(
            "%H:%M:%S",
            time.localtime(time.time() + self.interval_seconds),
        )
        logger.debug("Next check scheduled at %s", next_time)

    def _tick(self):
        """Выполняет проверку товаров."""
        if not self._running:
            return

        logger.info("Scheduler tick: checking products...")

        try:

            engine = self._engine if self._engine else Engine()

            try:

                engine.run()

                # Если есть результат — отправляем уведомление
                if engine.last_preview_text and self._notify_chat_id:
                    self._notify(engine)

            finally:

                if not self._engine:
                    engine.close()

        except Exception as e:

            logger.error("Scheduler tick error: %s", e)

        finally:

            # Планируем следующий tick
            self._schedule_next()

    def _notify(self, engine: Engine):
        """Отправляет уведомление о результатах проверки."""
        try:

            from src.telegram.bot import TelegramBot

            if not engine.last_preview_text:
                text = "Новых товаров не найдено."
            else:
                text = (
                    "<b>Автоматическая проверка</b>\n\n"
                    f"{engine.last_preview_text}\n\n"
                    "---\n"
                    "Нажмите «Опубликовать», чтобы отправить в канал."
                )

            bot = TelegramBot()
            photo_paths = engine.last_preview_photos or []

            if photo_paths:
                try:
                    # Отправляем медиа-группу
                    bot.send_media_group(
                        photo_paths=photo_paths,
                        caption=text,
                        chat_id=str(self._notify_chat_id),
                    )
                    logger.info(
                        "Notification with media group sent to chat %s (%s photos)",
                        self._notify_chat_id, len(photo_paths),
                    )
                    return
                except Exception as e:
                    logger.warning("Failed to send notification media group: %s", e)
                    # Fallback: пробуем одно фото
                    try:
                        bot.send_photo(
                            photo_path=photo_paths[0],
                            text=text,
                            chat_id=str(self._notify_chat_id),
                        )
                        logger.info("Notification with single photo sent to chat %s", self._notify_chat_id)
                        return
                    except Exception as e2:
                        logger.warning("Failed to send notification single photo: %s", e2)

            # Fallback — текстом
            bot.send_message(
                text=text,
                chat_id=str(self._notify_chat_id),
            )

            logger.info("Notification sent to chat %s", self._notify_chat_id)

        except Exception as e:

            logger.error("Notification error: %s", e)