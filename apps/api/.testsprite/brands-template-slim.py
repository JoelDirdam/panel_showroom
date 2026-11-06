"""GET /brands/template returns a slim XLSX with only the 7 fillable columns."""
import io
import os
import zipfile
import xml.etree.ElementTree as ET

import requests

_raw = (
    os.environ.get("TARGET_URL")
    or os.environ.get("API_BASE")
    or "https://api-panelshowroom-3c0c.up.railway.app"
).rstrip("/")
BASE = _raw if _raw.endswith("/api") else f"{_raw}/api"

EXPECTED_HEADERS = [
    "name",
    "monthlyRent",
    "assignedSpace",
    "phone",
    "commissionPercent",
    "contactEmail",
    "whatsapp",
]


def _headers() -> dict:
    try:
        return {**__AUTH_HEADERS__}
    except NameError:
        email = os.environ.get("ADMIN_EMAIL")
        password = os.environ.get("ADMIN_PASSWORD") or os.environ.get("SEED_PASSWORD")
        assert email and password, "ADMIN_EMAIL/ADMIN_PASSWORD or injected auth required"
        login = requests.post(
            f"{BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=30,
        )
        assert login.status_code == 200, login.text
        return {"Authorization": f"Bearer {login.json()['token']}"}


def _first_sheet_row_values(xlsx_bytes: bytes) -> list[str]:
    """Read shared-string / inline values from the first row of sheet1 without Excel libs."""
    with zipfile.ZipFile(io.BytesIO(xlsx_bytes)) as zf:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            for si in root.findall("m:si", ns):
                texts = [t.text or "" for t in si.findall(".//m:t", ns)]
                shared.append("".join(texts))

        sheet_name = next(
            (n for n in zf.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")),
            None,
        )
        assert sheet_name, zf.namelist()
        sheet = ET.fromstring(zf.read(sheet_name))
        ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        rows = sheet.findall("m:sheetData/m:row", ns)
        assert rows, "sheet has no rows"
        values: list[str] = []
        for c in rows[0].findall("m:c", ns):
            cell_type = c.get("t")
            v = c.find("m:v", ns)
            if v is None or v.text is None:
                continue
            if cell_type == "s":
                values.append(shared[int(v.text)])
            else:
                values.append(v.text)
        return values


def test_brands_template_has_seven_columns():
    headers = _headers()
    res = requests.get(f"{BASE}/brands/template", headers=headers, timeout=30)
    assert res.status_code == 200, res.text
    ctype = res.headers.get("Content-Type", "")
    assert "spreadsheetml" in ctype or "octet-stream" in ctype, ctype
    assert res.content[:2] == b"PK", "response must be a ZIP/XLSX (not an exe spoof)"

    row = _first_sheet_row_values(res.content)
    assert row == EXPECTED_HEADERS, row
    assert "cutoffDate" not in row
    assert "cardFeePayer" not in row
    assert "transferFeePayer" not in row


test_brands_template_has_seven_columns()
