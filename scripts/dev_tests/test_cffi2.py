from curl_cffi import requests

url = "https://www.wildberries.ru/seller/1266941"

try:
    r = requests.get(url, impersonate="chrome110")
    print("Status:", r.status_code)
    print("Response snippet:", r.text[:500])
except Exception as e:
    print("Error:", e)
