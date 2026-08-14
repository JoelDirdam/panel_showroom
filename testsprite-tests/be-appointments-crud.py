"""CRUD de citas/servicios/horarios bajo /api/v1 y 409 por solape."""
import os
from datetime import datetime, timedelta, timezone

import requests

_raw = (
    os.environ.get("TARGET_URL")
    or os.environ.get("API_BASE")
    or "https://api-panelshowroom-3c0c.up.railway.app"
).rstrip("/")
BASE = _raw if _raw.endswith("/api") else f"{_raw}/api"
V1 = f"{BASE}/v1"


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


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


def test_services_hours_appointments_overlap():
    headers = _headers()

    created = requests.post(
        f"{V1}/services",
        headers=headers,
        json={"name": "Corte QA", "durationMinutes": 60, "price": 250},
        timeout=15,
    )
    assert created.status_code == 201, created.text
    service = created.json()
    service_id = service["id"]
    assert "brandId" not in service

    listed = requests.get(f"{V1}/services", headers=headers, timeout=15)
    assert listed.status_code == 200, listed.text
    assert any(s["id"] == service_id for s in listed.json())

    hours = requests.get(f"{V1}/business-hours", headers=headers, timeout=15)
    assert hours.status_code == 200, hours.text
    week = hours.json()
    assert len(week) == 7
    payload = [
        {
            "dayOfWeek": h["dayOfWeek"],
            "openTime": "09:00",
            "closeTime": "18:00",
            "isClosed": h["dayOfWeek"] in (0, 6),
        }
        for h in week
    ]
    replaced = requests.put(f"{V1}/business-hours", headers=headers, json=payload, timeout=15)
    assert replaced.status_code == 200, replaced.text
    assert len(replaced.json()) == 7

    wa = requests.put(
        f"{V1}/whatsapp-config",
        headers=headers,
        json={
            "phoneNumberId": "123456",
            "wabaId": "waba-1",
            "accessToken": "secret-token-xyz",
            "webhookVerifyToken": "verify-abc",
            "systemPrompt": "Eres el asistente de citas.",
            "isActive": True,
        },
        timeout=15,
    )
    assert wa.status_code == 200, wa.text
    assert wa.json()["accessToken"].startswith("****")
    assert "secret-token-xyz" not in wa.json()["accessToken"]

    start = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(days=1, hours=2)
    end = start + timedelta(hours=1)
    overlap_start = start + timedelta(minutes=30)
    overlap_end = overlap_start + timedelta(hours=1)

    first = requests.post(
        f"{V1}/appointments",
        headers=headers,
        json={
            "serviceId": service_id,
            "customerName": "Ana QA",
            "customerPhone": "5512345678",
            "startTime": _iso(start),
            "endTime": _iso(end),
            "notes": "Primera cita",
        },
        timeout=15,
    )
    assert first.status_code == 201, first.text
    appt = first.json()
    assert appt["customerName"] == "Ana QA"
    assert appt["status"] == "PENDING"
    assert "brandId" not in appt
    assert "slotId" not in appt
    assert "bookedById" not in appt

    clash = requests.post(
        f"{V1}/appointments",
        headers=headers,
        json={
            "serviceId": service_id,
            "customerName": "Luis QA",
            "customerPhone": "5598765432",
            "startTime": _iso(overlap_start),
            "endTime": _iso(overlap_end),
        },
        timeout=15,
    )
    assert clash.status_code == 409, clash.text
    assert "solapa" in clash.json().get("error", "").lower()

    second_start = end
    second_end = second_start + timedelta(hours=1)
    second = requests.post(
        f"{V1}/appointments",
        headers=headers,
        json={
            "customerName": "Luis QA",
            "customerPhone": "5598765432",
            "startTime": _iso(second_start),
            "endTime": _iso(second_end),
        },
        timeout=15,
    )
    assert second.status_code == 201, second.text

    listed_appts = requests.get(
        f"{V1}/appointments",
        headers=headers,
        params={"from": _iso(start), "to": _iso(second_end + timedelta(minutes=1))},
        timeout=15,
    )
    assert listed_appts.status_code == 200, listed_appts.text
    ids = {a["id"] for a in listed_appts.json()}
    assert appt["id"] in ids
    assert second.json()["id"] in ids

    cancelled = requests.post(f"{V1}/appointments/{appt['id']}/cancel", headers=headers, timeout=15)
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "CANCELLED"

    deleted = requests.delete(f"{V1}/services/{service_id}", headers=headers, timeout=15)
    assert deleted.status_code in (200, 204), deleted.text


test_services_hours_appointments_overlap()
