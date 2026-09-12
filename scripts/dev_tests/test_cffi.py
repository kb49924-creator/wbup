from curl_cffi import requests

url = "https://catalog.wb.ru/sellers/catalog?appType=1&curr=rub&dest=-1257786&regions=80,38,83,4,64,33,68,70,30,40,86,75,69,22,1,31,66,110,48,71,114&sort=popular&spp=30&supplier=1266941"

try:
    r = requests.get(url, impersonate="chrome110")
    print("Status:", r.status_code)
    print("Response:", r.text[:200])
except Exception as e:
    print("Error:", e)
