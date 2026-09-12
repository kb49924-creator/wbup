from __future__ import annotations
import requests
from PIL import Image, ImageDraw, ImageFont

from src.config import IMAGES_DIR, TELEGRAM_PROXY
from src.utils.logger import get_logger

logger = get_logger("downloader")


class ImageDownloader:

    def __init__(self):

        self.folder = IMAGES_DIR / "original"
        self.folder.mkdir(
            parents=True,
            exist_ok=True,
        )

        # Используем тот же прокси, что и для Telegram (если указан)
        self._session = requests.Session()
        if TELEGRAM_PROXY:
            self._session.proxies = {
                "http": TELEGRAM_PROXY,
                "https": TELEGRAM_PROXY,
            }

    def download(
        self,
        url: str,
        article: int,
        fallback_urls: list[str] | None = None,
    ) -> str | None:

        # Проверяем кэш — только реальные фото (не заглушки)
        filename = self.folder / f"{article}.webp"
        if self._has_real_photo(article):
            logger.debug("Photo already cached: %s", filename)
            return str(filename)

        # Пробуем скачать фото через requests
        try:
            response = self._session.get(
                url,
                timeout=2,
            )
            response.raise_for_status()

            with open(filename, "wb") as file:
                file.write(response.content)

            if self._has_real_photo(article):
                logger.info("Downloaded photo for article=%s (%d bytes)", article, len(response.content))
                return str(filename)
            else:
                # Скачалось, но слишком маленькое — удаляем
                filename.unlink(missing_ok=True)
                logger.debug("Downloaded file too small for article=%s, removing", article)

        except requests.Timeout:
            logger.debug("Timeout downloading photo for article=%s", article)
        except requests.ConnectionError as e:
            logger.debug("Connection error for article=%s: %s", article, e)
        except requests.RequestException as e:
            logger.debug("Failed to download photo for article=%s: %s", article, e)

        # Пробуем fallback URL
        if fallback_urls:
            for fb_url in fallback_urls:
                try:
                    response = self._session.get(fb_url, timeout=2)
                    response.raise_for_status()
                    with open(filename, "wb") as file:
                        file.write(response.content)
                    if self._has_real_photo(article):
                        logger.info("Downloaded via fallback for article=%s", article)
                        return str(filename)
                    else:
                        filename.unlink(missing_ok=True)
                except requests.RequestException:
                    continue

        # Не удалось скачать — возвращаем None (заглушку создаст вызывающий код)
        return None

    def _has_real_photo(self, article: int) -> bool:
        """Проверяет, есть ли реальное фото (не заглушка) для артикула."""
        filename = self.folder / f"{article}.webp"
        if not filename.exists():
            return False
        return filename.stat().st_size >= 20000

    def create_placeholder(self, article: int) -> str | None:
        """Создаёт картинку-заглушку для товара без фото."""
        try:
            filename = self.folder / f"{article}.webp"
            if filename.exists():
                return str(filename)

            # Создаём изображение 512x512 с тёмным фоном
            img = Image.new("RGB", (512, 512), (30, 30, 30))
            draw = ImageDraw.Draw(img)

            # Пробуем загрузить шрифт
            try:
                font = ImageFont.truetype("arial.ttf", 32)
                small_font = ImageFont.truetype("arial.ttf", 20)
            except Exception:
                font = ImageFont.load_default()
                small_font = ImageFont.load_default()

            # Текст "WB" крупно
            text = "WB"
            bbox = draw.textbbox((0, 0), text, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            x = (512 - tw) // 2
            y = (512 - th) // 2 - 30
            draw.text((x, y), text, fill=(100, 100, 100), font=font)

            # Артикул мелко
            article_text = f"Арт. {article}"
            bbox2 = draw.textbbox((0, 0), article_text, font=small_font)
            tw2 = bbox2[2] - bbox2[0]
            x2 = (512 - tw2) // 2
            y2 = y + th + 10
            draw.text((x2, y2), article_text, fill=(80, 80, 80), font=small_font)

            img.save(filename, "WEBP", quality=80)
            logger.info("Created placeholder for article=%s", article)
            return str(filename)

        except Exception as e:
            logger.warning("Failed to create placeholder for article=%s: %s", article, e)
            return None