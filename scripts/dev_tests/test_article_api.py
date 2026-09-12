import asyncio
import json
from src.wb.session import AsyncWBSession

async def get_article_details():
    session = AsyncWBSession()
    try:
        url = "https://card.wb.ru/cards/v2/detail?appType=1&dest=-1257786&nm=1011302912"
        data = await session.get_json(url)
        print(json.dumps(data, indent=2, ensure_ascii=False))
    finally:
        await session.close()

asyncio.run(get_article_details())
