#!/usr/bin/env python3
"""
Сбор данных nmID → vol → part → basket для анализа зависимостей.
Загружает реальные данные с Wildberries и сохраняет в JSON.
"""

import asyncio
import aiohttp
import json
from pathlib import Path
import sys
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Test articles with known working baskets
TEST_ARTICLES = [
    # (nmID, known_working_baskets)
    ("445436608", [25]),
    ("445436606", [25]),
]

OUTPUT_FILE = Path("data/images/nmIDs_baskets.json")


def compute_vol_part(nm_id):
    """Вычисляем vol и part из nm_id."""
    nm = int(nm_id)
    vol = nm // 100000
    part = nm // 1000
    return vol, part


async def check_photo_url(session, nm_id, basket, idx=1):
    """Проверяет существует ли фото по данному URL."""
    nm = int(nm_id)
    vol = nm // 100000
    part = nm // 1000
    
    path_img = f"/vol{vol}/part{part}/{nm_id}/images/big/{idx}.webp"
    
    urls = [
        f"https://basket-{basket}.wb.ru{path_img}",
        f"https://basket-{basket}.wbbasket.ru{path_img}",
        f"https://basket-{basket}.wildberries.ru{path_img}",
    ]
    
    for url in urls:
        try:
            timeout = aiohttp.ClientTimeout(total=5)
            async with session.get(url, timeout=timeout, allow_redirects=False) as resp:
                if resp.status == 200:
                    # Проверяем что это не HTML error page
                    content_type = resp.headers.get('Content-Type', '')
                    if 'webp' in content_type or 'image' in content_type:
                        return True
                elif resp.status == 404:
                    continue
        except Exception:
            continue
    
    return False


async def find_baskets_for_article(session, nm_id, test_baskets=None):
    """Находит какие корзины содержат фото для данного артикула."""
    vol, part = compute_vol_part(nm_id)
    
    if test_baskets is None:
        # Тестовый диапазон корзин
        test_baskets = list(range(20, 35))
    
    found_baskets = []
    
    # Проверяем первый индекс фото
    for basket in test_baskets:
        exists = await check_photo_url(session, nm_id, basket, idx=1)
        if exists:
            found_baskets.append(basket)
            print(f"  ✅ nmID={nm_id} basket={basket}")
    
    return found_baskets


async def collect_all_data(articles):
    """Собирает данные для всех статей."""
    print("=" * 70)
    print("WB Basket Data Collector")
    print("=" * 70)
    
    all_data = []
    
    async with aiohttp.ClientSession() as session:
        for i, (nm_id, test_baskets) in enumerate(articles, 1):
            print(f"\n[{i}/{len(articles)}] nmID={nm_id}")
            found = await find_baskets_for_article(session, nm_id, test_baskets)
            
            vol, part = compute_vol_part(nm_id)
            
            for basket in found:
                rec = {
                    "nmID": nm_id,
                    "vol": vol,
                    "part": part,
                    "basket": basket
                }
                all_data.append(rec)
            
            print(f"  Found {len(found)} working baskets")
    
    # Сохраняем результаты
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'=' * 70}")
    print(f"Collected {len(all_data)} records")
    print(f"Saved to: {OUTPUT_FILE}")
    print(f"{'=' * 70}")
    
    return all_data


def generate_synthetic_data():
    """Генерирует синтетические данные если реальные недоступны."""
    print("\nGenerating synthetic data for analysis...")
    
    articles = []
    # Генерируем артикулы из разных диапазонов
    for base in [445436608, 445436606, 884213985, 912771255, 971821617]:
        vol = base // 100000
        part = base // 1000
        
        # Для каждого артикула тестим несколько корзин
        for basket in [23, 24, 25, 26, 27]:
            articles.append({
                "nmID": str(base),
                "vol": vol,
                "part": part,
                "basket": basket
            })
    
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    
    print(f"Generated {len(articles)} synthetic records")
    print(f"Saved to: {OUTPUT_FILE}")
    
    return articles


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Collect basket data from WB')
    parser.add_argument('--articles', nargs='+', help='Specific articles to test')
    parser.add_argument('--synthetic', action='store_true', help='Generate synthetic data')
    args = parser.parse_args()
    
    if args.synthetic:
        data = generate_synthetic_data()
    elif args.articles:
        TEST_ARTICLES = [(a, list(range(20, 35))) for a in args.articles]
        data = asyncio.run(collect_all_data(TEST_ARTICLES))
    else:
        # Default: test known articles
        data = asyncio.run(collect_all_data(TEST_ARTICLES))
    
    print(f"\nDone! Run 'python scripts/analyze_basket.py' to analyze.")