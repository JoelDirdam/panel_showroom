import os
import time
import requests

API = os.environ.get("TARGET_URL") or "https://api-panelshowroom-3c0c.up.railway.app/api"
API = API.rstrip("/")
if not API.endswith("/api"):
    API = f"{API}/api"


def test_create_business_completes_onboarding_and_provisions_tenant_defaults():
    terms = requests.get(f"{API}/terms/current", timeout=30)
    assert terms.status_code == 200, terms.text
    version = terms.json()["version"]

    stamp = int(time.time() * 1000)
    email = f"qa-business-{stamp}@example.com"
    password = f"Temp{stamp}Aa!"
    business_name = f"Negocio QA {stamp}"

    reg = requests.post(
        f"{API}/auth/register",
        json={
            "name": "QA Create Business",
            "email": email,
            "password": password,
            "signedName": "QA Create Business",
            "termsVersion": version,
        },
        timeout=30,
    )
    assert reg.status_code == 201, reg.text
    headers = {"Authorization": f"Bearer {reg.json()['token']}"}

    plan = requests.post(
        f"{API}/onboarding/select-plan",
        headers=headers,
        json={"planType": "NEGOCIO"},
        timeout=30,
    )
    assert plan.status_code == 200, plan.text

    # multipart/form-data sin logo: solo campos de texto.
    # NOTA: se usa `files=` (no `data=`) para forzar Content-Type multipart/form-data;
    # el endpoint usa multer y no parsea application/x-www-form-urlencoded.
    biz = requests.post(
        f"{API}/onboarding/create-business",
        headers=headers,
        files={
            "name": (None, business_name),
            "rfc": (None, "QACB010101AAA"),
            "socialUrl": (None, "https://instagram.com/qa-negocio"),
            "address": (None, "Calle Falsa 123"),
        },
        timeout=30,
    )
    assert biz.status_code == 200, biz.text
    user = biz.json()["user"]
    assert user["onboardingStep"] == "DONE", user
    assert user["tenant"]["name"] == business_name
    assert user["tenant"]["onboardingComplete"] is True
    assert user["tenant"]["rfc"] == "QACB010101AAA"

    me = requests.get(f"{API}/auth/me", headers=headers, timeout=30)
    assert me.status_code == 200, me.text
    assert me.json()["onboardingStep"] == "DONE"

    # ensureHouseBrand: el tenant recien creado debe tener al menos la marca casa.
    brands = requests.get(f"{API}/brands", headers=headers, timeout=30)
    assert brands.status_code == 200, brands.text
    brand_list = brands.json()
    assert isinstance(brand_list, list) and len(brand_list) >= 1, "esperaba la marca casa (house brand) creada"
    assert any(b.get("isHouseBrand") for b in brand_list), "no se encontro una marca isHouseBrand=true"

    # businessPreferences: debe existir un registro por defecto para el tenant.
    prefs = requests.get(f"{API}/preferences", headers=headers, timeout=30)
    assert prefs.status_code == 200, prefs.text
    assert "cutoffDaySlots" in prefs.json()


test_create_business_completes_onboarding_and_provisions_tenant_defaults()
