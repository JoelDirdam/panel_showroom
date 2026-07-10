import os
import requests

BASE = os.environ.get("TARGET_URL") or "https://api-production-3c0c.up.railway.app"

bad = requests.post(
    f"{BASE}/api/auth/login",
    json={"email": "admin@showroom.com", "password": "wrong-password-xyz"},
    timeout=30,
)
assert bad.status_code == 401, bad.text

me = requests.get(f"{BASE}/api/auth/me", headers={**__AUTH_HEADERS__}, timeout=30)
assert me.status_code == 200, me.text
user = me.json()
assert user.get("email") == "admin@showroom.com"
assert user.get("role") == "ADMIN"
