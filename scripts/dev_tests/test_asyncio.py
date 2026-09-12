import asyncio
import concurrent.futures

async def my_coro():
    print("Inside coro")
    await asyncio.sleep(1)
    return [1, 2, 3]

def my_func():
    try:
        loop = asyncio.get_event_loop()
        is_running = loop.is_running()
    except RuntimeError:
        is_running = False
        print("Caught RuntimeError in get_event_loop")

    if is_running:
        print("Loop is running")
    else:
        print("Loop is NOT running")

    try:
        res = asyncio.run(my_coro())
        print("Res:", res)
    except Exception as e:
        print("Exception in asyncio.run:", e)

async def main():
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        await loop.run_in_executor(pool, my_func)

asyncio.run(main())
