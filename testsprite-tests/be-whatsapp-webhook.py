"""Webhook público de WhatsApp: GET challenge y POST ACK-first (siempre 200)."""
import os
import time

import requests

_raw = (
    os.environ.get("TARGET_URL")
    or os.environ.get("API_BASE")
    or "https://api-panelshowroom-3c0c.up.railway.app"
).rstrip("/")
BASE = _raw if _raw.endswith("/api") else f"{_raw}/api"
V1 = f"{BASE}/v1"
WEBHOOK = f"{V1}/whatsapp/webhook"


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


def test_whatsapp_webhook_ack_first():
    headers = _headers()
    verify_token = f"verify-qa-{int(time.time())}"
    challenge = "challenge-qa-42"

    denied = requests.get(
        WEBHOOK,
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "token-invalido",
            "hub.challenge": challenge,
        },
        timeout=15,
    )
    assert denied.status_code == 403, denied.text

    configured = requests.put(
        f"{V1}/whatsapp-config",
        headers=headers,
        json={
            "phoneNumberId": "1234567890",
            "wabaId": "waba-qa",
            "accessToken": "secret-token-xyz",
            "webhookVerifyToken": verify_token,
            "systemPrompt": "QA webhook",
            "isActive": True,
        },
        timeout=15,
    )
    assert configured.status_code == 200, configured.text

    verified = requests.get(
        WEBHOOK,
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": verify_token,
            "hub.challenge": challenge,
        },
        timeout=15,
    )
    assert verified.status_code == 200, verified.text
    assert verified.text == challenge

    inbound = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "waba-qa",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15550001111",
                                "phone_number_id": "1234567890",
                            },
                            "messages": [
                                {
                                    "from": "5215512345678",
                                    "id": f"wamid.qa.{int(time.time())}",
                                    "timestamp": str(int(time.time())),
                                    "type": "text",
                                    "text": {"body": "Hola, quiero una cita"},
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }
    received = requests.post(WEBHOOK, json=inbound, timeout=15)
    assert received.status_code == 200, received.text
    assert received.text == "EVENT_RECEIVED"

    empty = requests.post(WEBHOOK, json={}, timeout=15)
    assert empty.status_code == 200, empty.text
    assert empty.text == "EVENT_RECEIVED"

    invalid = requests.post(
        WEBHOOK,
        data="{not-json",
        headers={"Content-Type": "application/json"},
        timeout=15,
    )
    assert invalid.status_code == 200, invalid.text
    assert invalid.text == "EVENT_RECEIVED"


test_whatsapp_webhook_ack_first()
