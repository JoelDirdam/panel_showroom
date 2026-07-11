import os
import requests

BASE = os.environ.get("TARGET_URL") or "https://api-panelshowroom-3c0c.up.railway.app"

r = requests.get(f"{BASE}/api/dashboard", headers={**__AUTH_HEADERS__}, timeout=30)
assert r.status_code == 200, r.text
stats = r.json()
assert stats.get("totalProducts", 0) >= 3
assert stats.get("totalStockUnits", 0) > 0
assert "lowStockCount" in stats
assert isinstance(stats.get("lowStockItems"), list)
