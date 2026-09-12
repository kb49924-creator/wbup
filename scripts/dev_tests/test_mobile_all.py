import requests

suppliers = [1266941, 4020633, 4225101, 114872, 250093676]

headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Accept": "*/*",
    "Origin": "https://www.wildberries.ru",
    "Referer": "https://www.wildberries.ru/"
}

for supplier_id in suppliers:
    url = f"https://catalog.wb.ru/sellers/v4/catalog?appType=1&dest=-1257786&supplier={supplier_id}"
    try:
        r = requests.get(url, headers=headers, timeout=10)
        print(f"Supplier: {supplier_id}, Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            products = data.get('data', {}).get('products', [])
            if not products and 'products' in data:
                products = data.get('products', [])
            print(f"Products found: {len(products)}")
        else:
            print("Content:", r.text[:100])
        print("-" * 40)
    except Exception as e:
        print(f"Error for {supplier_id}: {e}")

