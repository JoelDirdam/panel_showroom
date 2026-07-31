import time
import requests

API = "https://api-panelshowroom-3c0c.up.railway.app/api"


def login(email: str, password: str) -> dict:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_withdrawal_request_is_accepted_and_decrements_stock():
    admin = {**__AUTH_HEADERS__}
    stamp = int(time.time())
    slug = f"req-withdrawal-{stamp}"
    email = f"{slug}@example.com"
    password = f"Temp{stamp}Aa!"

    brand_res = requests.post(
        f"{API}/brands",
        headers=admin,
        json={
            "name": f"Withdrawal Brand {stamp}",
            "slug": slug,
            "contactEmail": email,
            "active": True,
            "createUser": True,
            "password": password,
            "userName": f"Brand {stamp}",
        },
        timeout=30,
    )
    assert brand_res.status_code == 201, brand_res.text

    brand_headers = login(email, password)

    # El usuario de marca recien creado (createUser=true) no tiene aceptados los
    # terminos vigentes: requireTerms bloquea cualquier ruta autenticada hasta
    # que firme. El flujo FE lo resuelve con un redirect a /onboarding/accept-terms;
    # aqui se replica esa firma antes de operar.
    terms_current = requests.get(f"{API}/terms/current", timeout=30)
    assert terms_current.status_code == 200, terms_current.text
    accept = requests.post(
        f"{API}/auth/accept-terms",
        headers=brand_headers,
        json={"signedName": f"Brand {stamp}", "termsVersion": terms_current.json()["version"]},
        timeout=30,
    )
    assert accept.status_code == 200, accept.text

    # --- Crea el producto vía CREATE_PRODUCT + accept, con 5 unidades iniciales ---
    sku = f"SKU-WD-{stamp}"
    create_req = requests.post(
        f"{API}/product-requests",
        headers=brand_headers,
        json={
            "type": "CREATE_PRODUCT",
            "name": f"Producto Retiro {stamp}",
            "sku": sku,
            "price": 50,
            "quantity": 5,
            "minStock": 1,
        },
        timeout=30,
    )
    assert create_req.status_code == 201, create_req.text
    create_id = create_req.json()["id"]

    accept_create = requests.post(
        f"{API}/product-requests/accept",
        headers=admin,
        json={"ids": [create_id]},
        timeout=30,
    )
    assert accept_create.status_code == 200, accept_create.text
    product_id = accept_create.json()["accepted"][0]["productId"]
    assert product_id

    products = requests.get(f"{API}/products", headers=admin, timeout=30)
    assert products.status_code == 200, products.text
    product = next(p for p in products.json() if p["id"] == product_id)
    assert product["stock"]["quantity"] == 5

    # --- Solicita retiro de una cantidad mayor al stock: debe rechazarse ---
    too_much = requests.post(
        f"{API}/product-requests",
        headers=brand_headers,
        json={"type": "WITHDRAWAL", "productId": product_id, "quantity": 999},
        timeout=30,
    )
    assert too_much.status_code == 400, too_much.text

    # --- Solicita retiro válido de 2 unidades ---
    withdrawal_req = requests.post(
        f"{API}/product-requests",
        headers=brand_headers,
        json={"type": "WITHDRAWAL", "productId": product_id, "quantity": 2, "notes": "Piezas dañadas"},
        timeout=30,
    )
    assert withdrawal_req.status_code == 201, withdrawal_req.text
    withdrawal_id = withdrawal_req.json()["id"]

    pending = requests.get(f"{API}/product-requests?status=PENDING", headers=admin, timeout=30)
    assert pending.status_code == 200, pending.text
    pending_ids = [item["id"] for item in pending.json()]
    assert withdrawal_id in pending_ids

    accept_withdrawal = requests.post(
        f"{API}/product-requests/accept",
        headers=admin,
        json={"ids": [withdrawal_id]},
        timeout=30,
    )
    assert accept_withdrawal.status_code == 200, accept_withdrawal.text
    accepted = accept_withdrawal.json()["accepted"][0]
    assert accepted["status"] == "ACCEPTED"
    assert accepted["type"] == "WITHDRAWAL"

    after = requests.get(f"{API}/products", headers=admin, timeout=30)
    assert after.status_code == 200, after.text
    product_after = next(p for p in after.json() if p["id"] == product_id)
    assert product_after["stock"]["quantity"] == 3, product_after["stock"]

    entries = requests.get(f"{API}/stock/{product_id}/entries", headers=admin, timeout=30)
    assert entries.status_code == 200, entries.text
    assert any(e.get("quantity") == -2 for e in entries.json()), entries.json()


test_withdrawal_request_is_accepted_and_decrements_stock()
