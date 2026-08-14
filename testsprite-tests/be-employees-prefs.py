"""Smoke: ADMIN can CRUD employees scoped to tenant."""
import os
import requests

BASE = os.environ.get("API_BASE", "http://localhost:3000/api")
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@showroom.com")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "Showroom2026!")


def test_employee_crud_and_preferences_ticket_fixed_comment():
    login = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert login.status_code == 200, login.text
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    create = requests.post(
        f"{BASE}/employees",
        headers=headers,
        json={"name": "TestSprite Emp", "phone": "555"},
        timeout=15,
    )
    assert create.status_code == 201, create.text
    emp_id = create.json()["id"]

    listed = requests.get(f"{BASE}/employees?active=true", headers=headers, timeout=15)
    assert listed.status_code == 200
    assert any(e["id"] == emp_id for e in listed.json())

    patched = requests.patch(
        f"{BASE}/employees/{emp_id}",
        headers=headers,
        json={"name": "TestSprite Emp 2"},
        timeout=15,
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "TestSprite Emp 2"

    prefs = requests.patch(
        f"{BASE}/preferences",
        headers=headers,
        json={"ticketFixedComment": "Texto fijo smoke"},
        timeout=15,
    )
    assert prefs.status_code == 200, prefs.text
    assert prefs.json().get("ticketFixedComment") == "Texto fijo smoke"

    deleted = requests.delete(f"{BASE}/employees/{emp_id}", headers=headers, timeout=15)
    assert deleted.status_code == 200
    assert deleted.json()["active"] is False

    forbidden = requests.get(f"{BASE}/platform/stats", headers=headers, timeout=15)
    assert forbidden.status_code == 403


if __name__ == "__main__":
    test_employee_crud_and_preferences_ticket_fixed_comment()
    print("OK be-employees-prefs")
