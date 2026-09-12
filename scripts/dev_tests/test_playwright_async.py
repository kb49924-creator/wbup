import asyncio
import concurrent.futures

async def test_pw():
    try:
        from playwright.async_api import async_playwright
        print("Starting pw")
        pw = await async_playwright().start()
        print("PW Started")
        await pw.stop()
        return "Success"
    except Exception as e:
        print("PW Exception:", repr(e))
        raise

def my_func():
    try:
        res = asyncio.run(test_pw())
        print("Res:", res)
    except Exception as e:
        print("Wrapper Exception:", repr(e))

async def main():
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        await loop.run_in_executor(pool, my_func)

asyncio.run(main())
