import time
import requests

API = "https://api-panelshowroom-3c0c.up.railway.app/api"


def login(email: str, password: str) -> dict:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("token"), data
    return {"Authorization": f"Bearer {data['token']}"}


def test_brand_request_is_accepted_by_admin():
    admin = {**__AUTH_HEADERS__}
    stamp = int(time.time())
    slug = f"req-brand-{stamp}"
    email = f"qa-{slug}@example.com"
    password = f"Temp{stamp}Aa!"

    brand_res = requests.post(
        f"{API}/brands",
        headers=admin,
        json={
            "name": f"Req Brand {stamp}",
            "slug": slug,
            "contactEmail": email,
            "whatsapp": "5215512345678",
            "active": True,
            "createUser": True,
            "password": password,
            "userName": f"Brand {stamp}",
        },
        timeout=30,
    )
    assert brand_res.status_code == 201, brand_res.text
    brand = brand_res.json()
    assert brand.get("id")
    assert brand.get("whatsapp") == "5215512345678"

    brand_headers = login(email, password)
    sku = f"SKU-{stamp}"
    create_req = requests.post(
        f"{API}/product-requests",
        headers=brand_headers,
        json={
            "type": "CREATE_PRODUCT",
            "name": f"Producto Solicitud {stamp}",
            "sku": sku,
            "price": 99.5,
            "quantity": 4,
            "minStock": 2,
            "notes": "Observacion de prueba",
        },
        timeout=30,
    )
    assert create_req.status_code == 201, create_req.text
    request_id = create_req.json()["id"]

    denied = requests.post(
        f"{API}/products",
        headers=brand_headers,
        json={"name": "Directo", "sku": f"DIR-{stamp}", "quantity": 1},
        timeout=30,
    )
    assert denied.status_code == 403, denied.text

    pending = requests.get(f"{API}/product-requests?status=PENDING", headers=admin, timeout=30)
    assert pending.status_code == 200, pending.text
    ids = [item["id"] for item in pending.json()]
    assert request_id in ids

    accept = requests.post(
        f"{API}/product-requests/accept",
        headers=admin,
        json={"ids": [request_id]},
        timeout=30,
    )
    assert accept.status_code == 200, accept.text

    products = requests.get(f"{API}/products", headers=admin, timeout=30)
    assert products.status_code == 200, products.text
    match = next((p for p in products.json() if p.get("sku") == sku), None)
    assert match is not None, "Producto aceptado no aparecio en catalogo"
    assert match.get("stock", {}).get("quantity") == 4


test_brand_request_is_accepted_by_admin()
