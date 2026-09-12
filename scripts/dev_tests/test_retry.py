import requests
import time

headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Accept": "*/*",
    "Origin": "https://www.wildberries.ru",
    "Referer": "https://www.wildberries.ru/"
}

url = "https://catalog.wb.ru/sellers/v4/catalog?appType=1&dest=-1257786&supplier=4225101"

for i in range(3):
    r = requests.get(url, headers=headers, timeout=10)
    print(f"Attempt {i+1}: {r.status_code}")
    if r.status_code == 200:
        print("Success!")
        break
    time.sleep(2)
