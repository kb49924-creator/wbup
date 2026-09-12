import requests
import json

supplier_id = 1266941

urls = [
    f"https://catalog.wb.ru/sellers/catalog?appType=1&supplier={supplier_id}",
    f"https://catalog.wb.ru/sellers/v1/catalog?appType=1&supplier={supplier_id}",
    f"https://catalog.wb.ru/sellers/v2/catalog?appType=1&supplier={supplier_id}",
    f"https://catalog.wb.ru/sellers/v3/catalog?appType=1&supplier={supplier_id}",
    f"https://catalog.wb.ru/sellers/v4/catalog?appType=1&supplier={supplier_id}",
    f"https://www.wildberries.ru/__internal/u-catalog/sellers/v4/catalog?appType=1&supplier={supplier_id}"
]

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

for url in urls:
    try:
        r = requests.get(url, headers=headers, timeout=5)
        print(f"URL: {url}")
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            try:
                print(f"Data keys: {r.json().keys()}")
            except:
                print("Text snippet:", r.text[:100])
        print("-" * 40)
    except Exception as e:
        print(f"Error for {url}: {e}")

