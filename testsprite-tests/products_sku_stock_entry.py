import os
import requests

BASE = os.environ.get("TARGET_URL") or "https://api-panelshowroom-3c0c.up.railway.app"
headers = {**__AUTH_HEADERS__}

# List products and assert sku + stock shape
r = requests.get(f"{BASE}/api/products", headers=headers, timeout=30)
assert r.status_code == 200, r.text
products = r.json()
assert isinstance(products, list) and len(products) >= 1, "expected seeded products"
sample = products[0]
assert "sku" in sample and sample["sku"], "product missing sku"
assert "barcode" not in sample, "barcode field should be removed"
assert "stock" in sample and isinstance(sample["stock"], dict), "product missing stock"
assert "quantity" in sample["stock"], "stock missing quantity"
product_id = sample["id"]
before_qty = sample["stock"].get("quantity") or 0

# Filter by sku query param
sku = sample.get("sku") or ""
fr = requests.get(f"{BASE}/api/products", headers=headers, params={"sku": sku}, timeout=30)
assert fr.status_code == 200, fr.text
filtered = fr.json()
assert isinstance(filtered, list) and len(filtered) >= 1, "sku filter returned empty"
assert any(p.get("id") == product_id for p in filtered), "sku filter missed sample product"

# Create a stock entry and verify quantity increments
note = "testsprite-stock-entry"
er = requests.post(
    f"{BASE}/api/stock/{product_id}/entries",
    headers=headers,
    json={"quantity": 1, "note": note},
    timeout=30,
)
assert er.status_code == 201, er.text
body = er.json()
assert body.get("entry", {}).get("quantity") == 1, body
assert body.get("entry", {}).get("note") == note, body
assert body.get("stock", {}).get("quantity") == before_qty + 1, body

# Entries list includes the new note
lr = requests.get(f"{BASE}/api/stock/{product_id}/entries", headers=headers, timeout=30)
assert lr.status_code == 200, lr.text
entries = lr.json()
assert isinstance(entries, list) and any(e.get("note") == note for e in entries), entries
