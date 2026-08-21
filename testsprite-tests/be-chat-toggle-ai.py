"""PATCH /api/chat/:customerPhone/toggle-ai habilita o pausa la IA por conversación."""
import os

import requests

_raw = (
    os.environ.get("TARGET_URL")
    or os.environ.get("API_BASE")
    or "https://api-panelshowroom-3c0c.up.railway.app"
).rstrip("/")
BASE = _raw if _raw.endswith("/api") else f"{_raw}/api"
PHONE = "520000TOGGLE01"


def _headers() -> dict:
    try:
        return {**__AUTH_HEADERS__}
    except NameError:
        email = os.environ.get("ADMIN_EMAIL", "admin@showroom.com")
        password = os.environ.get("ADMIN_PASSWORD", "Showroom2026!")
        login = requests.post(
            f"{BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=30,
        )
        assert login.status_code == 200, login.text
        return {"Authorization": f"Bearer {login.json()['token']}"}


def test_toggle_ai_requires_auth():
    r = requests.patch(
        f"{BASE}/chat/{PHONE}/toggle-ai",
        json={"aiEnabled": False},
        timeout=15,
    )
    assert r.status_code == 401, r.text


def test_toggle_ai_upserts_conversation():
    headers = _headers()
    off = requests.patch(
        f"{BASE}/chat/{PHONE}/toggle-ai",
        headers=headers,
        json={"aiEnabled": False},
        timeout=15,
    )
    assert off.status_code == 200, off.text
    body = off.json()
    assert body["customerPhone"] == PHONE
    assert body["aiEnabled"] is False

    on = requests.patch(
        f"{BASE}/chat/{PHONE}/toggle-ai",
        headers=headers,
        json={"aiEnabled": True},
        timeout=15,
    )
    assert on.status_code == 200, on.text
    assert on.json()["aiEnabled"] is True


test_toggle_ai_requires_auth()
test_toggle_ai_upserts_conversation()
