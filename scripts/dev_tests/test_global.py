import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        async def handle_response(response):
            if "catalog" in response.url:
                print("URL:", response.url)
            if "catalog.wb.ru/catalog" in response.url and "sort=newly" in response.url:
                print("FOUND API:", response.url)
                try:
                    data = await response.json()
                    prods = data.get("data", {}).get("products", [])
                    print(f"Products found: {len(prods)}")
                except:
                    pass

        page.on("response", handle_response)
        
        print("Visiting category...")
        await page.goto("https://www.wildberries.ru/catalog/zhenshchinam/odezhda/bluzki-i-rubashki?sort=newly")
        await asyncio.sleep(5)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
