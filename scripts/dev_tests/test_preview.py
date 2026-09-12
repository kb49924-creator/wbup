import asyncio
from web_gui.server import generate_preview

# Testing a known article that had no baskets earlier
try:
    result = generate_preview(["987971822"])
    print("Result:", result)
except Exception as e:
    import traceback
    traceback.print_exc()
