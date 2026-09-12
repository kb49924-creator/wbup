from curl_cffi import requests

suppliers = [1266941, 4020633, 4225101, 114872, 250093676]

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Origin": "https://www.wildberries.ru"
}

for supplier_id in suppliers:
    url = f"https://catalog.wb.ru/sellers/v4/catalog?appType=1&dest=-1257786&supplier={supplier_id}"
    try:
        r = requests.get(url, headers=headers, impersonate="chrome120", timeout=10)
        print(f"Supplier: {supplier_id}")
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            products = data.get('data', {}).get('products', [])
            if not products and 'products' in data:
                products = data.get('products', [])
            print(f"Products found: {len(products)}")
        else:
            print(f"Content: {r.text[:100]}")
        print("-" * 40)
    except Exception as e:
        print(f"Error for {supplier_id}: {e}")

