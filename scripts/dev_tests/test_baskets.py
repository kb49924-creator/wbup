import aiohttp
import asyncio

async def test_article(article):
    vol = article // 100000
    part = article // 1000
    path = f"/vol{vol}/part{part}/{article}/images/big/1.webp"
    
    async with aiohttp.ClientSession() as session:
        for b in range(1, 65):
            url = f"https://basket-{b:02d}.wbbasket.ru{path}"
            try:
                async with session.head(url, timeout=2) as resp:
                    if resp.status == 200:
                        print(f"Found {article} on basket-{b}!")
                        return b
            except Exception:
                pass
            
            url2 = f"https://basket-{b:02d}.wb.ru{path}"
            try:
                async with session.head(url2, timeout=2) as resp:
                    if resp.status == 200:
                        print(f"Found {article} on {url2}!")
                        return b
            except Exception:
                pass
    print(f"Article {article} not found in baskets 1-64")
    return None

asyncio.run(test_article(1011302912))
