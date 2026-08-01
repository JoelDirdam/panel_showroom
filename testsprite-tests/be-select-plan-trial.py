import os
import time
import requests

API = os.environ.get("TARGET_URL") or "https://api-panelshowroom-3c0c.up.railway.app/api"
API = API.rstrip("/")
if not API.endswith("/api"):
    API = f"{API}/api"

DAY_MS = 24 * 60 * 60 * 1000
TRIAL_BASE_DAYS = 15


def register_fresh_tenant(tag: str) -> dict:
    terms = requests.get(f"{API}/terms/current", timeout=30)
    assert terms.status_code == 200, terms.text
    version = terms.json()["version"]

    stamp = int(time.time() * 1000)
    email = f"qa-plan-{tag}-{stamp}@example.com"
    password = f"Temp{stamp}Aa!"

    reg = requests.post(
        f"{API}/auth/register",
        json={
            "name": f"QA Plan {tag}",
            "email": email,
            "password": password,
            "signedName": f"QA Plan {tag}",
            "termsVersion": version,
        },
        timeout=30,
    )
    assert reg.status_code == 201, reg.text
    body = reg.json()
    return {"Authorization": f"Bearer {body['token']}"}


def trial_days(trial_ends_at: str) -> int:
    from datetime import datetime, timezone

    ends = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    return round((ends - now).total_seconds() / (24 * 60 * 60))


def test_select_plan_without_promo_grants_15_day_trial():
    headers = register_fresh_tenant("sin-promo")

    r = requests.post(
        f"{API}/onboarding/select-plan",
        headers=headers,
        json={"planType": "NEGOCIO"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    assert user["onboardingStep"] == "PLAN_SELECTED", user
    sub = user["subscription"]
    assert sub is not None
    assert sub["planType"] == "NEGOCIO"
    assert sub["status"] == "TRIALING"
    assert sub["promoCodeUsed"] is None
    days = trial_days(sub["trialEndsAt"])
    assert TRIAL_BASE_DAYS - 1 <= days <= TRIAL_BASE_DAYS, f"esperaba ~{TRIAL_BASE_DAYS} dias, obtuve {days}"


def test_select_plan_with_maneki30_extends_trial_to_30_days():
    headers = register_fresh_tenant("con-promo")

    r = requests.post(
        f"{API}/onboarding/select-plan",
        headers=headers,
        json={"planType": "NEGOCIO", "promoCode": "maneki30"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    sub = user["subscription"]
    assert sub["promoCodeUsed"] == "MANEKI30", sub
    days = trial_days(sub["trialEndsAt"])
    assert 29 <= days <= 30, f"esperaba ~30 dias con MANEKI30, obtuve {days}"


def test_select_plan_with_invalid_promo_code_is_rejected():
    headers = register_fresh_tenant("promo-invalido")

    r = requests.post(
        f"{API}/onboarding/select-plan",
        headers=headers,
        json={"planType": "NEGOCIO", "promoCode": "NOEXISTE123"},
        timeout=30,
    )
    assert r.status_code == 400, r.text


test_select_plan_without_promo_grants_15_day_trial()
test_select_plan_with_maneki30_extends_trial_to_30_days()
test_select_plan_with_invalid_promo_code_is_rejected()
