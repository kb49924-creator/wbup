from __future__ import annotations
from src.wb.local_ai_ranker import local_ai
"""
Smart Photo Ranker v2 — Умный выбор лучших фотографий для карточки товара.

Цели отбора:
1. НЕТ ЛЮДЕЙ на фотографии (фото одежды/аксессуаров)
2. Одежда ЦЕЛИКОВАМ видна (не обрезана)
3. Одежда лежит по ЦЕНТРУ кадра
4. Почти ОДНОРОДНЫЙ фон
5. Одежда лежит ПРЯМО/РОВНО

Алгоритм v2:
1. Пробуем индексы 1..15 на каждом домене WB
2. Берём ВСЕ успешные фото (не первое, а все!)
3. Мягкая оценка без жёсткого veto
4. Сортируем по composite_score
5. Возвращаем топ-K лучших

Оптимизация скорости:
- 8 basket max
- 3 домена на индекс  
- Ранний выход при скачивании (chunked + early exit)
- Таймауты 8 сек total
"""
import asyncio
import time
from pathlib import Path
from typing import Optional, Dict, Any

import aiohttp
from PIL import Image
from io import BytesIO

try:
    import numpy as np
    _NUMPY_AVAILABLE = True
except ImportError:
    _NUMPY_AVAILABLE = False

from src.utils.logger import get_logger
from src.wb.image_finder import WBImageService

logger = get_logger("photo_ranker")

# ======================== Настройки ========================
NUM_BASKETS = 8              # Сколько basket пробуем
URLS_PER_DOMAIN = 3          # Доменов (wb.ru, wbbasket.ru, wildberries.ru)
MAX_INDEXES = 30             # Индексы 1..30
HTTP_TIMEOUT = 8             # Общий таймаут
HTTP_CONNECT_TIMEOUT = 3     # Connect timeout
HTTP_SOCK_READ_TIMEOUT = 5   # Socket read timeout
MIN_PHOTO_SIZE = 10000       # Мин размер файла (байт)
MAX_PHOTO_SIZE = 3000000     # Макс размер (3MB)
MAX_CONCURRENT = 6           # Параллельных скачиваний

WEIGHTS = {
    "no_model":     0.30,
    "background":   0.20,
    "center":       0.15,
    "flat_lay":     0.15,
    "not_size_chart": 0.10,
    "lighting":     0.10,
}

class PhotoScore:
    """Результат оценки одного фото."""
    
    def __init__(self, path: Path, article: int, index: int,
                 composite_score: float, criteria: Dict[str, float], url_used: str):
        self.path = path
        self.article = article
        self.index = index
        self.composite_score = composite_score
        self.criteria = criteria
        self.url_used = url_used
    
    @property
    def is_vetoed(self) -> bool:
        """VETO только если ЯВНО плохое фото (очень строгие пороги)."""
        nm = self.criteria.get("no_model", 0.5)
        if nm < 0.15:  # Явно модель
            return True
        cr = self.criteria.get("cropped", 1.0)
        if cr < 0.15:  # Явно обрезано
            return True
        return False


class SmartPhotoRanker:
    """Умный ранкер фотографий v2 — использует WBImageService для скачивания."""
    
    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or (Path("data/images/original"))
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._service = None  # Ленивая инициализация

    @property
    def semaphore(self):
        if getattr(self, '_semaphore_obj', None) is None:
            self._semaphore_obj = asyncio.Semaphore(MAX_CONCURRENT)
        return self._semaphore_obj

    @property
    def service(self):
        """Ленивая инициализация WBImageService."""
        if self._service is None:
            cache_file = Path("data/images/basket_cache.json")
            self._service = WBImageService(cache_file=cache_file, output_dir=self.output_dir)
        return self._service
    
    async def rank_article_photos(self, article: int, max_indexes: int = None) -> list:
        """Ранжирует все фото товара по качеству (через WBImageService.downloader)."""
        if max_indexes is None:
            max_indexes = MAX_INDEXES
            
        logger.info("")
        logger.info("=" * 60)
        logger.info("[PhotoRanker v2] Article=%d, indexes=1..%d (via WBImageService)", article, max_indexes)
        logger.info("=" * 60)
        
        try:
            # ИспользуемWBImageDownloader для скачивания
            photos = await self.service.downloader.download_article_photos(
                article=article,
                max_indexes=max_indexes,
                max_baskets=NUM_BASKETS,
                sizes=['big', 'large']
            )
            
            if not photos:
                logger.warning("No photos downloaded via WBImageService for article=%d — using legacy fallback", article)
                return await self._rank_legacy(article, max_indexes)
            
            success_count = len(photos)
            logger.info("")
            logger.info("=" * 60)
            logger.info("[PhotoRanker v2] Article=%d: %d photos via WBImageService", article, success_count)
            logger.info("=" * 60)
            
            # Конвертируем Path в PhotoScore
            results = []
            for p in photos:
                tmp_file = p if isinstance(p, Path) else Path(getattr(p, 'path', str(p)))
                if tmp_file.exists():
                    idx = 1
                    if "_idx" in tmp_file.name:
                        try:
                            idx = int(tmp_file.name.split("_idx")[1].split("_")[0])
                        except (IndexError, ValueError):
                            idx = 1
                    elif hasattr(p, 'index'):
                        idx = p.index

                    img = Image.open(str(tmp_file))
                    criteria = self._quick_score(img)
                    composite = self._compute_composite(criteria)
                    
                    results.append(PhotoScore(
                        path=tmp_file,
                        article=article,
                        index=idx,
                        composite_score=composite,
                        criteria=criteria,
                        url_used=getattr(p, 'url', '') or "",
                    ))
            
            # Дедупликация
            results = self._deduplicate(results)
            
            # Штрафуем за наличие модели (но не блокируем!)
            for r in results:
                nm = r.criteria.get("no_model", 0.5)
                if nm < 0.5:
                    r.composite_score *= (nm / 0.5)
            
            if local_ai.is_trained:
                logger.info("Using trained Local AI (batch inference) to score photos...")
                try:
                    scores = local_ai.predict_scores_batch([str(r.path) for r in results])
                    for r, score in zip(results, scores):
                        r.composite_score = score
                    results.sort(key=lambda r: r.composite_score, reverse=True)
                except Exception as e:
                    logger.warning(f"Local AI predict failed: {e}. Using heuristic scoring.")
                    results.sort(key=lambda r: (r.index != 1, -r.composite_score))
            else:
                # Сортируем: всегда отдаем приоритет 1.webp (index 1)
                results.sort(key=lambda r: (r.index != 1, -r.composite_score))
            
            return results
        
        except Exception as e:
            logger.error("WBImageService download failed for article=%d: %s", article, e)
            logger.info("Falling back to legacy direct fetch method...")
            # Откат к старому методу
            return await self._rank_legacy(article, max_indexes)
    
    async def _fetch_url(self, article: int, index: int, url: str) -> Optional[PhotoScore]:
        """Откат к старому методу для совместимости."""
        return await self._fetch_url_legacy(article, index, url)
    
    async def _rank_legacy(self, article: int, max_indexes: int) -> list:
        """Старый метод скачивания (откат при ошибке)."""
        logger.info("_rank_legacy: using legacy direct fetch method")
        return await self._rank_legacy_impl(article, max_indexes)
    
    async def _rank_legacy_impl(self, article: int, max_indexes: int) -> list:
        """Legacy direct fetch — параллельное скачивание с быстрым таймаутом."""
        from src.wb.catalog import _estimate_baskets
        
        baskets = _estimate_baskets(article)[:NUM_BASKETS]
        if not baskets:
            return []
        
        vol = article // 100000
        part = article // 1000

        results = []
        timeout = aiohttp.ClientTimeout(total=3.0, connect=1.5, sock_read=2.0)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            for idx in range(1, max_indexes + 1):
                # Собираем URL для всех вероятных корзин для текущего индекса
                candidate_urls = []
                for basket in baskets:
                    path_img = f"/vol{vol}/part{part}/{article}/images/big/{idx}.webp"
                    candidate_urls.extend([
                        f"https://basket-{basket:02d}.wbbasket.ru{path_img}",
                        f"https://basket-{basket:02d}.wb.ru{path_img}",
                    ])

                # Пробуем кандидатов с ограничением параллелизма
                for url in candidate_urls[:10]:
                    try:
                        async with session.get(url, allow_redirects=False) as resp:
                            if resp.status != 200:
                                continue
                            data_bytes = await resp.read()
                            if len(data_bytes) < MIN_PHOTO_SIZE or len(data_bytes) > MAX_PHOTO_SIZE:
                                continue
                            
                            img = Image.open(BytesIO(data_bytes))
                            img.verify()

                            tmp_name = f"{article}_idx{idx}.webp"
                            tmp_file = self.output_dir / tmp_name
                            if not tmp_file.exists():
                                tmp_file.write_bytes(data_bytes)

                            # Переоткрываем после verify
                            img = Image.open(str(tmp_file))
                            criteria = self._quick_score(img)
                            composite = self._compute_composite(criteria)
                            
                            results.append(PhotoScore(
                                path=tmp_file, article=article, index=idx,
                                composite_score=composite, criteria=criteria, url_used=url,
                            ))
                            break  # Фото для текущего индекса найдено, переходим к следующему индексу
                    except Exception:
                        continue

        results = self._deduplicate(results)
        if local_ai.is_trained:
            logger.info("Using trained Local AI (batch inference) to score photos...")
            try:
                scores = local_ai.predict_scores_batch([str(r.path) for r in results])
                for r, score in zip(results, scores):
                    r.composite_score = score
                results.sort(key=lambda r: r.composite_score, reverse=True)
            except Exception as e:
                logger.warning(f"Local AI predict failed: {e}. Using heuristic scoring.")
                results.sort(key=lambda r: (r.index != 1, -r.composite_score))
        else:
            results.sort(key=lambda r: (r.index != 1, -r.composite_score))
        return results
    
    def _quick_score(self, img: Image.Image) -> Dict[str, float]:
        """Быстрая многокритериальная оценка через NumPy (ускорение ~10x)."""
        # Конвертируем в RGB если нужно
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        w, h = img.size

        if _NUMPY_AVAILABLE:
            # Используем NumPy для быстрых векторных операций
            arr = np.array(img, dtype=np.float32)  # shape: (h, w, 3)
            return self._quick_score_numpy(arr, w, h)
        else:
            # Fallback на старый метод если NumPy недоступен
            pixels = list(img.getdata())
            return self._quick_score_legacy(pixels, w, h)

    def _quick_score_numpy(self, arr, w: int, h: int) -> Dict[str, float]:
        """NumPy-ускоренный scoring."""
        R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

        # --- no_model: обнаружение кожи ---
        skin = (
            (R > 95) & (G > 80) & (B > 70) &
            (R > G) & (R > B) &
            ((R - G) > 15) & ((R - B) > 20) & (G > B) &
            (R < 230) & (G < 215) & (B < 200) &
            (np.abs(R - G) < 60)
        )
        skin_ratio = skin.mean()
        warm = (R > 80) & (G > 60) & (B > 50) & (R > G) & (R > B) & ((R + G + B) / 3 > 70)
        warm_ratio = warm.mean()
        model_ind = min(1.0, float(skin_ratio) * 80.0) * 0.6 + min(1.0, float(warm_ratio) * 15.0) * 0.4
        no_model_score = max(0.0, min(1.0, 1.0 - model_ind * 2.0))

        # --- background: однородность рамки ---
        bw = max(5, min(w, h) // 20)
        border = np.concatenate([
            arr[:bw, :].reshape(-1, 3),
            arr[h-bw:, :].reshape(-1, 3),
            arr[bw:h-bw, :bw].reshape(-1, 3),
            arr[bw:h-bw, w-bw:].reshape(-1, 3),
        ])
        avg_std = float(border.std(axis=0).mean())
        bg_score = max(0.0, 1.0 - avg_std / 60.0)

        # --- center: различимость объекта в центре ---
        cy, cx = h // 2, w // 2
        ch, cw = h // 4, w // 4
        center = arr[cy-ch:cy+ch, cx-cw:cx+cw].reshape(-1, 3)
        b_top = arr[:bw, :].reshape(-1, 3)
        b_bot = arr[h-bw:, :].reshape(-1, 3)
        border_small = np.concatenate([b_top, b_bot])
        if len(center) > 0 and len(border_small) > 0:
            center_mean = center.mean(axis=0)
            border_mean = border_small.mean(axis=0)
            diff = float(np.linalg.norm(center_mean - border_mean))
            center_score = min(1.0, diff / 100.0)
        else:
            center_score = 0.5

        # --- flat_lay: разнообразие цветов в центре (вещь, не манекен) ---
        center_region = arr[cy-h//4:cy+h//4, cx-w//4:cx+w//4]
        quantized = (center_region // 32).astype(np.uint8)
        unique_bins = len(np.unique(quantized.reshape(-1, 3), axis=0))
        total_bins = max(len(quantized.reshape(-1, 3)), 1)
        diversity = unique_bins / total_bins
        if diversity < 0.1:
            flat_score = 0.3
        elif diversity > 0.6:
            flat_score = 0.4
        else:
            flat_score = 0.7 + (1.0 - abs(diversity - 0.3) * 2.0) * 0.3
        flat_score = max(0.0, min(1.0, flat_score))

        # --- not_size_chart: мало резких переходов яркости ---
        brightness = 0.299 * R + 0.587 * G + 0.114 * B
        diffs = np.abs(np.diff(brightness.ravel()))
        avg_diff = float(diffs.mean()) if len(diffs) > 0 else 0.0
        chart_score = max(0.0, 1.0 - avg_diff / 30.0)

        # --- cropped: края кадра не слишком однородные (значит вещь не обрезана) ---
        edge = np.concatenate([
            arr[:bw, :].reshape(-1, 3),
            arr[h-bw:, :].reshape(-1, 3),
            arr[:, :bw].reshape(-1, 3),
            arr[:, w-bw:].reshape(-1, 3),
        ])
        edge_std = float(edge.std(axis=0).mean())
        cropped_score = min(1.0, edge_std / 40.0)

        # --- lighting: хорошая освещённость ---
        mean_b = float(brightness.mean())
        if mean_b < 60:
            lighting_score = 0.3
        elif mean_b > 230:
            lighting_score = 0.4
        else:
            std_b = float(brightness.std())
            lighting_score = 0.9 if std_b < 30 else 0.8 if std_b < 60 else 0.6

        return {
            "no_model":      no_model_score,
            "background":    bg_score,
            "center":        center_score,
            "flat_lay":      flat_score,
            "not_size_chart": chart_score,
            "cropped":       cropped_score,
            "lighting":      lighting_score,
        }

    def _quick_score_legacy(self, pixels: list, w: int, h: int) -> Dict[str, float]:
        """Fallback без NumPy — оригинальный медленный метод."""
        model_indicators = self._detect_model_indicators(pixels, w, h)
        no_model_score = max(0.0, min(1.0, 1.0 - model_indicators * 2.0))
        bg_score = self._score_background_uniformity(pixels, w, h)
        center_score = self._score_center_position(pixels, w, h)
        flat_score = self._score_flat_lay_quality(pixels, w, h)
        chart_score = self._score_not_size_chart(pixels, w, h)
        cropped_score = self._score_not_cropped(pixels, w, h)
        lighting_score = self._score_lighting(pixels, w, h)
        return {
            "no_model": no_model_score, "background": bg_score,
            "center": center_score, "flat_lay": flat_score,
            "not_size_chart": chart_score, "cropped": cropped_score,
            "lighting": lighting_score,
        }
    
    def _detect_model_indicators(self, pixels: list, w: int, h: int) -> float:
        """Определяет вероятность наличия человека (0.0-1.0)."""
        step = 15
        sampled = pixels[::step]
        if not sampled or len(sampled) < 10:
            return 0.5
        
        total = len(sampled)
        skin_pixels = 0
        warm_pixels = 0
        
        for r, g, b in sampled:
            is_skin = (r > 95 and g > 80 and b > 70
                       and r > g and r > b
                       and (r - g) > 15 and (r - b) > 20
                       and g > b
                       and 90 < r < 230 and 75 < g < 215 and 65 < b < 200
                       and abs(r - g) < 60)
            if is_skin:
                skin_pixels += 1
            
            is_warm = (r > 80 and g > 60 and b > 50
                       and r > g and r > b
                       and (r + g + b) / 3 > 70)
            if is_warm:
                warm_pixels += 1
        
        skin_ratio = skin_pixels / total
        warm_ratio = warm_pixels / total
        
        skin_score = min(1.0, skin_ratio * 80.0)
        warm_score = min(1.0, warm_ratio * 15.0)
        
        result = (skin_score * 0.6 + warm_score * 0.4)
        return min(1.0, max(0.0, result))
    
    def _score_background_uniformity(self, pixels: list, w: int, h: int) -> float:
        border_w = max(5, min(w, h) // 20)
        border_r, border_g, border_b = [], [], []
        
        for y in range(border_w):
            for x in range(w):
                r, g, b = pixels[y * w + x]
                border_r.append(r); border_g.append(g); border_b.append(b)
        for y in range(h - border_w, h):
            for x in range(w):
                r, g, b = pixels[y * w + x]
                border_r.append(r); border_g.append(g); border_b.append(b)
        for y in range(border_w, h - border_w):
            for x in range(border_w):
                r, g, b = pixels[y * w + x]
                border_r.append(r); border_g.append(g); border_b.append(b)
            for x in range(w - border_w, w):
                r, g, b = pixels[y * w + x]
                border_r.append(r); border_g.append(g); border_b.append(b)
        
        if not border_r:
            return 0.5
        
        def std(vals):
            if len(vals) < 2: return 0
            m = sum(vals) / len(vals)
            return (sum((x - m) ** 2 for x in vals) / len(vals)) ** 0.5
        
        avg_std = (std(border_r) + std(border_g) + std(border_b)) / 3
        return max(0.0, 1.0 - avg_std / 60.0)
    
    def _score_center_position(self, pixels: list, w: int, h: int) -> float:
        cx, cy = w // 2, h // 2
        cw, ch = w // 4, h // 4
        
        center_pixels = []
        for y in range(cy - ch, cy + ch):
            for x in range(cx - cw, cx + cw):
                if 0 <= y < h and 0 <= x < w:
                    center_pixels.append(pixels[y * w + x])
        
        if not center_pixels: return 0.5
        
        r_c = sum(p[0] for p in center_pixels) / len(center_pixels)
        g_c = sum(p[1] for p in center_pixels) / len(center_pixels)
        b_c = sum(p[2] for p in center_pixels) / len(center_pixels)
        
        border_w = max(5, min(w, h) // 20)
        border_pixels = []
        for y in range(border_w):
            for x in range(w): border_pixels.append(pixels[y * w + x])
        for y in range(h - border_w, h):
            for x in range(w): border_pixels.append(pixels[y * w + x])
        
        if not border_pixels: return 0.5
        
        r_b = sum(p[0] for p in border_pixels) / len(border_pixels)
        g_b = sum(p[1] for p in border_pixels) / len(border_pixels)
        b_b = sum(p[2] for p in border_pixels) / len(border_pixels)
        
        diff = ((r_c - r_b) ** 2 + (g_c - g_b) ** 2 + (b_c - b_b) ** 2) ** 0.5
        return min(1.0, diff / 100.0)
    
    def _score_flat_lay_quality(self, pixels: list, w: int, h: int) -> float:
        cy, cx = h // 2, w // 2
        half = min(h, w) // 4
        
        center_region = []
        for y in range(cy - half, cy + half):
            for x in range(cx - half, cx + half):
                if 0 <= y < h and 0 <= x < w:
                    center_region.append(pixels[y * w + x])
        
        if not center_region: return 0.5
        
        bins = set()
        for r, g, b in center_region:
            bk = (r // 32, g // 32, b // 32)
            bins.add(bk)
        
        diversity = len(bins) / max(len(center_region), 1)
        
        if diversity < 0.1: return 0.3
        elif diversity > 0.6: return 0.4
        else: return 0.7 + (1.0 - abs(diversity - 0.3) * 2.0) * 0.3
        
        return max(0.0, min(1.0, diversity))
    
    def _score_not_size_chart(self, pixels: list, w: int, h: int) -> float:
        brightness = [0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] for p in pixels]
        diffs = [abs(brightness[i] - brightness[i-1]) for i in range(1, len(brightness))]
        
        if not diffs: return 0.5
        
        avg_diff = sum(diffs) / len(diffs)
        return max(0.0, 1.0 - avg_diff / 30.0)
    
    def _score_not_cropped(self, pixels: list, w: int, h: int) -> float:
        border_w = max(5, min(w, h) // 15)
        edge_pixels = []
        
        for y in range(border_w):
            for x in range(w): edge_pixels.append(pixels[y * w + x])
        for y in range(h - border_w, h):
            for x in range(w): edge_pixels.append(pixels[y * w + x])
        for y in range(border_w, h - border_w):
            for x in range(border_w): edge_pixels.append(pixels[y * w + x])
            for x in range(w - border_w, w): edge_pixels.append(pixels[y * w + x])
        
        if not edge_pixels: return 0.5
        
        edge_r = [p[0] for p in edge_pixels]
        edge_g = [p[1] for p in edge_pixels]
        edge_b = [p[2] for p in edge_pixels]
        
        def std(vals):
            if len(vals) < 2: return 0
            m = sum(vals) / len(vals)
            return (sum((x - m) ** 2 for x in vals) / len(vals)) ** 0.5
        
        edge_std = (std(edge_r) + std(edge_g) + std(edge_b)) / 3
        return min(1.0, edge_std / 40.0)
    
    def _score_lighting(self, pixels: list, w: int, h: int) -> float:
        brightness = [0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] for p in pixels]
        
        if not brightness: return 0.5
        
        mean_brightness = sum(brightness) / len(brightness)
        
        if mean_brightness < 60: return 0.3
        elif mean_brightness > 230: return 0.4
        
        variance = sum((x - mean_brightness) ** 2 for x in brightness) / len(brightness)
        std_brightness = variance ** 0.5
        
        if std_brightness < 30: return 0.9
        elif std_brightness < 60: return 0.8
        else: return 0.6
    
    def _compute_composite(self, criteria: Dict[str, float]) -> float:
        score = 0.0
        for key, weight in WEIGHTS.items():
            val = criteria.get(key, 0.5)
            score += val * weight
        return min(1.0, max(0.0, score))
    
    def _deduplicate(self, scores: list) -> list:
        seen = {}
        for s in scores:
            if s.index not in seen:
                seen[s.index] = s
        return list(seen.values())
    
    def get_best_photos(self, scores: list[PhotoScore], count: int = 1) -> list[PhotoScore]:
        """Возвращает лучшие фото. Теперь полностью доверяем итоговому скору ИИ (без жесткого VETO)."""
        if not scores:
            return []
            
        return scores[:count]