import asyncio
from web_gui.server import generate_preview, get_products, DATA_DIR

articles = ["230330183", "250093676"]  # two real articles
print("Articles:", articles)
res = generate_preview(articles)
print("Preview res:", res.get("success"), res.get("error"))
if res.get("success"):
    print("Products:", len(res.get("products", [])))
    print("Card path:", res.get("card_path"))
