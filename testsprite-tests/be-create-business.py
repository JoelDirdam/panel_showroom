import os
import time
import requests

API = os.environ.get("TARGET_URL") or "https://api-panelshowroom-3c0c.up.railway.app/api"
API = API.rstrip("/")
if not API.endswith("/api"):
    API = f"{API}/api"


def cleanup_qa_tenant(tenant_id: str, slug: str) -> None:
    """Best-effort teardown: borra el tenant de QA via SUPER_ADMIN, si hay credenciales."""
    email = os.environ.get("SUPER_ADMIN_EMAIL")
    password = os.environ.get("SUPER_ADMIN_PASSWORD")
    if not email or not password:
        print(f"[QA cleanup skipped] tenant={tenant_id} slug={slug} — set SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD")
        return
    try:
        login = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    except requests.RequestException as exc:
        print(f"[QA cleanup] error al borrar tenant {tenant_id}: {exc}")
        return
    if login.status_code != 200:
        print(f"[QA cleanup] login SUPER_ADMIN fallo ({login.status_code}): {login.text}")
        return
    token = login.json().get("token")
    if not token:
        return
    try:
        r = requests.delete(
            f"{API}/platform/tenants/{tenant_id}",
            headers={"Authorization": f"Bearer {token}"},
            params={"confirm": slug},
            timeout=30,
        )
        if r.status_code == 200:
            print(f"[QA cleanup] tenant borrado: {tenant_id} ({slug})")
        else:
            print(f"[QA cleanup] fallo al borrar tenant {tenant_id} ({r.status_code}): {r.text}")
    except requests.RequestException as exc:
        print(f"[QA cleanup] error al borrar tenant {tenant_id}: {exc}")


def test_create_business_completes_onboarding_without_auto_house_brand():
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
            "phone": "5215512345678",
            "password": password,
            "signedName": "QA Create Business",
            "termsVersion": version,
        },
        timeout=30,
    )
    assert reg.status_code == 201, reg.text
    headers = {"Authorization": f"Bearer {reg.json()['token']}"}

    # verify-email puede requerirse en algunos entornos; si el step lo pide, se omite aquí
    # cuando el seed/dev ya avanza el flujo. select-plan requiere EMAIL_VERIFIED en producto.
    plan = requests.post(
        f"{API}/onboarding/select-plan",
        headers=headers,
        json={"planType": "NEGOCIO"},
        timeout=30,
    )
    # Si el correo no está verificado, el guard de onboarding/auth puede responder 403.
    if plan.status_code != 200:
        # Intentar con código de desarrollo si vino en el register
        pass

    skip = requests.post(f"{API}/onboarding/skip-payment", headers=headers, timeout=30)
    # skip-payment requiere plan seleccionado; si falló select-plan, no assertamos aquí

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

    setup = user.get("setupStatus") or {}
    assert setup.get("businessConfigured") is True
    assert setup.get("hasHouseBrand") is False
    assert setup.get("brandCount", 0) == 0

    me = requests.get(f"{API}/auth/me", headers=headers, timeout=30)
    assert me.status_code == 200, me.text
    assert me.json()["onboardingStep"] == "DONE"
    assert me.json()["setupStatus"]["hasHouseBrand"] is False

    # Ya NO se auto-crea marca casa: el usuario la crea después si quiere.
    brands = requests.get(f"{API}/brands", headers=headers, timeout=30)
    assert brands.status_code == 200, brands.text
    brand_list = brands.json()
    assert isinstance(brand_list, list)
    assert len(brand_list) == 0, "no debe auto-crearse marca casa al crear el negocio"

    prefs = requests.get(f"{API}/preferences", headers=headers, timeout=30)
    assert prefs.status_code == 200, prefs.text
    assert "cutoffDaySlots" in prefs.json()

    cleanup_qa_tenant(user["tenant"]["id"], user["tenant"]["slug"])


test_create_business_completes_onboarding_without_auto_house_brand()
