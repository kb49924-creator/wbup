from __future__ import annotations

import glob
import os
import re
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List

import aiohttp
from src.utils.logger import get_logger
from src.database import db
from src.wb.local_ai_ranker import local_ai

logger = get_logger("ai_card_service")

ORIGINAL_IMAGES_DIR = Path("data/images/original")
MIN_ACCEPTABLE_SCORE = 0.50  # 50% порог одобрения ИИ


class AICardService:
    """Сервис отбора и кэширования лучших фотографий товаров через локальный ИИ."""

    def __init__(self, original_dir: Optional[Path] = None):
        self.original_dir = original_dir or ORIGINAL_IMAGES_DIR
        self.original_dir.mkdir(parents=True, exist_ok=True)
        self._is_syncing = False

    def sync_cached_photos(self) -> dict:
        """Сканирует локально сохранённые фото в data/images/original/ и оценивает их через ИИ."""
        if not local_ai.is_trained:
            logger.warning("Local AI model is not trained yet — cannot sync cached photos")
            return {"synced": 0, "total": 0}

        # Находим все файлы в папке original
        files = glob.glob(str(self.original_dir / "*.*"))
        by_article: Dict[int, List[str]] = {}

        for fpath in files:
            fname = os.path.basename(fpath)
            match = re.match(r"^(\d+)", fname)
            if match:
                art = int(match.group(1))
                if art not in by_article:
                    by_article[art] = []
                by_article[art].append(fpath)

        already_rated = db.get_all_ai_ratings()
        synced_count = 0
        new_rated = 0

        for art, paths in by_article.items():
            if art in already_rated and already_rated[art].get("best_path") and os.path.exists(already_rated[art]["best_path"]):
                synced_count += 1
                continue

            best_score = -1.0
            best_path = paths[0]
            best_idx = 1

            for p in paths:
                try:
                    s = local_ai.predict_score(p)
                except Exception as e:
                    logger.debug("Error scoring %s: %s", p, e)
                    s = 0.0

                if s > best_score:
                    best_score = s
                    best_path = p
                    idx_match = re.search(r"_idx(\d+)", os.path.basename(p))
                    if idx_match:
                        best_idx = int(idx_match.group(1))
                    else:
                        best_idx = 1

            has_card = best_score >= MIN_ACCEPTABLE_SCORE
            db.save_ai_rating(
                article=art,
                best_path=best_path,
                best_index=best_idx,
                best_score=max(0.0, best_score),
                has_card=has_card,
                total_photos=len(paths)
            )
            synced_count += 1
            new_rated += 1

        logger.info("AI Card sync complete: %d articles ready (%d freshly rated)", synced_count, new_rated)
        return {"synced": synced_count, "new_rated": new_rated, "total": len(by_article)}

    async def evaluate_article(self, article: int, force: bool = False) -> dict:
        """Оценивает фотографии артикула и находит лучшую карточку для поста."""
        art = int(article)

        # 1. Проверяем кэш базы данных
        if not force:
            existing = db.get_ai_rating(art)
            if existing and existing.get("best_path") and os.path.exists(existing["best_path"]):
                return {
                    "article": art,
                    "best_path": existing["best_path"],
                    "best_index": existing["best_index"],
                    "best_score": existing["best_score"],
                    "has_card": existing["has_card"],
                    "status": "ok" if existing["has_card"] else "rejected",
                    "total_photos": existing.get("total_photos", 1),
                }

        # 2. Проверяем, есть ли уже скачанные фото на диске
        disk_photos = glob.glob(str(self.original_dir / f"{art}_*.webp"))
        if not disk_photos:
            disk_photos = glob.glob(str(self.original_dir / f"{art}.*"))

        # 3. Если на диске нет фото, пробуем быстро скачать через fast_image_manager
        if not disk_photos:
            try:
                from src.wb.fast_image_manager import fast_image_manager
                b, _ = await fast_image_manager.find_basket_and_photo(art)
                if b:
                    vol = art // 100000
                    part = art // 1000
                    session = await fast_image_manager.get_session()
                    for idx in range(1, 10):
                        url = f"https://basket-{b:02d}.wbbasket.ru/vol{vol}/part{part}/{art}/images/big/{idx}.webp"
                        try:
                            async with session.get(url, timeout=aiohttp.ClientTimeout(total=1.8)) as r:
                                if r.status == 200:
                                    img_bytes = await r.read()
                                    save_path = str(self.original_dir / f"{art}_idx{idx}_{b}_big.webp")
                                    with open(save_path, "wb") as f:
                                        f.write(img_bytes)
                                    disk_photos.append(save_path)
                                elif r.status == 404 and idx > 3:
                                    break
                        except Exception:
                            pass
            except Exception as e:
                logger.debug("Fast basket download failed for article=%d: %s", art, e)

        # 4. Если всё ещё нет фото — пробуем SmartPhotoRanker
        if not disk_photos:
            try:
                from src.wb.photo_ranker import SmartPhotoRanker
                ranker = SmartPhotoRanker(output_dir=self.original_dir)
                ranked_results = await ranker.rank_article_photos(art, max_indexes=15)
                if ranked_results:
                    for p in ranked_results:
                        if p.path.exists():
                            disk_photos.append(str(p.path))
            except Exception as e:
                logger.error("Failed to rank photos for article=%d: %s", art, e)

        # 4. Если фото есть на диске — прогоняем через модель ИИ
        best_score = -1.0
        best_path = disk_photos[0] if disk_photos else ""
        best_idx = 1

        for p in disk_photos:
            try:
                s = local_ai.predict_score(p)
            except Exception:
                s = 0.0

            if s > best_score:
                best_score = s
                best_path = p
                idx_match = re.search(r"_idx(\d+)", os.path.basename(p))
                best_idx = int(idx_match.group(1)) if idx_match else 1

        score_val = max(0.0, best_score if best_score >= 0 else 0.0)
        has_card = score_val >= MIN_ACCEPTABLE_SCORE
        res = db.save_ai_rating(
            article=art,
            best_path=best_path,
            best_index=best_idx,
            best_score=score_val,
            has_card=has_card,
            total_photos=len(disk_photos)
        )

        return {
            "article": art,
            "best_path": best_path,
            "best_index": best_idx,
            "best_score": res["best_score"],
            "has_card": has_card,
            "status": "ok" if has_card else "rejected",
            "total_photos": len(disk_photos)
        }

    def get_best_photo_path(self, article: int) -> Optional[Path]:
        """Возвращает путь к лучшему фото от ИИ, если оно существует."""
        rating = db.get_ai_rating(article)
        if rating and rating.get("best_path"):
            p = Path(rating["best_path"])
            if p.exists():
                return p
        return None

    def get_card_metadata(self, article: int, rating: Optional[dict] = None) -> dict:
        """Возвращает статус карточки для передачи в JSON товара."""
        r = rating if rating is not None else db.get_ai_rating(article)
        if not r:
            return {
                "status": "pending",
                "has_card": False,
                "score": None,
                "index": None,
            }

        return {
            "status": "ok" if r["has_card"] else "rejected",
            "has_card": r["has_card"],
            "score": r["best_score"],
            "index": r["best_index"],
        }


ai_card_service = AICardService()
