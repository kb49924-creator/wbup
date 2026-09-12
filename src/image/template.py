"""
Шаблон для создания карточки-коллажа из товаров (v3 — Apple HIG Edition).

Создаёт премиальную публикационную карточку 1080x1080 по стандартам Apple Human Interface Guidelines:
- Воздушная композиция для 4 товаров (2x2) и адаптация под 1-6 товаров
- Многослойные мягкие окружающие тени (Soft Ambient Diffuse Shadows)
- Элегантные плашки скидок (8px squircle, акцентный Apple Crimson/Coral градиент)
- Чёткая иерархия типографики (SF Pro Display / Text) с ценами, брендами и артикулами
- macOS Sequoia / iOS 18 Dynamic Dark эстетика холста
"""

from __future__ import annotations
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

from src.config import CARD_SIZE, DATA_DIR
from src.utils.logger import get_logger

logger = get_logger("template")


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Загружает системный шрифт Apple SF Pro или качественные альтернативы."""
    font_candidates = [
        # macOS San Francisco
        "/System/Library/Fonts/SFProDisplay-Bold.otf" if bold else "/System/Library/Fonts/SFProDisplay-Regular.otf",
        "/System/Library/Fonts/SFPro.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        # Linux / Docker fallbacks
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "DejaVuSans.ttf",
        "arial.ttf",
    ]
    for path in font_candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    try:
        return ImageFont.load_default(size=size)
    except Exception:
        return ImageFont.load_default()


class CardTemplate:
    """Создаёт премиальную карточку-коллаж 1080x1080 по канонам Apple HIG."""

    # Разметка для 4 товаров
    MARGIN_4 = 36
    GAP_4 = 20
    TILE_RADIUS_4 = 24

    def render(
        self,
        photo_paths: list[str],
        output_path: str,
        background_path: str | None = None,
        products: list[Any] | None = None,
    ) -> bool:
        """Создаёт карточку-коллаж 1080x1080.

        Args:
            photo_paths: Список путей к фото товаров с удалённым фоном (PNG).
            output_path: Путь для сохранения карточки (WEBP/PNG).
            background_path: Опциональный путь к фоновому изображению.
            products: Опциональный список объектов или словарей Product с метаданными.
        """
        try:
            if not photo_paths:
                logger.error("No photo paths provided to render")
                return False

            # Загружаем метаданные товаров, если не переданы
            if not products:
                products = self._resolve_products(photo_paths)

            # Создаём холст 1080x1080
            canvas = Image.new("RGBA", (CARD_SIZE, CARD_SIZE), (14, 14, 18, 255))

            # 1. Накладываем фон (пользовательский или премиальный Sequoia Dark)
            self._draw_background(canvas, background_path)

            # 2. Загружаем изображения товаров
            product_images = self._load_product_images(photo_paths)
            if not product_images:
                logger.error("No valid product cutouts loaded")
                return False

            count = len(product_images)
            cols, rows = self._calc_grid(count)

            # 3. Рассчитываем отступы и размеры плиток (учитывая фирменный логотип в шапке фона)
            top_margin = 130 if background_path else (self.MARGIN_4 if count <= 4 else 28)
            bottom_margin = 36 if count <= 4 else 28
            margin_x = self.MARGIN_4 if count <= 4 else 28
            gap = self.GAP_4 if count <= 4 else 16
            tile_radius = self.TILE_RADIUS_4 if count <= 4 else 18

            cell_w = (CARD_SIZE - 2 * margin_x - (cols - 1) * gap) // cols
            cell_h = (CARD_SIZE - top_margin - bottom_margin - (rows - 1) * gap) // rows

            # 4. Размещаем карточки с товарами и типографикой
            self._place_tiles(
                canvas=canvas,
                images=product_images,
                products=products,
                cols=cols,
                rows=rows,
                cell_w=cell_w,
                cell_h=cell_h,
                margin_x=margin_x,
                top_margin=top_margin,
                gap=gap,
                tile_radius=tile_radius,
            )

            # 5. Сохраняем в высоком качестве
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            rgb_canvas = canvas.convert("RGB")
            rgb_canvas.save(output_path, "WEBP", quality=95, method=6)
            logger.info("Apple HIG 1080x1080 card saved: %s", output_path)
            return True

        except Exception as e:
            logger.error("Failed to render Apple HIG card: %s", e, exc_info=True)
            return False

    # ------------------------------------------------------------
    # Фон (macOS Sequoia Dynamic Dark или фирменный брендовый шаблон)
    # ------------------------------------------------------------

    def _draw_background(self, canvas: Image.Image, background_path: str | None):
        """Рисует фон: фоновую картинку или атмосферный динамический градиент."""
        if background_path and Path(background_path).exists():
            try:
                bg = Image.open(background_path).convert("RGBA")
                bg = ImageOps.cover(bg, (CARD_SIZE, CARD_SIZE))
                canvas.paste(bg, (0, 0))
                return
            except Exception as e:
                logger.warning("Failed to load background %s: %s", background_path, e)

        # Автономный фон macOS Sequoia / iOS 18 Dynamic Dark
        # Глубокий угольный градиент с атмосферными цветными аgloвами
        draw = ImageDraw.Draw(canvas)
        for y in range(CARD_SIZE):
            ratio = y / CARD_SIZE
            # #0a0a0e -> #121218
            r = int(10 + 8 * ratio)
            g = int(10 + 8 * ratio)
            b = int(14 + 10 * ratio)
            draw.line([(0, y), (CARD_SIZE, y)], fill=(r, g, b, 255))

        # Атмосферные радиальные сияния Apple Blue (#0071e3) и Apple Purple (#bf5af2)
        self._draw_ambient_glow(canvas, (140, 140), 420, (0, 113, 227, 28))
        self._draw_ambient_glow(canvas, (CARD_SIZE - 140, 160), 400, (191, 90, 242, 22))
        self._draw_ambient_glow(canvas, (CARD_SIZE // 2, CARD_SIZE - 100), 460, (94, 92, 230, 20))

    @staticmethod
    def _draw_ambient_glow(canvas: Image.Image, center: tuple[int, int], radius: int, color_rgba: tuple[int, int, int, int]):
        """Рисует мягкое радиальное свечение на холсте."""
        glow = Image.new("RGBA", (radius * 2, radius * 2), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        cx, cy = radius, radius
        r, g, b, max_a = color_rgba
        steps = 28
        for i in range(steps, 0, -1):
            curr_r = int(radius * (i / steps))
            alpha = int(max_a * math.pow(1 - (i / steps), 1.6))
            glow_draw.ellipse(
                [cx - curr_r, cy - curr_r, cx + curr_r, cy + curr_r],
                fill=(r, g, b, alpha)
            )
        glow = glow.filter(ImageFilter.GaussianBlur(16))
        pos_x = center[0] - radius
        pos_y = center[1] - radius
        canvas.paste(glow, (pos_x, pos_y), glow)

    # ------------------------------------------------------------
    # Загрузка и привязка товаров
    # ------------------------------------------------------------

    def _load_product_images(self, photo_paths: list[str]) -> list[Image.Image]:
        images = []
        for p in photo_paths:
            try:
                img = Image.open(p).convert("RGBA")
                images.append(img)
            except Exception as e:
                logger.warning("Failed to open cutout %s: %s", p, e)
        return images

    def _resolve_products(self, photo_paths: list[str]) -> list[dict]:
        """Пытается найти метаданные товаров из базы или new_products.json по артикулам."""
        products_map = {}
        json_file = DATA_DIR / "new_products.json"
        if json_file.exists():
            try:
                data = json.loads(json_file.read_text("utf-8"))
                for item in data:
                    art = item.get("article")
                    if art:
                        products_map[str(art)] = item
            except Exception as e:
                logger.debug("Failed to read new_products.json: %s", e)

        resolved = []
        for path in photo_paths:
            article = Path(path).stem.split("_")[0]
            prod = products_map.get(str(article))
            if prod:
                resolved.append(prod)
            else:
                resolved.append({"article": article, "name": f"Товар {article}", "brand": "WILDBERRIES"})
        return resolved

    # ------------------------------------------------------------
    # Сетка
    # ------------------------------------------------------------

    @staticmethod
    def _calc_grid(count: int) -> tuple[int, int]:
        if count <= 1:
            return 1, 1
        elif count == 2:
            return 2, 1
        elif count == 3:
            return 3, 1
        elif count <= 4:
            return 2, 2
        else:
            return 3, 2

    # ------------------------------------------------------------
    # Размещение плиток товаров
    # ------------------------------------------------------------

    def _place_tiles(
        self,
        canvas: Image.Image,
        images: list[Image.Image],
        products: list[Any],
        cols: int,
        rows: int,
        cell_w: int,
        cell_h: int,
        margin_x: int,
        top_margin: int,
        gap: int,
        tile_radius: int,
    ):
        """Размещает премиальные плитки товаров с фото, тенями, плашками и типографикой."""
        total = len(images)
        for idx in range(min(total, cols * rows)):
            row = idx // cols
            col = idx % cols

            # Центрирование последнего ряда при нечетном количестве
            if rows > 1 and row == rows - 1:
                last_row_count = total - (cols * (rows - 1))
                if 0 < last_row_count < cols:
                    total_w = last_row_count * cell_w + (last_row_count - 1) * gap
                    offset_x = (CARD_SIZE - total_w) // 2
                    x = offset_x + col * (cell_w + gap)
                else:
                    x = margin_x + col * (cell_w + gap)
            else:
                x = margin_x + col * (cell_w + gap)

            y = top_margin + row * (cell_h + gap)

            img = images[idx]
            prod = products[idx] if idx < len(products) else {}
            self._draw_product_tile(canvas, img, prod, x, y, cell_w, cell_h, tile_radius)

    def _draw_product_tile(
        self,
        canvas: Image.Image,
        img: Image.Image,
        product: Any,
        x: int,
        y: int,
        w: int,
        h: int,
        radius: int,
    ):
        """Рисует индивидуальную плитку товара (Glass Surface + Soft Shadows + Typography)."""
        d = ImageDraw.Draw(canvas)

        # 1. Фоновая подложка карточки (Apple Frosted Glass)
        # Полупрозрачный угольный акрил + ультратонкая граница 0.5px
        tile_bg = (24, 24, 30, 215)
        border_col = (255, 255, 255, 28)
        d.rounded_rectangle([x, y, x + w - 1, y + h - 1], radius=radius, fill=tile_bg, outline=border_col, width=1)

        # Верхний спекулярный блик (Apple Liquid Glass highlight)
        d.line([(x + radius, y + 1), (x + w - radius, y + 1)], fill=(255, 255, 255, 42), width=1)

        # 2. Размещение фото товара с мягкими окружающими тенями (Soft Ambient Shadows)
        # Зона для фото занимает верхние ~63% карточки
        img_area_w = w - 36
        img_area_h = int(h * 0.61)
        scale = min(img_area_w / img.width, img_area_h / img.height)
        new_w = max(1, int(img.width * scale))
        new_h = max(1, int(img.height * scale))
        resized_img = img.resize((new_w, new_h), Image.LANCZOS)

        paste_x = x + (w - new_w) // 2
        paste_y = y + 18 + (img_area_h - new_h) // 2

        # Наложение двухслойной мягкой тени
        self._draw_soft_ambient_shadow(canvas, resized_img, paste_x, paste_y)

        # Вставка фото поверх тени
        if resized_img.mode == "RGBA":
            canvas.paste(resized_img, (paste_x, paste_y), resized_img)
        else:
            canvas.paste(resized_img, (paste_x, paste_y))

        # 3. Элегантная плашка скидки (8px squircle, акцентный Apple Crimson/Coral градиент)
        discount = self._get_prop(product, "discount")
        if discount and int(discount) > 0:
            badge_font = _load_font(size=14 if w < 400 else 15, bold=True)
            badge_w = 76 if w < 400 else 84
            badge_h = 28 if w < 400 else 32
            badge = self._create_gradient_badge(badge_w, badge_h, r=8, text=f"-{discount}%", font=badge_font)
            # Размещаем в правом верхнем углу плитки
            badge_x = x + w - badge_w - 14
            badge_y = y + 14
            canvas.paste(badge, (badge_x, badge_y), badge)

        # 4. Чёткая иерархия типографики (SF Pro Display / Text)
        footer_y = y + int(h * 0.65)
        pad_x = 20 if w >= 400 else 14

        # 4a. Бренд (Uppercase, tracking, Apple Blue #0A84FF)
        brand = (self._get_prop(product, "brand") or "WILDBERRIES").upper()
        if len(brand) > 24:
            brand = brand[:22] + "..."
        font_brand = _load_font(size=13 if w < 400 else 15, bold=True)
        d.text((x + pad_x, footer_y), brand, font=font_brand, fill=(41, 151, 255, 255))

        # 4b. Цены (SF Pro Display Heavy крупно + старая зачёркнутая цена)
        price_val = self._get_prop(product, "sale_price") or self._get_prop(product, "price") or 0
        old_price_val = self._get_prop(product, "price")

        price_str = f"{int(price_val):,} ₽".replace(",", " ")
        font_price = _load_font(size=24 if w < 400 else 30, bold=True)
        price_y = footer_y + (20 if w < 400 else 24)
        d.text((x + pad_x, price_y), price_str, font=font_price, fill=(255, 255, 255, 255))

        # Старая зачеркнутая цена (если есть скидка)
        if old_price_val and int(old_price_val) > int(price_val):
            bbox_p = d.textbbox((x + pad_x, price_y), price_str, font=font_price)
            old_str = f"{int(old_price_val):,} ₽".replace(",", " ")
            font_old = _load_font(size=14 if w < 400 else 17, bold=False)
            old_x = bbox_p[2] + 10
            old_y = price_y + (4 if w < 400 else 6)
            d.text((old_x, old_y), old_str, font=font_old, fill=(155, 155, 168, 240))

            # Линия зачёркивания
            bbox_o = d.textbbox((old_x, old_y), old_str, font=font_old)
            strike_y = (bbox_o[1] + bbox_o[3]) // 2
            d.line([(bbox_o[0], strike_y), (bbox_o[2], strike_y)], fill=(155, 155, 168, 240), width=1)

        # 4c. Артикул товара (Muted SF Pro Text)
        article = self._get_prop(product, "article")
        if article:
            art_str = f"арт. {article}"
            font_art = _load_font(size=11 if w < 400 else 13, bold=False)
            art_y = price_y + (28 if w < 400 else 34)
            d.text((x + pad_x, art_y), art_str, font=font_art, fill=(145, 145, 158, 230))

    # ------------------------------------------------------------
    # Графика: Мягкие тени и градиентные плашки
    # ------------------------------------------------------------

    @staticmethod
    def _draw_soft_ambient_shadow(canvas: Image.Image, img: Image.Image, x: int, y: int):
        """Накладывает двухслойную мягкую рассеянную тень (Apple Ambient Diffuse Shadow).

        1. Близкая контактная тень (grounding)
        2. Широкая рассеянная тень (floating volume)
        """
        if img.mode != "RGBA":
            return

        alpha = img.getchannel("A")

        # Слой 1: Широкая мягкая диффузная тень
        diffuse = Image.new("RGBA", img.size, (0, 0, 0, 0))
        diffuse.putalpha(alpha)
        diffuse = diffuse.filter(ImageFilter.GaussianBlur(22))
        diff_alpha = diffuse.split()[3].point(lambda a: int(a * 0.16))
        diffuse.putalpha(diff_alpha)
        canvas.paste(diffuse, (x, y + 14), diffuse)

        # Слой 2: Близкая контактная тень
        contact = Image.new("RGBA", img.size, (0, 0, 0, 0))
        contact.putalpha(alpha)
        contact = contact.filter(ImageFilter.GaussianBlur(7))
        cont_alpha = contact.split()[3].point(lambda a: int(a * 0.22))
        contact.putalpha(cont_alpha)
        canvas.paste(contact, (x, y + 6), contact)

    @staticmethod
    def _create_gradient_badge(w: int, h: int, r: int, text: str, font: ImageFont.ImageFont) -> Image.Image:
        """Создаёт градиентную плашку скидки с закруглением r=8px и суперсэмплингом 2x."""
        # 2x supersampling for ultra-crisp antialiased edges
        bg = Image.new("RGBA", (w * 2, h * 2), (0, 0, 0, 0))
        bg_d = ImageDraw.Draw(bg)

        # Apple Red/Coral Vibrant Gradient: #FF2D55 -> #FF3B30
        c1 = (255, 45, 85, 255)
        c2 = (255, 59, 48, 255)
        for y_coord in range(h * 2):
            ratio = y_coord / (h * 2)
            rc = int(c1[0] * (1 - ratio) + c2[0] * ratio)
            gc = int(c1[1] * (1 - ratio) + c2[1] * ratio)
            bc = int(c1[2] * (1 - ratio) + c2[2] * ratio)
            bg_d.line([(0, y_coord), (w * 2, y_coord)], fill=(rc, gc, bc, 255))

        # Маска с закруглением r*2
        mask = Image.new("L", (w * 2, h * 2), 0)
        mask_d = ImageDraw.Draw(mask)
        mask_d.rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius=r * 2, fill=255)
        bg.putalpha(mask)

        # Ресайз до 1x
        badge = bg.resize((w, h), Image.LANCZOS)

        # Наносим белый текст скидки по центру
        d = ImageDraw.Draw(badge)
        bbox = d.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (w - tw) // 2 - bbox[0]
        ty = (h - th) // 2 - bbox[1]
        d.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))

        # Тонкий внутренний спекулярный контур 0.5px
        d.rounded_rectangle([0, 0, w - 1, h - 1], radius=r, outline=(255, 255, 255, 60), width=1)
        return badge

    @staticmethod
    def _get_prop(obj: Any, key: str) -> Any:
        """Универсальное извлечение свойства из словаря или объекта."""
        if not obj:
            return None
        if isinstance(obj, dict):
            return obj.get(key)
        return getattr(obj, key, None)