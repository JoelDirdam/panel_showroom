"""SUPER_ADMIN login + platform access (local/API smoke)."""
import os
import requests

BASE = (os.environ.get("TARGET_URL") or "http://localhost:3000").rstrip("/")
EMAIL = os.environ.get("SUPER_ADMIN_EMAIL")
PASSWORD = os.environ.get("SUPER_ADMIN_PASSWORD")

assert EMAIL and PASSWORD, "Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD"


def test_super_admin_login_and_platform():
    bad = requests.post(
        f"{BASE}/api/auth/login",
        json={"email": EMAIL, "password": "wrong-password-xyz"},
        timeout=30,
    )
    assert bad.status_code == 401, bad.text

    login = requests.post(
        f"{BASE}/api/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=30,
    )
    assert login.status_code == 200, login.text
    body = login.json()
    assert body.get("token"), body
    assert body.get("user", {}).get("role") == "SUPER_ADMIN", body.get("user")

    headers = {"Authorization": f"Bearer {body['token']}"}
    me = requests.get(f"{BASE}/api/auth/me", headers=headers, timeout=30)
    assert me.status_code == 200, me.text
    assert me.json().get("role") == "SUPER_ADMIN"

    stats = requests.get(f"{BASE}/api/platform/stats", headers=headers, timeout=30)
    assert stats.status_code == 200, stats.text
    assert "tenants" in stats.json()


test_super_admin_login_and_platform()
print("PASS be-super-admin-login")
