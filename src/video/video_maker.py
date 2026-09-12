"""
WB UP Case Video Generator v3 — True animation from a single case image.

Instead of crossfading between different photos, this version:
1. Takes ONE photo of a closed case
2. Splits it into LID (top) and BODY (bottom)
3. Animates the lid opening via perspective warp (cv2.warpPerspective)
4. Draws interior cavity + progressive glow
5. Composites the product rising from the glow
6. Renders final packshot with text

Result: smooth, consistent animation of the SAME case throughout.
"""

import os
import math
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

from moviepy.editor import VideoClip

# ─── Constants ───────────────────────────────────────────────────────
WIDTH, HEIGHT = 1080, 1920
FPS = 30
SIZE = (WIDTH, HEIGHT)


# ─── Easing ──────────────────────────────────────────────────────────
def ease_out_cubic(t):
    return 1.0 - (1.0 - t) ** 3

def ease_in_out_sine(t):
    return -(math.cos(math.pi * t) - 1.0) / 2.0

def ease_out_back(t):
    c1 = 1.70158
    c3 = c1 + 1.0
    return 1.0 + c3 * (t - 1.0) ** 3 + c1 * (t - 1.0) ** 2

def ease_in_quad(t):
    return t * t

def ease_out_quad(t):
    return 1.0 - (1.0 - t) ** 2

def ease_in_out_quad(t):
    if t < 0.5:
        return 2.0 * t * t
    else:
        return 1.0 - (-2.0 * t + 2.0) ** 2 / 2.0


# ─── Image helpers ───────────────────────────────────────────────────
def load_and_fit(path, w, h):
    """Load image, resize to cover, center-crop to exact w x h."""
    img = Image.open(path).convert("RGBA")
    scale = max(w / img.width, h / img.height)
    nw, nh = int(img.width * scale), int(img.height * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    return img.crop((left, top, left + w, top + h))


def pil_to_cv(img):
    """PIL RGBA -> cv2 BGRA numpy array."""
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGBA2BGRA)


def cv_to_pil(arr):
    """cv2 BGR/BGRA numpy array -> PIL RGBA."""
    if arr.shape[2] == 3:
        return Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGBA))
    return Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGRA2RGBA))


def apply_zoom(img_pil, zoom_factor):
    """Apply a center-zoom to a PIL image and return same-size result."""
    w, h = img_pil.size
    nw, nh = int(w * zoom_factor), int(h * zoom_factor)
    resized = img_pil.resize((nw, nh), Image.LANCZOS)
    left = (nw - w) // 2
    top = (nh - h) // 2
    return resized.crop((left, top, left + w, top + h))


# ─── Main class ──────────────────────────────────────────────────────
class CaseVideoMaker:
    """
    Generates a TikTok-ready vertical video of a case opening reveal.

    Storyboard (30s total):
      0:00 - 0:05  Closed case, subtle zoom
      0:05 - 0:10  Camera approaches (deeper zoom)
      0:10 - 0:17  Lid opens smoothly, light appears inside
      0:17 - 0:22  Product rises from the light
      0:22 - 0:30  Final packshot with product info
    """

    # Timing
    T1 = 5.0   # closed case
    T2 = 5.0   # approach zoom
    T3 = 7.0   # lid opens + light
    T4 = 5.0   # product rise
    T5 = 8.0   # packshot
    TOTAL = T1 + T2 + T3 + T4 + T5  # 30s

    def __init__(self, assets_dir):
        self.assets_dir = assets_dir
        case_path = os.path.join(assets_dir, "case_main.jpg")

        print("Loading case image...")
        self.case_full = load_and_fit(case_path, WIDTH, HEIGHT)

        # --- Detect case bounding box ---
        # We find the case region by looking at non-black pixels
        gray = np.array(self.case_full.convert("L"))
        # The case is the bright object; threshold
        _, thresh = cv2.threshold(gray, 25, 255, cv2.THRESH_BINARY)
        coords = cv2.findNonZero(thresh)
        if coords is not None:
            x, y, bw, bh = cv2.boundingRect(coords)
            self.case_bbox = (x, y, x + bw, y + bh)
        else:
            # Fallback: assume case is centered in lower half
            self.case_bbox = (WIDTH // 6, HEIGHT // 3, WIDTH * 5 // 6, HEIGHT * 4 // 5)

        cx1, cy1, cx2, cy2 = self.case_bbox
        case_h = cy2 - cy1

        # The lid is approximately the top 38% of the case bounding box
        self.lid_split_y = cy1 + int(case_h * 0.38)

        # Hinge line = where lid meets body (the split line)
        self.hinge_y = self.lid_split_y
        self.hinge_left = cx1
        self.hinge_right = cx2

        # Extract lid and body regions from the full image
        full_arr = np.array(self.case_full)

        # Lid: everything above hinge_y (within case area)
        self.lid_img = self.case_full.crop((0, 0, WIDTH, self.hinge_y))
        # Body: everything from hinge_y downward
        self.body_img = self.case_full.crop((0, self.hinge_y, WIDTH, HEIGHT))

        # Floor region: the dark floor under the case for the background
        self.floor_y = cy2  # bottom of case

        print(f"  Case bbox: {self.case_bbox}")
        print(f"  Lid split at y={self.lid_split_y}")
        print(f"  Hinge: y={self.hinge_y}, x=[{self.hinge_left}..{self.hinge_right}]")
        print("Assets ready.\n")

    def _make_interior(self, open_amount, glow_intensity):
        """
        Draw the interior cavity of the case that becomes visible as lid opens.
        open_amount: 0.0 (closed) to 1.0 (fully open)
        glow_intensity: 0.0 to 1.0
        Returns a PIL RGBA image of the interior region.
        """
        # The interior appears between the rising lid and the body
        # Height of visible interior = proportional to open_amount
        cx1, cy1, cx2, cy2 = self.case_bbox
        max_interior_h = int((cy2 - cy1) * 0.45)
        interior_h = int(max_interior_h * open_amount)
        if interior_h < 2:
            return None

        interior = Image.new("RGBA", (WIDTH, interior_h), (15, 15, 18, 255))
        draw = ImageDraw.Draw(interior)

        # Draw interior walls (slightly lighter edges)
        wall_w = cx2 - cx1
        wall_margin = 15
        draw.rectangle(
            [cx1 + wall_margin, 0, cx2 - wall_margin, interior_h],
            fill=(22, 22, 26, 255)
        )

        # Inner glow from bottom center
        if glow_intensity > 0:
            glow_img = Image.new("RGBA", (WIDTH, interior_h), (0, 0, 0, 0))
            glow_draw = ImageDraw.Draw(glow_img)
            center_x = WIDTH // 2
            center_y = interior_h  # glow from bottom

            max_r = int(wall_w * 0.7)
            for r in range(max_r, 0, -2):
                frac = 1.0 - (r / max_r)
                alpha = int(200 * glow_intensity * frac ** 1.5)
                alpha = min(alpha, 255)
                glow_draw.ellipse(
                    [center_x - r, center_y - r, center_x + r, center_y + r],
                    fill=(255, 255, 255, alpha)
                )

            interior = Image.alpha_composite(interior, glow_img)

        return interior

    def _warp_lid(self, open_amount):
        """
        Warp the lid image using perspective transform to simulate opening.
        open_amount: 0.0 (flat/closed) to 1.0 (fully open = tilted back)
        Returns a PIL RGBA image (same width, variable height).
        """
        if open_amount < 0.01:
            return self.lid_img.copy()

        lid_arr = pil_to_cv(self.lid_img)
        h, w = lid_arr.shape[:2]

        cx1, _, cx2, _ = self.case_bbox
        lid_w = cx2 - cx1

        # Source corners of the lid (the whole lid strip)
        src = np.float32([
            [cx1, h - 1],       # bottom-left (hinge)
            [cx2, h - 1],       # bottom-right (hinge)
            [cx1, 0],           # top-left
            [cx2, 0],           # top-right
        ])

        # As the lid opens (rotates back on the hinge):
        # - Bottom edge (hinge) stays fixed
        # - Top edge moves UP and gets narrower (perspective foreshortening)
        # - The lid visually "shrinks" vertically as it tilts
        angle = open_amount * 85.0  # 0 to 85 degrees
        angle_rad = math.radians(angle)

        # Vertical compression (foreshortening)
        visible_h = h * math.cos(angle_rad)
        # Top edge rises above hinge
        top_y = (h - 1) - visible_h

        # Perspective narrowing at the top (further away = narrower)
        narrow = open_amount * lid_w * 0.08
        # Also shift the top slightly to simulate depth
        shift_up = open_amount * h * 0.15

        dst = np.float32([
            [cx1, h - 1],                          # bottom-left (hinge, fixed)
            [cx2, h - 1],                          # bottom-right (hinge, fixed)
            [cx1 + narrow, top_y - shift_up],      # top-left (moved up + narrower)
            [cx2 - narrow, top_y - shift_up],      # top-right (moved up + narrower)
        ])

        M = cv2.getPerspectiveTransform(src, dst)
        warped = cv2.warpPerspective(
            lid_arr, M, (w, h),
            flags=cv2.INTER_LANCZOS4,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0, 0),
        )

        return cv_to_pil(warped)

    def _compose_frame(self, open_amount, glow_intensity, zoom=1.0,
                       product_img=None, product_y=None, product_scale=None, product_alpha=1.0):
        """
        Compose a single frame with the case at given open_amount.
        """
        frame = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))

        # 1. Paste body (lower part, static)
        body_y = self.hinge_y
        if open_amount > 0.01:
            # Shift body down a tiny bit to make room for interior
            cx1, cy1, cx2, cy2 = self.case_bbox
            max_interior_h = int((cy2 - cy1) * 0.45)
            interior_offset = int(max_interior_h * open_amount * 0.15)
            body_y += interior_offset

        frame.paste(self.body_img, (0, body_y), self.body_img)

        # 2. Draw interior cavity
        if open_amount > 0.02:
            interior = self._make_interior(open_amount, glow_intensity)
            if interior is not None:
                # Position interior just above the body
                interior_y = body_y - interior.height
                frame.paste(interior, (0, interior_y), interior)

                # 3. Paste warped lid above the interior
                warped_lid = self._warp_lid(open_amount)
                lid_y = interior_y - warped_lid.height + int(warped_lid.height * 0.7)
                frame.paste(warped_lid, (0, lid_y), warped_lid)
        else:
            # Lid is still closed — paste original lid
            frame.paste(self.lid_img, (0, 0), self.lid_img)

        # 4. Add volumetric glow overlay if light is on
        if glow_intensity > 0.3:
            self._add_volumetric_glow(frame, glow_intensity, body_y)

        # 5. Product overlay
        if product_img is not None and product_y is not None and product_scale is not None:
            pw = int(product_img.width * product_scale)
            ph = int(product_img.height * product_scale)
            if pw > 1 and ph > 1:
                prod = product_img.resize((pw, ph), Image.LANCZOS)

                # Apply alpha
                if product_alpha < 1.0:
                    r, g, b, a = prod.split()
                    a = a.point(lambda x: int(x * product_alpha))
                    prod = Image.merge("RGBA", (r, g, b, a))

                px = (WIDTH - pw) // 2
                py = int(product_y) - ph // 2
                frame.paste(prod, (px, py), prod)

        # 6. Apply zoom
        if zoom > 1.001:
            frame = apply_zoom(frame, zoom)

        return frame

    def _add_volumetric_glow(self, frame, intensity, glow_center_y):
        """Add volumetric light rays shooting upward from the case."""
        glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)

        cx = WIDTH // 2
        cy = glow_center_y - 20

        # Soft radial glow
        max_r = int(WIDTH * 0.45 * intensity)
        for r in range(max_r, 0, -4):
            frac = 1.0 - (r / max_r)
            alpha = int(120 * intensity * frac ** 2)
            alpha = min(alpha, 180)
            draw.ellipse(
                [cx - r, cy - int(r * 1.5), cx + r, cy + int(r * 0.3)],
                fill=(255, 255, 255, alpha)
            )

        frame_arr = np.array(frame).astype(np.float32)
        glow_arr = np.array(glow).astype(np.float32)

        # Screen blend mode
        r = frame_arr[:, :, :3]
        g = glow_arr[:, :, :3]
        a = glow_arr[:, :, 3:4] / 255.0

        blended = r + g * a * (1.0 - r / 255.0)
        blended = np.clip(blended, 0, 255)

        result = frame_arr.copy()
        result[:, :, :3] = blended
        result_img = Image.fromarray(result.astype(np.uint8))

        frame.paste(result_img, (0, 0))

    def _make_packshot(self, product_img, product_name, price, brand):
        """Create final packshot frame: product centered + text."""
        frame = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
        draw = ImageDraw.Draw(frame)

        # Scale product
        max_h = int(HEIGHT * 0.50)
        max_w = int(WIDTH * 0.65)
        scale = min(max_w / product_img.width, max_h / product_img.height)
        pw = int(product_img.width * scale)
        ph = int(product_img.height * scale)
        prod = product_img.resize((pw, ph), Image.LANCZOS)

        # Center product, slightly above center
        px = (WIDTH - pw) // 2
        py = HEIGHT // 2 - ph // 2 - 100
        frame.paste(prod, (px, py), prod)

        # Load fonts
        try:
            font_name = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
            font_price = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 100)
            font_brand = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
        except Exception:
            font_name = ImageFont.load_default()
            font_price = ImageFont.load_default()
            font_brand = ImageFont.load_default()

        # Text below product
        text_y = py + ph + 60
        # Product name
        name_bbox = draw.textbbox((0, 0), product_name, font=font_name)
        name_w = name_bbox[2] - name_bbox[0]
        draw.text(((WIDTH - name_w) // 2, text_y), product_name,
                  font=font_name, fill=(255, 255, 255))

        # Price
        text_y += 70
        price_bbox = draw.textbbox((0, 0), price, font=font_price)
        price_w = price_bbox[2] - price_bbox[0]
        draw.text(((WIDTH - price_w) // 2, text_y), price,
                  font=font_price, fill=(255, 255, 255))

        # Brand
        text_y += 120
        brand_bbox = draw.textbbox((0, 0), brand, font=font_brand)
        brand_w = brand_bbox[2] - brand_bbox[0]
        draw.text(((WIDTH - brand_w) // 2, text_y), brand,
                  font=font_brand, fill=(160, 160, 160))

        return frame

    def render(self, product_path, product_name, price, brand, output_path):
        """Render the full video."""
        print("╔══════════════════════════════════════════╗")
        print("║     WB UP Case Video Generator v3        ║")
        print("║     True animation from single image     ║")
        print("╚══════════════════════════════════════════╝")
        print(f"  Product: {product_name} | Price: {price}")
        print(f"  Output: {output_path}")
        print(f"  {WIDTH}x{HEIGHT} @ {FPS}fps, ~{self.TOTAL:.0f}s\n")

        product_img = Image.open(product_path).convert("RGBA")
        print(f"  Product: {product_img.width}x{product_img.height}\n")

        # Pre-render packshot
        packshot = self._make_packshot(product_img, product_name, price, brand)
        packshot_rgb = np.array(packshot.convert("RGB"))

        # Timeline boundaries
        t1_end = self.T1
        t2_end = t1_end + self.T2
        t3_end = t2_end + self.T3
        t4_end = t3_end + self.T4
        t5_end = t4_end + self.T5

        total_frames = int(self.TOTAL * FPS)
        frames_cache = {}

        def make_frame(t):
            """Generate one frame at time t."""

            # ── Scene 1: Closed case, subtle zoom (0 → T1) ──
            if t < t1_end:
                progress = t / t1_end
                zoom = 1.0 + 0.04 * ease_in_out_sine(progress)
                frame = self._compose_frame(
                    open_amount=0.0, glow_intensity=0.0, zoom=zoom
                )

            # ── Scene 2: Camera approaches (T1 → T2) ──
            elif t < t2_end:
                progress = (t - t1_end) / self.T2
                zoom = 1.04 + 0.10 * ease_in_out_sine(progress)
                frame = self._compose_frame(
                    open_amount=0.0, glow_intensity=0.0, zoom=zoom
                )

            # ── Scene 3: Lid opens + glow (T2 → T3) ──
            elif t < t3_end:
                progress = (t - t2_end) / self.T3
                # Lid opens smoothly
                open_amount = ease_in_out_quad(progress)
                # Glow starts when lid is ~30% open
                glow_progress = max(0, (progress - 0.3) / 0.7)
                glow_intensity = ease_out_quad(glow_progress)
                # Slight zoom during opening
                zoom = 1.14 - 0.06 * ease_out_cubic(progress)
                frame = self._compose_frame(
                    open_amount=open_amount,
                    glow_intensity=glow_intensity,
                    zoom=zoom,
                )

            # ── Scene 4: Product rises (T3 → T4) ──
            elif t < t4_end:
                progress = (t - t3_end) / self.T4
                rise = ease_out_back(min(progress * 1.2, 1.0))
                # Product position
                start_y = HEIGHT * 0.75
                end_y = HEIGHT * 0.35
                prod_y = start_y + (end_y - start_y) * rise
                # Scale
                prod_scale = 0.15 + 0.55 * rise
                # Fade in
                alpha = min(progress / 0.15, 1.0)
                # Glow fades out as product rises
                glow = 1.0 - progress * 0.5

                frame = self._compose_frame(
                    open_amount=1.0,
                    glow_intensity=glow,
                    zoom=1.08,
                    product_img=product_img,
                    product_y=prod_y,
                    product_scale=prod_scale,
                    product_alpha=alpha,
                )

            # ── Scene 5: Packshot (T4 → T5) ──
            else:
                progress = (t - t4_end) / self.T5
                if progress < 0.08:
                    # Quick crossfade into packshot
                    fade = ease_out_cubic(progress / 0.08)
                    # Get last frame of scene 4
                    prev = self._compose_frame(
                        open_amount=1.0, glow_intensity=0.5, zoom=1.08,
                        product_img=product_img,
                        product_y=HEIGHT * 0.35,
                        product_scale=0.70,
                        product_alpha=1.0,
                    )
                    prev_rgb = np.array(prev.convert("RGB")).astype(float)
                    blended = prev_rgb * (1.0 - fade) + packshot_rgb.astype(float) * fade
                    return np.clip(blended, 0, 255).astype(np.uint8)
                else:
                    return packshot_rgb

            return np.array(frame.convert("RGB"))

        # Render
        print("  🎬 Rendering frames...")
        clip = VideoClip(make_frame, duration=self.TOTAL)
        clip.write_videofile(
            output_path,
            fps=FPS,
            codec="libx264",
            audio=False,
            threads=4,
            preset="medium",
            bitrate="8000k",
        )

        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"\n  ✅ Done! {output_path} ({size_mb:.1f} MB)")
        print(f"     {WIDTH}x{HEIGHT}, {self.TOTAL:.0f}s, {int(self.TOTAL * FPS)} frames")
