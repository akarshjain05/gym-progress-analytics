def test_analytics_compare(client, auth_headers):
    headers = auth_headers(client, "analytics_u1", "pass123")
    resp = client.get("/analytics/compare?days=30", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "current" in data
    assert "past" in data

def test_analytics_wrapped(client, auth_headers):
    headers = auth_headers(client, "analytics_u2", "pass123")
    resp = client.get("/analytics/wrapped?year=2024", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "active_days" in data

def test_analytics_strength_percentiles(client, auth_headers):
    headers = auth_headers(client, "analytics_u3", "pass123")
    resp = client.get("/analytics/strength-percentiles", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), dict) and "available" in resp.json()
