"""PATCH /preferences returns field-level Spanish validation errors."""
import os

import requests

_raw = (
    os.environ.get("TARGET_URL")
    or os.environ.get("API_BASE")
    or "http://127.0.0.1:3000"
).rstrip("/")
BASE = _raw if _raw.endswith("/api") else f"{_raw}/api"


def _headers() -> dict:
    try:
        return {**__AUTH_HEADERS__}
    except NameError:
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")
        assert email and password, "ADMIN_EMAIL/ADMIN_PASSWORD or injected auth required"
        login = requests.post(
            f"{BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=30,
        )
        assert login.status_code == 200, login.text
        return {"Authorization": f"Bearer {login.json()['token']}"}


def test_preferences_invalid_label_reports_field():
    headers = _headers()
    bad = requests.patch(
        f"{BASE}/preferences",
        headers=headers,
        json={
            "labelWidthMm": 0,
            "layawayDueDays": 15,
            "cutoffType": "MONTHLY_FIXED",
            "cutoffDaySlots": [1],
        },
        timeout=15,
    )
    assert bad.status_code == 400, bad.text
    body = bad.json()
    assert body.get("error") == "Datos inválidos", body
    field_errors = (body.get("details") or {}).get("fieldErrors") or {}
    msgs = field_errors.get("labelWidthMm") or []
    assert msgs, field_errors
    assert any("mayor a 0" in m.lower() for m in msgs), msgs


def test_preferences_valid_patch_succeeds():
    headers = _headers()
    ok = requests.patch(
        f"{BASE}/preferences",
        headers=headers,
        json={
            "primaryTerminalCommission": 2.5,
            "layawayDueDays": 15,
            "labelWidthMm": 50,
            "labelHeightMm": 30,
            "cutoffType": "MONTHLY_FIXED",
            "cutoffDaySlots": [1, 15],
            "usdEnabled": False,
            "usdRateMode": None,
            "usdFixedRate": None,
        },
        timeout=15,
    )
    assert ok.status_code == 200, ok.text
    data = ok.json()
    assert data.get("labelWidthMm") == 50
    assert sorted(data.get("cutoffDaySlots") or []) == [1, 15]


test_preferences_invalid_label_reports_field()
test_preferences_valid_patch_succeeds()
