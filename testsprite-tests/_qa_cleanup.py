"""
Helper de limpieza para datos creados por las pruebas TestSprite.

Las pruebas backend crean negocios (tenants) y usuarios reales contra el API.
No tienen credenciales SUPER_ADMIN, así que la limpieza es "best effort":
si SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD están presentes en el entorno, se
loguea como plataforma y borra el tenant/usuario recién creado. Si no están
configuradas, solo se imprime una advertencia con los datos necesarios para
limpiar manualmente (o vía `apps/api/prisma/cleanup-qa.ts`).

Uso típico al final de un test:

    from _qa_cleanup import cleanup_qa_tenant, cleanup_qa_user

    cleanup_qa_tenant(tenant_id, slug, API)
    # o, si el flujo no llegó a crear tenant:
    cleanup_qa_user(user_id, API)
"""
import os

import requests

_SUPER_ADMIN_HEADERS_CACHE: dict | None = None


def _super_admin_headers(api: str) -> dict | None:
    global _SUPER_ADMIN_HEADERS_CACHE
    if _SUPER_ADMIN_HEADERS_CACHE is not None:
        return _SUPER_ADMIN_HEADERS_CACHE

    email = os.environ.get("SUPER_ADMIN_EMAIL")
    password = os.environ.get("SUPER_ADMIN_PASSWORD")
    if not email or not password:
        return None

    try:
        r = requests.post(
            f"{api}/auth/login",
            json={"email": email, "password": password},
            timeout=30,
        )
        if r.status_code != 200:
            print(f"[QA cleanup] login SUPER_ADMIN fallo ({r.status_code}): {r.text}")
            return None
        token = r.json().get("token")
        if not token:
            return None
        _SUPER_ADMIN_HEADERS_CACHE = {"Authorization": f"Bearer {token}"}
        return _SUPER_ADMIN_HEADERS_CACHE
    except requests.RequestException as exc:
        print(f"[QA cleanup] error al loguear SUPER_ADMIN: {exc}")
        return None


def cleanup_qa_tenant(tenant_id: str, slug: str, api: str) -> None:
    """Borra un tenant de QA vía DELETE /platform/tenants/:id.

    Requiere SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD en el entorno; si no
    están presentes, solo imprime una advertencia (no falla el test).
    """
    if not tenant_id or not slug:
        return

    headers = _super_admin_headers(api)
    if not headers:
        print(
            f"[QA cleanup skipped] tenant={tenant_id} slug={slug} — "
            "set SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD para limpieza automatica"
        )
        return

    try:
        r = requests.delete(
            f"{api}/platform/tenants/{tenant_id}",
            headers=headers,
            params={"confirm": slug},
            timeout=30,
        )
        if r.status_code == 200:
            print(f"[QA cleanup] tenant borrado: {tenant_id} ({slug})")
        else:
            print(f"[QA cleanup] fallo al borrar tenant {tenant_id} ({r.status_code}): {r.text}")
    except requests.RequestException as exc:
        print(f"[QA cleanup] error al borrar tenant {tenant_id}: {exc}")


def cleanup_qa_user(user_id: str, api: str) -> None:
    """Borra un usuario huerfano (sin tenant) vía DELETE /platform/users/:id.

    Util para flujos que fallan antes de crear el tenant (registro sin
    completar onboarding). Requiere SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD.
    """
    if not user_id:
        return

    headers = _super_admin_headers(api)
    if not headers:
        print(
            f"[QA cleanup skipped] user={user_id} — "
            "set SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD para limpieza automatica"
        )
        return

    try:
        r = requests.delete(f"{api}/platform/users/{user_id}", headers=headers, timeout=30)
        if r.status_code == 200:
            print(f"[QA cleanup] usuario huerfano borrado: {user_id}")
        else:
            print(f"[QA cleanup] fallo al borrar usuario {user_id} ({r.status_code}): {r.text}")
    except requests.RequestException as exc:
        print(f"[QA cleanup] error al borrar usuario {user_id}: {exc}")
