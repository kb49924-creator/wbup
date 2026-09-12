import asyncio
from playwright.async_api import async_playwright

async def get_photo_url():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        print("Navigating to WB article 1011302912...")
        try:
            await page.goto("https://www.wildberries.ru/catalog/1011302912/detail.aspx", wait_until="domcontentloaded", timeout=15000)
            
            # Wait a bit for images to load
            await page.wait_for_timeout(3000)
            
            images = await page.eval_on_selector_all("img", "imgs => imgs.map(i => i.src)")
            print("All image sources on page:")
            for src in images:
                if 'basket' in src or 'webp' in src or '1011302912' in src:
                    print("-->", src)
        except Exception as e:
            print("Error loading page:", e)
        finally:
            await browser.close()

asyncio.run(get_photo_url())
