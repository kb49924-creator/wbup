import asyncio
import json
from pathlib import Path
from src.wb.image_finder import WBImageService
from src.utils.logger import get_logger

logger = get_logger("precacher")

async def precache():
    DATA_DIR = Path("/Users/kirill1/Downloads/wb_up/data")
    cache_dir = DATA_DIR / 'images' / 'catalog'
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    products_file = DATA_DIR / 'new_products.json'
    with open(products_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    articles = []
    if isinstance(data, list):
        for item in data:
            if 'article' in item: articles.append(item['article'])
    elif isinstance(data, dict) and 'products' in data:
        for item in data['products']:
            if 'article' in item: articles.append(item['article'])
            
    # Filter out already cached
    to_download = []
    for art in set(articles):
        # check original
        original_dir = DATA_DIR / 'images' / 'original'
        if list(original_dir.glob(f"{art}_*.webp")) or list(original_dir.glob(f"{art}_*.jpg")):
            continue
        # check catalog cache
        if list(cache_dir.glob(f"{art}_*.webp")):
            continue
        to_download.append(art)
        
    if not to_download:
        print("All images are already cached!")
        return
        
    print(f"Need to download {len(to_download)} images...")
    
    service = WBImageService(
        cache_file=DATA_DIR / 'images' / 'basket_cache.json',
        output_dir=cache_dir
    )
    
    # Process them sequentially to avoid overwhelming the connection pool
    for art in to_download:
        try:
            await service.process_article(art, max_indexes=1, output_dir=cache_dir)
            print(f"✅ Cached {art}")
        except Exception as e:
            print(f"❌ Failed {art}: {e}")
            
    print("Pre-caching complete!")

if __name__ == "__main__":
    asyncio.run(precache())
