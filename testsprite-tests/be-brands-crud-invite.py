import time
import requests

API = "https://api-panelshowroom-3c0c.up.railway.app/api"


def test_brand_crud_and_invite_code_can_be_generated_and_redeemed():
    admin = {**__AUTH_HEADERS__}
    stamp = int(time.time())
    name = f"Marca CRUD {stamp}"

    # --- Create ---
    create = requests.post(
        f"{API}/brands",
        headers=admin,
        json={
            "name": name,
            "contactEmail": f"qa-crud-brand-{stamp}@example.com",
            "monthlyRent": 1500,
            "commissionPercent": 12.5,
            "assignedSpace": "Pasillo QA",
        },
        timeout=30,
    )
    assert create.status_code == 201, create.text
    brand = create.json()
    brand_id = brand["id"]
    assert brand["name"] == name
    assert brand["owner"] is None

    # --- Read (list + detail) ---
    listing = requests.get(f"{API}/brands", headers=admin, timeout=30)
    assert listing.status_code == 200, listing.text
    assert any(b["id"] == brand_id for b in listing.json())

    detail = requests.get(f"{API}/brands/{brand_id}", headers=admin, timeout=30)
    assert detail.status_code == 200, detail.text
    assert detail.json()["assignedSpace"] == "Pasillo QA"

    # --- Update ---
    patch = requests.patch(
        f"{API}/brands/{brand_id}",
        headers=admin,
        json={"monthlyRent": 1800, "commissionPercent": 15},
        timeout=30,
    )
    assert patch.status_code == 200, patch.text
    assert float(patch.json()["monthlyRent"]) == 1800

    # --- Invite code: generar y auto-canjear (mismo admin, valida hashing/match) ---
    invite = requests.post(f"{API}/brands/{brand_id}/invite-code", headers=admin, timeout=30)
    assert invite.status_code == 200, invite.text
    invite_body = invite.json()
    code = invite_body["code"]
    assert len(code) == 8
    assert invite_body.get("expiresAt")

    wrong_redeem = requests.post(
        f"{API}/brands/redeem-invite",
        headers=admin,
        json={"code": "WRONGCODE"},
        timeout=30,
    )
    assert wrong_redeem.status_code == 404, wrong_redeem.text

    redeem = requests.post(
        f"{API}/brands/redeem-invite",
        headers=admin,
        json={"code": code},
        timeout=30,
    )
    assert redeem.status_code == 200, redeem.text
    assert redeem.json()["brand"]["id"] == brand_id

    linked = requests.get(f"{API}/brands/{brand_id}", headers=admin, timeout=30)
    assert linked.status_code == 200, linked.text
    assert linked.json()["owner"] is not None

    # Un codigo ya canjeado no debe volver a funcionar.
    reuse = requests.post(
        f"{API}/brands/redeem-invite",
        headers=admin,
        json={"code": code},
        timeout=30,
    )
    assert reuse.status_code == 404, reuse.text

    # --- Delete (sin productos ni ventas -> borrado real) ---
    delete = requests.delete(
        f"{API}/brands/{brand_id}",
        headers=admin,
        json={"slug": brand["slug"]},
        timeout=30,
    )
    assert delete.status_code == 200, delete.text
    assert delete.json()["action"] == "deleted"

    gone = requests.get(f"{API}/brands/{brand_id}", headers=admin, timeout=30)
    assert gone.status_code == 404, gone.text


test_brand_crud_and_invite_code_can_be_generated_and_redeemed()
