#!/usr/bin/env python3
"""
Collect all product photos from Wildberries for ML annotation.
Uses the NEW reliable src/wb/image_finder module with wbbasket.ru

Usage:
    python scripts/collect_photos.py              # Use articles.txt
    python scripts/collect_photos.py article1 article2  # Specific articles
    python scripts/collect_photos --from-catalog   # From new_products.json
"""

import asyncio
import sys
import json
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Import new reliable image finder module
from src.wb.image_finder import WBImageService, PhotoSize

# Settings
OUTPUT_DIR = Path("data/images/annotator_articles")
CACHE_FILE = Path("data/images/basket_cache.json")
MAX_INDEXES_PER_PRODUCT = 20

INFO = "[INFO]"
GOOD = "[OK]"
BAD = "[FAIL]"


def load_articles_from_file() -> list:
    """Load articles from articles.txt."""
    articles_file = Path(__file__).parent.parent / "articles.txt"
    if not articles_file.exists():
        return []
    
    articles = []
    for line in articles_file.read_text(encoding='utf-8').strip().split('\n'):
        line = line.strip()
        if line and not line.startswith('#'):
            if 'wildberries.ru' in line or 'catalog.wildberries.ru' in line:
                parts = line.split('/')
                for i, p in enumerate(parts):
                    if p == 'article' and i + 1 < len(parts):
                        articles.append(parts[i+1])
                        break
            else:
                articles.append(line)
    return articles


def load_articles_from_file_path(filepath: str) -> list:
    """Load articles from a text file (one per line)."""
    articles = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    if 'wildberries.ru' in line or 'catalog.wildberries.ru' in line:
                        parts = line.split('/')
                        for i, p in enumerate(parts):
                            if p == 'article' and i + 1 < len(parts):
                                articles.append(parts[i+1])
                                break
                    else:
                        articles.append(line)
    except Exception as e:
        print(f"ERROR loading file {filepath}: {e}")
    return articles


def load_articles_from_catalog() -> list:
    """Load articles from new_products.json."""
    catalog_file = Path(__file__).parent.parent / "data" / "new_products.json"
    if not catalog_file.exists():
        return []
    
    try:
        with open(catalog_file, 'r', encoding='utf-8') as f:
            products = json.load(f)
        return [str(p.get('article')) for p in products if p.get('article')]
    except Exception as e:
        print(f"ERROR loading catalog: {e}")
        return []


MAX_INDEXES_PER_PRODUCT_DEFAULT = 20


def parse_args():
    """Parse command line arguments."""
    args = sys.argv[1:]
    result = {'articles': [], 'source': 'default', 'max_indexes': MAX_INDEXES_PER_PRODUCT_DEFAULT}
    
    i = 0
    positional = []
    while i < len(args):
        if args[i] == '--from-file' and i + 1 < len(args):
            result['source'] = 'from-file'
            result['file_path'] = args[i+1]
            i += 2
        elif args[i] == '--from-catalog':
            result['source'] = 'catalog'
            i += 1
        elif args[i] == '--max-indexes' and i + 1 < len(args):
            try:
                result['max_indexes'] = int(args[i+1])
            except ValueError:
                pass
            i += 2
        elif not args[i].startswith('--'):
            positional.append(args[i])
            i += 1
        else:
            i += 1
    
    if positional:
        result['source'] = 'arguments'
        result['articles'] = positional
    elif result['source'] == 'from-file':
        result['articles'] = load_articles_from_file_path(result.get('file_path', ''))
    elif result['source'] == 'catalog':
        result['articles'] = load_articles_from_catalog()
    else:
        result['articles'] = load_articles_from_file()
    
    return result


async def download_with_reliable_method(articles, max_indexes):
    """Используем новый надежный модуль image_finder для скачивания с wbbasket.ru."""
    print(f"\n{INFO} Using reliable image_finder module with wbbasket.ru")
    print(f"{INFO} Cache file: {CACHE_FILE}")
    print(f"{INFO} Output dir: {OUTPUT_DIR}")
    
    service = WBImageService(cache_file=CACHE_FILE, output_dir=OUTPUT_DIR)
    
    total_downloaded = 0
    total_skipped = 0
    
    try:
        for i, art_str in enumerate(articles, 1):
            art = int(art_str) if art_str.isdigit() else None
            if not art:
                print(f"\nSKIP: {art_str}")
                continue
            
            print(f"\n[{i}/{len(articles)}] Article {art}")
            
            # Проверяем кэш
            cached = service.cache.get_baskets(art)
            if cached:
                print(f"  {INFO} Cached baskets: {cached} — skip basket detection")
            else:
                print(f"  {INFO} No cached basket — auto-detect via wbbasket.ru")
            
            # Скачиваем через новый модуль
            photos = await service.downloader.download_article_photos(
                article=art,
                max_indexes=max_indexes,
                max_baskets=3,  # До 3 корзин для надежности
                sizes=['big', 'large']
            )
            
            if photos:
                total_downloaded += len(photos)
                print(f"  {GOOD} Downloaded {len(photos)} photos")
            else:
                total_skipped += 1
                print(f"  {BAD} No photos found")
        
        # Stats
        all_files = list(OUTPUT_DIR.glob('*.webp'))
        print(f"\n{'=' * 60}")
        print(f"Collection complete!")
        print(f"   New photos downloaded: {total_downloaded}")
        print(f"   Articles skipped: {total_skipped}")
        print(f"   Total .webp files in dir: {len(all_files)}")
        print(f"   Cache entries: {len(service.cache._cache)}")
        print(f"   Saved to: {OUTPUT_DIR}")
        print('=' * 60)
        
    finally:
        await service.shutdown()


def main():
    """Main function."""
    opts = parse_args()
    articles = opts['articles']
    max_idx = opts['max_indexes']
    source = opts['source']
    
    print("=" * 60)
    print("WB Photo Collector — using reliable image_finder module (wbbasket.ru)")
    print("=" * 60)
    
    if source == 'from-file':
        print(f"\n{INFO} Loaded {len(articles)} articles from file")
    elif source == 'catalog':
        print(f"\n{INFO} Loaded {len(articles)} articles from catalog")
    elif source == 'arguments':
        print(f"\n{INFO} Using articles from arguments: {len(articles)}")
    else:
        if not articles:
            print("ERROR: No articles found!")
            print("   Use:")
            print("     python scripts/collect_photos.py article1 article2")
            print("     python scripts/collect_photos.py --from-catalog")
            print("   Or create articles.txt with articles")
            return
        print(f"\n{INFO} Loaded {len(articles)} articles from articles.txt")
    
    # Запускаем новый надежный метод
    asyncio.run(download_with_reliable_method(articles, max_idx))


if __name__ == "__main__":
    asyncio.run(main())