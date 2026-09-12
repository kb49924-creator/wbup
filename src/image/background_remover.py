"""
Удаление фона с фотографий товаров через rembg.
Полностью новый метод, доверяющий нейросети.
"""

import sys
from pathlib import Path
from PIL import Image

try:
    from rembg import remove as remove_bg, new_session
except ImportError:
    pass

from src.utils.logger import get_logger

logger = get_logger("background_remover")

class BackgroundRemover:
    """Простое и надежное удаление фона с использованием rembg."""

    _rembg_session = None

    def __init__(self):
        pass

    def remove(self, input_path: str, output_path: str) -> bool:
        """Удаляет фон и сохраняет результат в PNG."""
        try:
            from rembg import remove as remove_bg, new_session
            
            if BackgroundRemover._rembg_session is None:
                logger.info("Initializing rembg session (isnet-general-use)...")
                providers = ["CPUExecutionProvider"]
                BackgroundRemover._rembg_session = new_session("isnet-general-use", providers=providers)

            with Image.open(input_path) as img:
                if img.mode != "RGBA":
                    img = img.convert("RGBA")

                orig_w, orig_h = img.size

                # Уменьшаем изображение для ускорения, если оно слишком большое
                max_side = 1000
                if orig_w > max_side or orig_h > max_side:
                    ratio = max_side / max(orig_w, orig_h)
                    small_w = int(orig_w * ratio)
                    small_h = int(orig_h * ratio)
                    img_small = img.resize((small_w, small_h), Image.LANCZOS)
                else:
                    img_small = img

                # Удаляем фон
                result_small = remove_bg(img_small, session=BackgroundRemover._rembg_session)

                # Возвращаем к оригинальному размеру для сохранения качества исходника
                if result_small.size != (orig_w, orig_h):
                    result = result_small.resize((orig_w, orig_h), Image.LANCZOS)
                else:
                    result = result_small

                Path(output_path).parent.mkdir(parents=True, exist_ok=True)
                result.save(output_path, "PNG")

                logger.info("Background removed successfully: %s", output_path)
                return True

        except ImportError:
            logger.error("rembg is not installed. Install it: pip install rembg")
            return False
        except Exception as e:
            logger.error("Failed to remove background from %s: %s", input_path, e)
            return False