import os
import requests

BASE = os.environ.get("TARGET_URL") or "https://api-panelshowroom-3c0c.up.railway.app"

r = requests.get(f"{BASE}/api/products", headers={**__AUTH_HEADERS__}, timeout=30)
assert r.status_code == 200, r.text
products = r.json()
assert isinstance(products, list)
assert len(products) >= 3
skus = {p.get("sku") for p in products}
assert {"VEL-001", "DIF-002", "JAB-003"}.issubset(skus)
