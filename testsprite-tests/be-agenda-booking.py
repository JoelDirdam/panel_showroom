import os
import time
from datetime import datetime, timedelta, timezone

import requests

API = os.environ.get("AGENDA_API_URL", "https://api-panelshowroom-3c0c.up.railway.app/api").rstrip("/")


def login(email: str, password: str) -> dict:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("token"), data
    return {"Authorization": f"Bearer {data['token']}"}


def test_weekly_rules_generate_and_preserve_bookings():
    # Prefer injected auth; fall back for local runs
    try:
        admin = {**__AUTH_HEADERS__}
    except NameError:
        admin = login("admin@showroom.com", "Showroom2026!")

    stamp = int(time.time())
    slug = f"agenda-brand-{stamp}"
    email = f"{slug}@example.com"
    password = f"Temp{stamp}Aa!"

    brand_res = requests.post(
        f"{API}/brands",
        headers=admin,
        json={
            "name": f"Agenda Brand {stamp}",
            "slug": slug,
            "contactEmail": email,
            "active": True,
            "createUser": True,
            "password": password,
            "userName": f"Agenda {stamp}",
        },
        timeout=30,
    )
    assert brand_res.status_code == 201, brand_res.text

    settings = requests.patch(
        f"{API}/agenda/settings",
        headers=admin,
        json={"stockDeliveryEnabled": True, "cutPickupEnabled": False},
        timeout=30,
    )
    assert settings.status_code == 200, settings.text

    # Lun + Mié 12:00-13:00 cada 15 min -> 4 slots/día
    put = requests.put(
        f"{API}/agenda/weekly-rules",
        headers=admin,
        json={
            "type": "STOCK_DELIVERY",
            "intervalMinutes": 15,
            "days": [
                {"weekday": 1, "startTime": "12:00", "endTime": "13:00"},
                {"weekday": 3, "startTime": "12:00", "endTime": "13:00"},
            ],
        },
        timeout=60,
    )
    assert put.status_code == 200, put.text
    assert len(put.json()["rules"]) == 2, put.text
    assert put.json()["materialized"] >= 4, put.text

    brand_headers = login(email, password)
    now = datetime.now(timezone.utc)
    slots_res = requests.get(
        f"{API}/agenda/slots",
        headers=brand_headers,
        params={
            "from": now.isoformat().replace("+00:00", "Z"),
            "to": (now + timedelta(days=21)).isoformat().replace("+00:00", "Z"),
        },
        timeout=30,
    )
    assert slots_res.status_code == 200, slots_res.text
    slots = slots_res.json()
    free = [s for s in slots if s["type"] == "STOCK_DELIVERY" and not s.get("booked")]
    assert len(free) >= 4, free
    assert all(s["type"] != "CUT_PICKUP" for s in slots)

    slot_id = free[0]["id"]
    book = requests.post(
        f"{API}/agenda/appointments",
        headers=brand_headers,
        json={"slotId": slot_id, "notes": "Llevo restock"},
        timeout=30,
    )
    assert book.status_code == 201, book.text

    duplicate = requests.post(
        f"{API}/agenda/appointments",
        headers=brand_headers,
        json={"slotId": slot_id},
        timeout=30,
    )
    assert duplicate.status_code == 409, duplicate.text

    # Change rule: only Saturday 11:00-12:00 — free slots outside should go; booking kept
    put2 = requests.put(
        f"{API}/agenda/weekly-rules",
        headers=admin,
        json={
            "type": "STOCK_DELIVERY",
            "intervalMinutes": 30,
            "days": [{"weekday": 6, "startTime": "11:00", "endTime": "12:00"}],
        },
        timeout=60,
    )
    assert put2.status_code == 200, put2.text

    mine = requests.get(f"{API}/agenda/appointments", headers=brand_headers, timeout=30)
    assert mine.status_code == 200, mine.text
    assert any(a["slotId"] == slot_id for a in mine.json()), "cita reservada debe conservarse"

    admin_slots = requests.get(
        f"{API}/agenda/slots",
        headers=admin,
        params={
            "from": now.isoformat().replace("+00:00", "Z"),
            "to": (now + timedelta(days=21)).isoformat().replace("+00:00", "Z"),
        },
        timeout=30,
    )
    assert admin_slots.status_code == 200, admin_slots.text
    kept = next(s for s in admin_slots.json() if s["id"] == slot_id)
    assert kept.get("appointment") is not None, kept


test_weekly_rules_generate_and_preserve_bookings()
