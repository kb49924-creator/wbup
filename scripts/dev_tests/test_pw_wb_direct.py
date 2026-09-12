import asyncio
from playwright.async_api import async_playwright

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

        print("Fetching API directly...")
        
        # Navigate to a generic WB page first to get cookies
        await page.goto("https://www.wildberries.ru")
        await page.wait_for_timeout(2000)
        
        # Fetch the catalog API directly using evaluate
        data = await page.evaluate('''async () => {
            const resp = await fetch("https://catalog.wb.ru/sellers/catalog?appType=1&curr=rub&dest=-1257786&regions=80,38,83,4,64,33,68,70,30,40,86,75,69,22,1,31,66,110,48,71,114&sort=popular&spp=30&supplier=1266941");
            return await resp.text();
        }''')
        
        print("API Response:", data[:200])
        
        await browser.close()

asyncio.run(main())
