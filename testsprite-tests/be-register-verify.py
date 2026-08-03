import os
import time
import requests

API = os.environ.get("TARGET_URL") or "https://api-panelshowroom-3c0c.up.railway.app/api"
API = API.rstrip("/")
if not API.endswith("/api"):
    API = f"{API}/api"


def fetch_current_terms() -> dict:
    r = requests.get(f"{API}/terms/current", timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("version"), "terms/current no trae version"
    return body


def cleanup_qa_tenant(tenant_id: str, slug: str) -> None:
    """Best-effort teardown: borra el tenant de QA via SUPER_ADMIN, si hay credenciales."""
    email = os.environ.get("SUPER_ADMIN_EMAIL")
    password = os.environ.get("SUPER_ADMIN_PASSWORD")
    if not email or not password:
        print(f"[QA cleanup skipped] tenant={tenant_id} slug={slug} — set SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD")
        return
    try:
        login = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
        if login.status_code != 200:
            print(f"[QA cleanup] login SUPER_ADMIN fallo ({login.status_code}): {login.text}")
            return
        token = login.json().get("token")
        if not token:
            return
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


def test_register_accepts_terms_and_verify_email_completes_onboarding_step():
    terms = fetch_current_terms()
    version = terms["version"]

    stamp = int(time.time() * 1000)
    email = f"qa-register-{stamp}@example.com"
    password = f"Temp{stamp}Aa!"

    # --- Registro con firma de términos vigente ---
    reg = requests.post(
        f"{API}/auth/register",
        json={
            "name": "QA Register Flow",
            "email": email,
            "phone": "5215500000000",
            "password": password,
            "signedName": "QA Register Flow",
            "termsVersion": version,
        },
        timeout=30,
    )
    assert reg.status_code == 201, reg.text
    body = reg.json()
    assert body.get("token"), body
    user = body["user"]
    assert user["email"] == email
    assert user["onboardingStep"] == "REGISTERED", user
    assert user["terms"]["accepted"] is True
    assert user["terms"]["acceptedVersion"] == version
    assert user["emailVerifiedAt"] is None

    tenant_id = user["tenant"]["id"]
    tenant_slug = user["tenant"]["slug"]

    headers = {"Authorization": f"Bearer {body['token']}"}

    # --- Registrar el mismo correo de nuevo debe rechazarse ---
    dup = requests.post(
        f"{API}/auth/register",
        json={
            "name": "Duplicado",
            "email": email,
            "password": password,
            "signedName": "Duplicado",
            "termsVersion": version,
        },
        timeout=30,
    )
    assert dup.status_code == 409, dup.text

    # --- Registrar con una versión de términos vieja/incorrecta debe rechazarse ---
    stale = requests.post(
        f"{API}/auth/register",
        json={
            "name": "QA Stale Terms",
            "email": f"qa-register-stale-{stamp}@example.com",
            "password": password,
            "signedName": "QA Stale Terms",
            "termsVersion": f"{version}-obsoleta",
        },
        timeout=30,
    )
    assert stale.status_code == 409, stale.text

    # --- Verificación de correo ---
    dev_code = body.get("devCode")
    if not dev_code:
        # Entorno sin NODE_ENV=development: no hay devCode expuesto. Se valida
        # al menos que el endpoint rechaza un código incorrecto con 400, y se
        # deja constancia de que el happy path de verificación requiere un
        # entorno con devCode habilitado.
        wrong = requests.post(
            f"{API}/auth/verify-email",
            headers=headers,
            json={"code": "000000"},
            timeout=30,
        )
        assert wrong.status_code == 400, wrong.text
        print("SKIP-INFO: devCode no expuesto (NODE_ENV=production); no se valida el happy path de verify-email")
        cleanup_qa_tenant(tenant_id, tenant_slug)
        return

    bad_code = requests.post(
        f"{API}/auth/verify-email",
        headers=headers,
        json={"code": "000000"},
        timeout=30,
    )
    assert bad_code.status_code == 400, bad_code.text

    ok = requests.post(
        f"{API}/auth/verify-email",
        headers=headers,
        json={"code": dev_code},
        timeout=30,
    )
    assert ok.status_code == 200, ok.text
    verified_user = ok.json()["user"]
    assert verified_user["emailVerifiedAt"] is not None
    assert verified_user["onboardingStep"] == "EMAIL_VERIFIED", verified_user

    me = requests.get(f"{API}/auth/me", headers=headers, timeout=30)
    assert me.status_code == 200, me.text
    assert me.json()["onboardingStep"] == "EMAIL_VERIFIED"

    # Teardown: todos los asserts pasaron, se limpia el tenant de QA creado.
    cleanup_qa_tenant(tenant_id, tenant_slug)


test_register_accepts_terms_and_verify_email_completes_onboarding_step()
