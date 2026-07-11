import os
import requests

base = os.environ.get("TARGET_URL") or os.environ.get("BASE_URL") or "https://api-panelshowroom-3c0c.up.railway.app"

r = requests.get(f"{base}/health", timeout=30)
assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
body = r.json()
assert body.get("ok") is True
assert body.get("service") == "panel-bubbles-api"
