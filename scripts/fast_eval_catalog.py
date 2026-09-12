"""
Fast concurrent evaluation of all catalog products with Local AI.
Extracts best photos, saves scores in SQLite ai_card_ratings, and caches images.
"""
import asyncio
import json
import time
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.wb.ai_card_service import ai_card_service
from src.database.db import get_all_ai_ratings

async def main():
    with open("data/new_products.json", "r", encoding="utf-8") as f:
        products = json.load(f)

    rated = get_all_ai_ratings()
    unrated = [p["article"] for p in products if p["article"] not in rated]
    total = len(unrated)
    print(f"Starting batch AI evaluation for {total} unrated catalog products...")

    sem = asyncio.Semaphore(6)
    completed = 0
    with_card_count = 0
    t0 = time.time()

    async def worker(art: int):
        nonlocal completed, with_card_count
        async with sem:
            try:
                res = await ai_card_service.evaluate_article(art)
                completed += 1
                if res.get("has_card"):
                    with_card_count += 1
                if completed % 10 == 0 or completed == total:
                    elapsed = time.time() - t0
                    speed = completed / max(0.1, elapsed)
                    print(f"[{completed}/{total}] ({speed:.1f} art/s) - Art {art}: status={res.get('status')}, score={res.get('best_score')}%, idx={res.get('best_index')}")
            except Exception as e:
                print(f"Error evaluating {art}: {e}")
                completed += 1

    tasks = [asyncio.create_task(worker(art)) for art in unrated]
    await asyncio.gather(*tasks)

    elapsed = time.time() - t0
    print(f"\nFinished evaluating {total} products in {elapsed:.1f}s.")
    print(f"Total with card: {with_card_count}, without card: {total - with_card_count}")

if __name__ == "__main__":
    asyncio.run(main())
