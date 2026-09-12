#!/usr/bin/env python3
"""
============================================================
    Wildberries Image Finder & Downloader
    Надежная система скачивания фотографий товаров
    
    Features:
    - Кэширование basket -> nmID mapping
    - Перебор корзин 01-30 при отсутствии в кэше  
    - Поддержка всех размеров изображений
    - Retry с exponential backoff
    - Connection pooling
    - User-Agent rotation
    
    Author: WB UP Team
============================================================
"""

import asyncio
import aiohttp
import json
import time
import logging
from pathlib import Path
from typing import Optional, Dict, List, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
from functools import lru_cache

# Fix Windows console encoding
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

logger = logging.getLogger(__name__)


# ============================================================
# Constants
# ============================================================
BASKET_RANGE = list(range(1, 100))  # basket-01 ... basket-99
IMAGE_SIZES = ['big', 'large', 'c516x688', 'tm', 'original']
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]

HTTP_TIMEOUT = aiohttp.ClientTimeout(total=10, connect=5, sock_read=5)
MAX_RETRIES = 3
RETRY_BACKOFF = 0.5


# ============================================================
# Data Models
# ============================================================
class PhotoSize(Enum):
    BIG = "big"
    LARGE = "large"
    C516X688 = "c516x688"
    TM = "tm"
    ORIGINAL = "original"


@dataclass
class PhotoURL:
    """URL фотографии с метаданными."""
    article: int
    index: int
    basket: int
    size: PhotoSize
    url: str
    exists: bool = False
    local_path: Optional[Path] = None
    
    @property
    def path_img(self) -> str:
        vol = self.article // 100000
        part = self.article // 1000
        return f"/vol{vol}/part{part}/{self.article}/images/{self.size.value}/{self.index}.webp"


@dataclass  
class ArticleInfo:
    """Информация о товаре."""
    article: int
    vol: int = field(init=False)
    part: int = field(init=False)
    discovered_baskets: List[int] = field(default_factory=list)
    
    def __post_init__(self):
        self.vol = self.article // 100000
        self.part = self.article // 1000


# ============================================================
# Cache Manager
# ============================================================
class CacheManager:
    """Управление кэшем basket -> nmID mapping."""
    
    def __init__(self, cache_file: Path):
        self.cache_file = cache_file
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        self._cache: Dict[int, List[int]] = {}
        self._load()
    
    def _load(self):
        """Загружаем кэш из файла."""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    self._cache = json.load(f)
                logger.info(f"Loaded cache: {len(self._cache)} articles")
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Failed to load cache: {e}")
                self._cache = {}
    
    def _save(self):
        """Сохраняем кэш в файл."""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self._cache, f, ensure_ascii=False, indent=2)
        except IOError as e:
            logger.error(f"Failed to save cache: {e}")
    
    def get_baskets(self, article: int) -> List[int]:
        """Получаем Known baskets для статьи."""
        return self._cache.get(article, [])
    
    def add_basket(self, article: int, basket: int):
        """Добавляем найденный basket."""
        if article not in self._cache:
            self._cache[article] = []
        if basket not in self._cache[article]:
            self._cache[article].append(basket)
            self._save()  # Сохраняем после каждого добавления
    
    def has_any_basket(self, article: int) -> bool:
        """Проверяем есть ли хотя бы один known basket."""
        return article in self._cache and len(self._cache[article]) > 0
    
    def remove_basket(self, article: int, basket: int):
        """Удаляем basket из кэша."""
        if article in self._cache:
            if basket in self._cache[article]:
                self._cache[article].remove(basket)
                if not self._cache[article]:
                    del self._cache[article]
                self._save()


# ============================================================
# WB Client
# ============================================================
class WBClient:
    """Клиент для работы с Wildberries API."""
    
    def __init__(self, session: Optional[aiohttp.ClientSession] = None):
        self._session = session
        self._owns_session = session is None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Получаем HTTP сессию."""
        if self._session is None:
            connector = aiohttp.TCPConnector(
                limit=100,
                limit_per_host=10,
                ttl_dns_cache=300,
                use_dns_cache=True,
            )
            self._session = aiohttp.ClientSession(
                connector=connector,
                timeout=HTTP_TIMEOUT,
            )
        return self._session
    
    async def close(self):
        """Закрываем сессию."""
        if self._session and self._owns_session:
            await self._session.close()
    
    async def check_url_exists(self, url: str) -> bool:
        """Проверяет существование URL через GET с ранним выходом."""
        session = await self._get_session()
        
        for attempt in range(MAX_RETRIES):
            try:
                async with session.get(url, allow_redirects=True) as resp:
                    # Читаем только первый килобайт
                    _ = await resp.content.read(1024)
                    content_type = resp.headers.get('Content-Type', '')
                    content_length = resp.headers.get('Content-Length')
                    
                    # Проверяем что это изображение и не ошибка HTML
                    is_image = 'image' in content_type or 'webp' in content_type or 'jpeg' in content_type
                    not_html = 'text/html' not in content_type
                    
                    if resp.status == 200 and is_image and not_html:
                        return True
                    
                    return False
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                logger.debug(f"Check failed (attempt {attempt+1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_BACKOFF * (2 ** attempt))
        return False
    
    async def download_photo(self, url: str, output_path: Path) -> bool:
        """Скачивает фотографию и сохраняет."""
        session = await self._get_session()
        
        for attempt in range(MAX_RETRIES):
            try:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        output_path.parent.mkdir(parents=True, exist_ok=True)
                        content = await resp.read()
                        output_path.write_bytes(content)
                        return True
                    else:
                        logger.debug(f"Download failed status={resp.status}")
                        return False
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                logger.debug(f"Download failed (attempt {attempt+1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_BACKOFF * (2 ** attempt))
        return False


# ============================================================
# WBImageFinder
# ============================================================
class WBImageFinder:
    """Находит работающие корзины для товаров WB."""
    
    def __init__(self, client: WBClient, cache: CacheManager):
        self.client = client
        self.cache = cache
    
    def _build_url(self, article: int, basket: int, size: PhotoSize, index: int) -> str:
        """Строит URL для проверки корзины."""
        vol = article // 100000
        part = article // 1000
        
        # Пробуем в порядке надежности: wbbasket.ru -> wb.ru -> wildberries.ru
        variants = [
            f"https://basket-{basket:02d}.wbbasket.ru/vol{vol}/part{part}/{article}/images/{size.value}/{index}.webp",
            f"https://basket-{basket:02d}.wb.ru/vol{vol}/part{part}/{article}/images/{size.value}/{index}.webp",
            f"https://basket-{basket:02d}.wildberries.ru/vol{vol}/part{part}/{article}/images/{size.value}/{index}.webp",
        ]
        return variants[0]  # Используем wbbasket.ru как наиболее стабильный
    
    async def find_baskets(
        self, 
        article: int, 
        test_indices: int = 3,
        sizes: Optional[List[PhotoSize]] = None
    ) -> List[int]:
        """
        Находит работающие корзины для статьи.
        
        Args:
            article: nmID артикул
            test_indices: сколько индексов фото тестировать
            sizes: какие размеры проверять
            
        Returns:
            Список найденных basket
        """
        if sizes is None:
            sizes = [PhotoSize.BIG]
        
        # Проверяем кэш первым
        cached_baskets = self.cache.get_baskets(article)
        if cached_baskets:
            logger.info(f"Checking cached baskets for {article}: {cached_baskets}")
            valid_cached = await self._validate_baskets(article, cached_baskets, sizes, test_indices)
            if valid_cached:
                return valid_cached
        
        # Сначала проверяем динамически вычисленные корзины (работает для любых артикулов, в т.ч. 1B+)
        try:
            from src.wb.catalog import _estimate_baskets
            estimated = _estimate_baskets(article)
        except Exception:
            estimated = []

        all_baskets = [b for b in estimated if b not in cached_baskets and 1 <= b <= 300]
        # Check BASKET_RANGE which should now be up to 300
        for b in range(1, 301):
            if b not in all_baskets and b not in cached_baskets:
                all_baskets.append(b)

        logger.info(f"No valid cached baskets for {article}, testing candidate baskets (prioritizing {estimated[:4]})")
        
        found = await self._test_all_baskets(article, all_baskets, sizes, test_indices)
        
        # Добавляем к кэшированным
        if cached_baskets:
            found = cached_baskets + found
        
        return found
    
    async def _validate_baskets(
        self,
        article: int,
        baskets: List[int],
        sizes: List[PhotoSize],
        test_indices: int
    ) -> List[int]:
        """Валидирует корзины из кэша."""
        valid = []
        
        for basket in baskets:
            if await self._is_basket_valid(article, basket, sizes, test_indices):
                valid.append(basket)
        
        return valid
    
    async def _test_all_baskets(
        self,
        article: int,
        baskets: List[int],
        sizes: List[PhotoSize],
        test_indices: int
    ) -> List[int]:
        """Тестируем список корзин максимально конкурентно."""
        valid = []
        session = await self.client._get_session()
        
        # We only need the first size and first index to determine if a basket works
        size = sizes[0] if sizes else PhotoSize.BIG
        idx = 1
        
        sem = asyncio.Semaphore(30)
        
        async def fast_check(b: int) -> Optional[int]:
            async with sem:
                url = self._build_url(article, b, size, idx)
                try:
                    # Fast timeout, no retries
                    async with session.get(url, timeout=5.0, allow_redirects=True) as resp:
                        _ = await resp.content.read(1024)
                        content_type = resp.headers.get('Content-Type', '')
                        is_image = 'image' in content_type or 'webp' in content_type or 'jpeg' in content_type
                        not_html = 'text/html' not in content_type
                        
                        if resp.status == 200 and is_image and not_html:
                            return b
                except Exception:
                    pass
                return None

        # Test all baskets concurrently with a limit
        tasks = [fast_check(b) for b in baskets]
        for coro in asyncio.as_completed(tasks):
            res = await coro
            if res is not None:
                valid.append(res)
                self.cache.add_basket(article, res)
                logger.info(f"  ✅ Found working basket: {res}")
                break  # We only need ONE working basket!
                
        return valid

    async def _is_basket_valid(
        self,
        article: int,
        basket: int,
        sizes: List[PhotoSize],
        test_indices: int
    ) -> bool:
        """(Устарело) Оставлено для совместимости."""
        return False


# ============================================================
# WBImageDownloader
# ============================================================
class WBImageDownloader:
    """Скачивает и сохраняет фотографии товаров."""
    
    def __init__(self, client: WBClient, finder: WBImageFinder, output_dir: Path):
        self.client = client
        self.finder = finder
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def _photo_filename(self, article: int, index: int, basket: int, size: PhotoSize) -> str:
        """Формирует имя файла."""
        return f"{article}_idx{index}_{basket}_{size.value}.webp"
    
    async def download_article_photos(
        self,
        article: int,
        max_indexes: int = 15,
        max_baskets: int = 2,
        sizes: Optional[List[PhotoSize]] = None
    ) -> List[Path]:
        """
        Скачивает все фотографии статьи.
        
        Args:
            article: nmID
            max_indexes: макс количество индексов
            max_baskets: сколько корзин использовать
            sizes: какие размеры скачивать
            
        Returns:
            Список сохраненных файлов
        """
        if sizes is None:
            sizes = IMAGE_SIZES  # Use default sizes
        
        photo_sizes = [PhotoSize(s) for s in sizes]
        
        # Находим рабочие корзины
        baskets = await self.finder.find_baskets(article, test_indices=3, sizes=[PhotoSize.BIG])
        
        if not baskets:
            logger.warning(f"No baskets found for article {article}")
            return []
        
        # Ограничиваем количество корзин
        baskets = baskets[:max_baskets]
        logger.info(f"Using baskets {baskets} for article {article}")
        
        downloaded = []
        
        for basket in baskets:
            for size_enum in photo_sizes:
                for idx in range(1, max_indexes + 1):
                    url = self.finder._build_url(article, basket, size_enum, idx)
                    filename = self._photo_filename(article, idx, basket, size_enum)
                    output_path = self.output_dir / filename
                    
                    # Пропускаем если уже существует
                    if output_path.exists():
                        downloaded.append(output_path)
                        continue
                    
                    # Скачиваем
                    if await self.client.download_photo(url, output_path):
                        downloaded.append(output_path)
                        logger.debug(f"  Downloaded: {filename}")
        
        logger.info(f"Downloaded {len(downloaded)} photos for article {article}")
        return downloaded


# ============================================================
# WBImageService — Main orchestrator
# ============================================================
class WBImageService:
    """Главный сервис для работы с изображениями WB."""
    
    def __init__(self, cache_file: Path, output_dir: Path):
        self.cache = CacheManager(cache_file)
        self.client = WBClient()
        self.finder = WBImageFinder(self.client, self.cache)
        self.downloader = WBImageDownloader(self.client, self.finder, output_dir)
    
    async def process_article(
        self,
        article: int,
        max_indexes: int = 15,
        output_dir: Optional[Path] = None
    ) -> List[Path]:
        """
        Полный цикл обработки статьи:
        1. Найти basket через кэш или перебор
        2. Скачать все фотографии
        
        Returns:
            Список скачанных файлов
        """
        target_dir = output_dir or self.downloader.output_dir
        
        logger.info(f"Processing article {article}")
        
        downloaded = await self.downloader.download_article_photos(
            article,
            max_indexes=max_indexes,
            max_baskets=2,  # Достаточно 2 рабочих корзин
            sizes=['big', 'large']  # Основные размеры
        )
        
        return downloaded
    
    async def shutdown(self):
        """Очищаем ресурсы."""
        await self.client.close()


# ============================================================
# Async Helper Functions
# ============================================================
async def download_single_article(
    article: int,
    output_dir: Path,
    cache_file: Path,
    max_indexes: int = 15
) -> List[Path]:
    """
    Утилита для скачивания одной статьи.
    
    Usage:
        photos = await download_single_article(445436608, output_dir)
    """
    service = WBImageService(cache_file, output_dir)
    try:
        return await service.process_article(article, max_indexes)
    finally:
        await service.shutdown()


async def download_multiple_articles(
    articles: List[int],
    output_dir: Path,
    cache_file: Path,
    max_indexes: int = 15
) -> Dict[int, List[Path]]:
    """
    Скачивает фотографии для нескольких статей.
    
    Returns:
        Словарь {article: [photos]}
    """
    service = WBImageService(cache_file, output_dir)
    results = {}
    
    try:
        for article in articles:
            photos = await service.process_article(article, max_indexes)
            results[article] = photos
    finally:
        await service.shutdown()
    
    return results


# ============================================================
# CLI Entry Point
# ============================================================
def main():
    """CLI интерфейс."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Download WB product photos')
    parser.add_argument('articles', nargs='+', type=int, help='Article numbers')
    parser.add_argument('--max-indexes', type=int, default=15, help='Max photo indexes')
    parser.add_argument('--output-dir', type=Path, default=Path('data/images/annotator_articles'))
    parser.add_argument('--cache-file', type=Path, default=Path('data/images/basket_cache.json'))
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)
    
    asyncio.run(download_multiple_articles(
        args.articles,
        args.output_dir,
        args.cache_file,
        args.max_indexes
    ))


if __name__ == '__main__':
    main()