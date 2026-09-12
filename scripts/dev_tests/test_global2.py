import asyncio
from playwright.async_api import async_playwright
import re, json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        print("Visiting category...")
        await page.goto("https://www.wildberries.ru/catalog/zhenshchinam/odezhda/bluzki-i-rubashki?sort=newly")
        await asyncio.sleep(3)
        html = await page.content()
        print("HTML length:", len(html))
        
        # WB usually puts data in something like window.__serverState__ or window.spaServerState
        import re
        match = re.search(r'window\.wbStore\s*=\s*(\{.*?\});', html, re.DOTALL)
        if not match:
            match = re.search(r'window\.__serverState__\s*=\s*(\{.*?\});', html, re.DOTALL)
            
        print("Match found?", bool(match))
        
        await browser.close()

asyncio.run(main())
