"""
Сборка финального изображения для публикации.

Оркестрирует полный цикл:
1. Умное скачивание и выбор фото через SmartPhotoRanker
2. Удалить фон через BackgroundRemover (rembg)
3. Собрать коллаж на фоне через CardTemplate
"""

from __future__ import annotations
import asyncio
import time
from pathlib import Path

from src.config import IMAGES_DIR, NO_BG_DIR, CARDS_DIR
from src.image.background_remover import BackgroundRemover
from src.image.template import CardTemplate
from src.utils.logger import get_logger
from src.wb.photo_ranker import SmartPhotoRanker, PhotoScore

logger = get_logger("renderer")


class ImageRenderer:
    """Оркестрирует полный цикл обработки изображения."""

    def __init__(self):
        self.bg_remover = BackgroundRemover()
        self.template = CardTemplate()
        self.ranker = SmartPhotoRanker()
        self.warnings = []

    def render(self, products: list) -> str | None:
        """Создаёт готовую карточку-коллаж для публикации.

        Полный цикл: скачать+выбрать фото → удалить фон → собрать коллаж на фоне.

        Args:
            products: Список объектов Product.

        Returns:
            Путь к готовой карточке или None при ошибке.
        """
        if not products:
            logger.warning("No products to render")
            return None

        overall_start = time.time()
        
        product_names = [p.get('name', p.article) for p in products[:3]]
        names_str = ", ".join(str(n)[:30] for n in product_names)
        if len(products) > 3:
            names_str += f" (+{len(products)-3} more)"
        
        logger.info("")
        logger.info("=" * 70)
        logger.info("🎨 CARD RENDERING STARTED")
        logger.info(f"   Products: {len(products)} | Articles: {[p.article for p in products[:5]]}")
        logger.info(f"   Names: {names_str}")
        logger.info("=" * 70)
        
        # 1. Умное скачивание и выбор лучших фото
        photo_candidates_list = self._download_and_select_photos(products)
        if not photo_candidates_list:
            logger.error("❌ No photos selected for any product")
            logger.info("⏱️  TOTAL TIME: %.1fs", time.time() - overall_start)
            return None

        # 2. Удалить фон с каждого фото (с кэшированием)
        no_bg_paths = self._remove_backgrounds(products, photo_candidates_list)
        if not no_bg_paths:
            logger.error("❌ No photos after background removal")
            logger.info("⏱️  TOTAL TIME: %.1fs", time.time() - overall_start)
            return None
        self.no_bg_paths = no_bg_paths

        # 3. Найти фоновый файл
        bg_path = self._find_background()

        # 4. Собрать коллаж
        CARDS_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = int(time.time())
        output_path = str(CARDS_DIR / f"card_{timestamp}.webp")

        logger.info("")
        logger.info("-" * 70)
        logger.info("📐 STAGE 3/3: Building collage...")
        stage3_start = time.time()
        
        success = self.template.render(
            photo_paths=no_bg_paths,
            output_path=output_path,
            background_path=bg_path,
            products=products,
        )

        if success:
            elapsed = time.time() - overall_start
            logger.info("✅ Card ready: %s", output_path)
            logger.info(f"📦 Size: {Path(output_path).stat().st_size // 1024}KB")
            logger.info("=" * 70)
            logger.info(f"🏁 CARD RENDERING COMPLETE")
            logger.info(f"   ⏱️  TOTAL TIME: {elapsed:.1f}s")
            logger.info(f"   📂 Saved: {output_path}")
            logger.info("=" * 70)
            logger.info("")
            return output_path
        else:
            logger.error("❌ Failed to render card")
            logger.info("⏱️  TOTAL TIME: %.1fs", time.time() - overall_start)
            return None

    # ------------------------------------------------------------
    # Скачивание и выбор фото (SmartPhotoRanker)
    # ------------------------------------------------------------

    def _download_and_select_photos(self, products: list) -> list[list[str]]:
        """Скачивает и выбирает лучшие фото через SmartPhotoRanker.

        v4: все товары ранжируются ПАРАЛЛЕЛЬНО через asyncio.gather —
        вместо последовательного asyncio.run() в цикле.
        """
        logger.info("")
        logger.info("-" * 70)
        logger.info("📥 STAGE 1/3: Smart photo selection (parallel asyncio.gather)...")
        stage1_start = time.time()

        # Собираем артикулы
        articles = []
        for product in products:
            art = getattr(product, 'article', None) or (
                product.get('article') if hasattr(product, 'get') else None
            )
            if art:
                articles.append(art)

        if not articles:
            logger.warning("No products with articles")
            return []

        logger.info("   Ranking %d articles in parallel...", len(articles))

        # Запускаем все coroutines одновременно
        async def run_all_and_cleanup():
            try:
                tasks = [
                    self.ranker.rank_article_photos(art, max_indexes=30)
                    for art in articles
                ]
                return await asyncio.gather(*tasks, return_exceptions=True)
            finally:
                if getattr(self.ranker, '_service', None) is not None:
                    await self.ranker._service.shutdown()

        try:
            all_results = asyncio.run(run_all_and_cleanup())
        except RuntimeError:
            # Если уже есть event loop (напр. в FastAPI) — используем get_event_loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                all_results = loop.run_until_complete(run_all_and_cleanup())
            finally:
                loop.close()

        # Выбираем лучшие фото
        selected_candidates = []
        total = len(articles)

        for i, (art, ranked) in enumerate(zip(articles, all_results), 1):
            if isinstance(ranked, Exception):
                logger.warning("   ❌ [%d/%d] Ranking failed for art=%s: %s", i, total, art, ranked)
                continue

            best = self.ranker.get_best_photos(ranked, count=5)
            if best:
                paths = [str(b.path) for b in best]
                score = best[0].composite_score
                
                # Check if it was essentially rejected by AI
                from src.wb.local_ai_ranker import local_ai
                if local_ai.is_trained and score < 0.5:
                    msg = f"ИИ не нашел хороших фото для артикула {art} (оценка {(score*100):.1f}%). Использовано лучшее из плохих."
                    logger.warning("   ❌ " + msg)
                    self.warnings.append(msg)
                    
                selected_candidates.append(paths)
                status = "✅" if score > 0.6 else "⚠️" if score > 0.4 else "❌"
                logger.info(
                    "   %s [%d/%d] Article %d: score=%.2f, index=%d (%d candidates)",
                    status, i, total, art, score, best[0].index, len(ranked),
                )
            else:
                msg = f"Не удалось найти ни одной фотографии для артикула {art}."
                logger.warning("   ❌ [%d/%d] %s", i, total, msg)
                self.warnings.append(msg)

        elapsed = time.time() - stage1_start
        logger.info("-" * 70)
        logger.info("✅ STAGE 1/3 COMPLETE: %d/%d articles have photos (%.1fs)",
                    len(selected_candidates), len(articles), elapsed)
        logger.info("-" * 70)

        return selected_candidates

    # ------------------------------------------------------------
    # Удаление фона
    # ------------------------------------------------------------

    def _remove_backgrounds(
        self,
        products: list,
        photo_candidates_list: list[list[str]],
    ) -> list[str]:
        """Удаляет фон с каждого фото. Если не получилось, пробует следующее фото. Результаты кэширует."""
        NO_BG_DIR.mkdir(parents=True, exist_ok=True)
        no_bg_paths = []
        total = len(photo_candidates_list)

        logger.info("")
        logger.info("-" * 70)
        logger.info("🖼️  STAGE 2/3: Removing backgrounds...")
        stage2_start = time.time()

        for i, photo_candidates in enumerate(photo_candidates_list, 1):
            if not photo_candidates:
                continue
                
            article = Path(photo_candidates[0]).stem.split("_")[0]
            
            # Мы теперь ПОЛНОСТЬЮ доверяем выбору ИИ и берем только первый (лучший) вариант.
            photo_path = photo_candidates[0]
            idx = Path(photo_path).stem.split("_")[1]
            candidate_no_bg_path = str(NO_BG_DIR / f"{article}_{idx}.png")
            
            logger.info("   🔄 [%d/%d] %s (best candidate, %s) — processing...", i, total, article, idx)
            if self.bg_remover.remove(photo_path, candidate_no_bg_path):
                size_kb = Path(candidate_no_bg_path).stat().st_size // 1024
                logger.info("   ✅ [%d/%d] %s — done (%dKB)", i, total, article, size_kb)
                no_bg_paths.append(candidate_no_bg_path)
            else:
                logger.warning("   ❌ [%d/%d] %s — bg removal failed, falling back to original", i, total, article)
                self.warnings.append(f"Не удалось удалить фон для артикула {article}. Фотография может выглядеть неаккуратно.")
                no_bg_paths.append(photo_path)

        elapsed = time.time() - stage2_start
        logger.info("-" * 70)
        logger.info("✅ STAGE 2/3 COMPLETE: Background removed (%.1fs)", elapsed)
        logger.info("-" * 70)

        return no_bg_paths

    # ------------------------------------------------------------
    # Поиск фонового файла
    # ------------------------------------------------------------

    @staticmethod
    def _find_background() -> str | None:
        """Ищет файл фона в директории LOGO_DIR."""
        logo_dir = IMAGES_DIR / "original" / "logo"
        if not logo_dir.exists():
            logger.debug("Logo directory not found: %s", logo_dir)
            return None

        files = sorted(logo_dir.iterdir())
        if not files:
            logger.debug("No files in logo directory: %s", logo_dir)
            return None

        bg_path = str(files[0])
        logger.info("🎨 Using background: %s", Path(bg_path).name)
        return bg_path