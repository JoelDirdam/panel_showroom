"""Sale decrements stock and assigns per-tenant ticket numbers."""
import os

import requests

_raw = (
    os.environ.get("TARGET_URL")
    or os.environ.get("API_BASE")
    or "http://127.0.0.1:3000"
).rstrip("/")
BASE = _raw if _raw.endswith("/api") else f"{_raw}/api"


def _headers() -> dict:
    try:
        return {**__AUTH_HEADERS__}
    except NameError:
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD")
        assert email and password, "ADMIN_EMAIL/ADMIN_PASSWORD or injected auth required"
        login = requests.post(
            f"{BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=30,
        )
        assert login.status_code == 200, login.text
        return {"Authorization": f"Bearer {login.json()['token']}"}


def _first_product(headers: dict) -> dict:
    products = requests.get(f"{BASE}/products", headers=headers, timeout=30)
    assert products.status_code == 200, products.text
    data = products.json()
    assert isinstance(data, list) and data, "need at least one product"
    return data[0]


def test_sale_decrements_stock_and_returns_ticket():
    headers = _headers()
    product = _first_product(headers)
    product_id = product["id"]
    stock_before = (product.get("stock") or {}).get("quantity", 0)
    assert stock_before >= 1, "product needs stock >= 1"

    sale = requests.post(
        f"{BASE}/sales",
        headers=headers,
        json={
            "paymentMethod": "EFECTIVO",
            "lines": [{"productId": product_id, "quantity": 1}],
        },
        timeout=30,
    )
    assert sale.status_code == 201, sale.text
    body = sale.json()
    assert isinstance(body.get("ticketNumber"), int) and body["ticketNumber"] >= 1

    refreshed = requests.get(f"{BASE}/products/{product_id}", headers=headers, timeout=30)
    assert refreshed.status_code == 200, refreshed.text
    stock_after = (refreshed.json().get("stock") or {}).get("quantity", 0)
    assert stock_after == stock_before - 1, (stock_before, stock_after)


test_sale_decrements_stock_and_returns_ticket()
