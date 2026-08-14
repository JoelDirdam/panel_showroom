import os
import requests

BASE = os.environ.get("TARGET_URL") or "https://api-panelshowroom-3c0c.up.railway.app"


def _headers():
    """Use injected project auth; optionally refresh via SEED_PASSWORD login."""
    headers = {**__AUTH_HEADERS__}
    probe = requests.get(f"{BASE}/api/dashboard", headers=headers, timeout=30)
    if probe.status_code != 401:
        return headers

    password = os.environ.get("SEED_PASSWORD")
    assert password, (
        "Auth token rejected (401) and SEED_PASSWORD is not set; "
        "refresh the TestSprite project credential or set SEED_PASSWORD"
    )
    login = requests.post(
        f"{BASE}/api/auth/login",
        json={"email": "admin@showroom.com", "password": password},
        timeout=30,
    )
    assert login.status_code == 200, login.text
    token = login.json().get("token")
    assert token, login.text
    return {"Authorization": f"Bearer {token}"}


def test_dashboard_analytics_shape():
    headers = _headers()
    r = requests.get(f"{BASE}/api/dashboard/analytics", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()

    assert "kpis" in data, data
    kpis = data["kpis"]
    for key in (
        "revenueMonth",
        "revenueChangePct",
        "customersMonth",
        "customersChangePct",
        "avgTicketMonth",
        "avgTicketChangePct",
        "lowStockCount",
        "totalStockUnits",
    ):
        assert key in kpis, key

    spark = data["sparkline"]
    assert isinstance(spark.get("salesLast7Days"), list)
    assert len(spark["salesLast7Days"]) == 7
    assert isinstance(spark.get("revenueLast7Days"), list)
    assert len(spark["revenueLast7Days"]) == 7
    assert "layawaysOpen" in spark
    assert "salesWeekCount" in spark

    monthly = data["salesByBrandMonthly"]
    assert isinstance(monthly.get("months"), list)
    assert len(monthly["months"]) == 8
    assert isinstance(monthly.get("series"), list)
    assert len(monthly["series"]) >= 1

    weekly = data["weekly"]
    assert len(weekly.get("days", [])) == 7
    assert len(weekly.get("revenueByDay", [])) == 7
    assert "avgDailySales" in weekly
    assert isinstance(weekly.get("topProducts"), list)

    assert isinstance(data.get("recentSales"), list)
    assert isinstance(data.get("activities"), list)
    assert isinstance(data.get("lowStockItems"), list)


test_dashboard_analytics_shape()
