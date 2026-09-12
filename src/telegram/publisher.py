"""
Telegram Publisher v2 — надёжная публикация постов в Telegram канал.

Улучшения v2:
- Retry с экспоненциальной паузой при ошибках сети
- Автоматическая обработка FloodWait (429) от Telegram API
- Потокобезопасная очередь отправки (threading.Lock)
- sendPhoto вместо sendDocument — красивое превью в Telegram
- Правильное закрытие файлов (with open) — нет утечек
- Подробное логирование ответов API
- Метод send_with_buttons — inline кнопки к посту
"""

from __future__ import annotations
import time
import threading
import json
from pathlib import Path
from typing import Optional

import requests

from src.config import BOT_TOKEN, CHANNEL_USERNAME
from src.utils.logger import get_logger

logger = get_logger("publisher")

# ============================================================
# Настройки
# ============================================================
MAX_RETRIES = 4          # Максимум попыток при ошибке
RETRY_DELAY_BASE = 2     # Базовая задержка (секунды), множится на номер попытки
FLOOD_WAIT_CAP = 60      # Максимальная пауза при FloodWait (секунды)
REQUEST_TIMEOUT = 45     # Таймаут HTTP запроса


class TelegramPublisher:
    """Отправляет посты с фото в Telegram канал.

    Потокобезопасен: использует Lock для предотвращения спама при
    параллельных вызовах из нескольких потоков движка.
    """

    def __init__(self):
        self.base_url = f"https://api.telegram.org/bot{BOT_TOKEN}"
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "WBUp-Publisher/2.0"})
        self._lock = threading.Lock()  # Защита от одновременных публикаций

    # ============================================================
    # Публичный API
    # ============================================================

    def publish(
        self,
        category: str,
        products: list,
        existing_photos: list[str] = None,
        text: str = None,
    ) -> bool:
        """Публикует пост в Telegram канал.

        Args:
            category: Категория товара.
            products: Список объектов Product.
            existing_photos: Пути к готовым фото (карточка).
            text: Текст поста (если не указан — генерируется автоматически).

        Returns:
            True если успешно опубликовано.
        """
        if not BOT_TOKEN or BOT_TOKEN == "YOUR_BOT_TOKEN":
            logger.warning("BOT_TOKEN не настроен — публикация в Telegram пропущена")
            return False

        if text is None:
            text = self._format_text(category, products)

        photos = existing_photos or []

        # Потокобезопасная публикация
        with self._lock:
            if photos:
                return self._send_photo(photos[0], text)
            else:
                return self._send_text_only(text)

    def send_with_buttons(
        self,
        text: str,
        photo_path: Optional[str] = None,
        buttons: list[dict] = None,
    ) -> bool:
        """Публикует пост с inline-кнопками.

        Args:
            text: HTML-текст поста.
            photo_path: Путь к фото (необязательно).
            buttons: Список кнопок, каждая — dict с ключами 'text' и 'url'.
                     Пример: [{"text": "Смотреть на WB", "url": "https://..."}]

        Returns:
            True если успешно.
        """
        keyboard = None
        if buttons:
            keyboard = {
                "inline_keyboard": [
                    [{"text": b["text"], "url": b["url"]}]
                    for b in buttons
                ]
            }

        with self._lock:
            if photo_path and Path(photo_path).exists():
                return self._send_photo(photo_path, text, reply_markup=keyboard)
            else:
                return self._send_text_only(text, reply_markup=keyboard)

    # ============================================================
    # Форматирование текста
    # ============================================================

    def _format_text(self, category: str, products: list) -> str:
        """Форматирует текст поста в HTML."""
        cat_name = category or "Одежда"
        lines = [f"<b>{cat_name}</b>\n"]

        for p in products[:20]:
            name = getattr(p, 'name', None) or p.get('name', '?') if hasattr(p, 'get') else '?'
            article = getattr(p, 'article', '') or ''
            sale_price = getattr(p, 'sale_price', None) or (p.get('sale_price') if hasattr(p, 'get') else None)
            price = sale_price or getattr(p, 'price', 0) or 0
            brand = getattr(p, 'brand', '') or ''

            # Форматируем цену с пробелами
            price_str = f"{int(price):,}".replace(",", " ") + "₽" if price else "Цена уточняется"
            url = f"https://www.wildberries.ru/catalog/{article}/detail.aspx"

            lines.append(f'• <a href="{url}"><b>{brand}</b> — {name}</a>')
            lines.append(f'  💰 {price_str}')
            lines.append("")

        lines.append("<i>Wildberries Up — лучшие товары</i>")
        return "\n".join(lines)

    # ============================================================
    # Отправка фото
    # ============================================================

    def _send_photo(
        self,
        photo_path: str,
        caption: str,
        reply_markup: Optional[dict] = None,
    ) -> bool:
        """Отправляет фото с подписью через sendPhoto (красивое превью)."""
        p = Path(photo_path)
        if not p.exists():
            logger.error("Photo not found: %s", photo_path)
            return self._send_text_only(caption, reply_markup)

        def do_request():
            data = {
                "chat_id": CHANNEL_USERNAME,
                "caption": caption,
                "parse_mode": "HTML",
            }
            if reply_markup:
                data["reply_markup"] = json.dumps(reply_markup)

            with open(p, "rb") as f:
                ext = p.suffix.lower()
                mime = "image/webp" if ext == ".webp" else "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"
                files = {"photo": (p.name, f, mime)}
                return self.session.post(
                    f"{self.base_url}/sendPhoto",
                    data=data,
                    files=files,
                    timeout=REQUEST_TIMEOUT,
                )

        resp = self._request_with_retry(do_request, label="sendPhoto")
        if resp is None:
            # Все попытки исчерпаны — отправляем без фото
            logger.warning("sendPhoto failed after retries — falling back to text only")
            return self._send_text_only(caption, reply_markup)

        if resp.status_code == 200:
            logger.info("✅ Published photo post to %s", CHANNEL_USERNAME)
            return True

        logger.error("sendPhoto API error %d: %s", resp.status_code, resp.text[:300])
        return False

    # ============================================================
    # Отправка текста
    # ============================================================

    def _send_text_only(
        self,
        text: str,
        reply_markup: Optional[dict] = None,
    ) -> bool:
        """Отправляет текстовое сообщение."""

        def do_request():
            payload = {
                "chat_id": CHANNEL_USERNAME,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": False,
            }
            if reply_markup:
                payload["reply_markup"] = json.dumps(reply_markup)
            return self.session.post(
                f"{self.base_url}/sendMessage",
                json=payload,
                timeout=REQUEST_TIMEOUT,
            )

        resp = self._request_with_retry(do_request, label="sendMessage")
        if resp is None:
            return False

        if resp.status_code == 200:
            logger.info("✅ Published text post to %s", CHANNEL_USERNAME)
            return True

        logger.error("sendMessage API error %d: %s", resp.status_code, resp.text[:300])
        return False

    # ============================================================
    # Retry + FloodWait
    # ============================================================

    def _request_with_retry(self, request_fn, label: str = "request"):
        """Выполняет HTTP запрос с повторами и обработкой FloodWait.

        - При сетевой ошибке: пауза RETRY_DELAY_BASE * attempt секунд
        - При 429 (FloodWait): пауза из поля retry_after (до FLOOD_WAIT_CAP)
        - При 5xx: пауза и повтор
        - При 4xx (кроме 429): сразу возвращает ответ (не имеет смысла повторять)
        """
        last_resp = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = request_fn()
                last_resp = resp

                if resp.status_code == 200:
                    return resp

                # FloodWait — Telegram просит подождать
                if resp.status_code == 429:
                    try:
                        retry_after = resp.json().get("parameters", {}).get("retry_after", 5)
                    except Exception:
                        retry_after = 5
                    wait = min(int(retry_after) + 1, FLOOD_WAIT_CAP)
                    logger.warning(
                        "[%s] FloodWait 429 — ждём %ds (попытка %d/%d)",
                        label, wait, attempt, MAX_RETRIES
                    )
                    time.sleep(wait)
                    continue

                # Серверная ошибка — повторяем
                if resp.status_code >= 500:
                    wait = RETRY_DELAY_BASE * attempt
                    logger.warning(
                        "[%s] Server error %d — повтор через %ds (попытка %d/%d)",
                        label, resp.status_code, wait, attempt, MAX_RETRIES
                    )
                    time.sleep(wait)
                    continue

                # Клиентская ошибка (400, 401, 403 и т.д.) — не имеет смысла повторять
                logger.error(
                    "[%s] Client error %d: %s",
                    label, resp.status_code, resp.text[:300]
                )
                return resp

            except requests.exceptions.Timeout:
                wait = RETRY_DELAY_BASE * attempt
                logger.warning(
                    "[%s] Timeout — повтор через %ds (попытка %d/%d)",
                    label, wait, attempt, MAX_RETRIES
                )
                time.sleep(wait)

            except requests.exceptions.ConnectionError as e:
                wait = RETRY_DELAY_BASE * attempt
                logger.warning(
                    "[%s] ConnectionError: %s — повтор через %ds (попытка %d/%d)",
                    label, e, wait, attempt, MAX_RETRIES
                )
                time.sleep(wait)

            except Exception as e:
                logger.error("[%s] Неожиданная ошибка: %s", label, e)
                return None

        logger.error("[%s] Все %d попытки исчерпаны", label, MAX_RETRIES)
        return last_resp

    # ============================================================
    # Cleanup
    # ============================================================

    def stop(self):
        """Закрывает HTTP-сессию."""
        self.session.close()
        logger.info("Publisher session closed")