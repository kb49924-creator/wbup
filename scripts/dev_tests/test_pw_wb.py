import asyncio
from playwright.async_api import async_playwright
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, args=["--no-sandbox"])
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            from playwright_stealth import stealth_async
            await stealth_async(page)
        except:
            pass

        print("Navigating to WB seller 1266941...")
        
        await page.goto("https://www.wildberries.ru/seller/1266941")
        await page.wait_for_timeout(10000)
        
        await page.screenshot(path="scratch/wb_screenshot.png")
        print("Screenshot saved to scratch/wb_screenshot.png")
            
        await browser.close()

asyncio.run(main())
