import pytest

def test_export_json(client, auth_headers):
    headers = auth_headers(client, "exportuser", "password")
    
    # Log some data first
    client.post("/measurements", json={"date": "2026-07-01", "chest": 100}, headers=headers)
    
    resp = client.get("/export/json", headers=headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/json"
    
    data = resp.json()
    assert "profile" in data
    assert "body_weight_logs" in data
    assert data["profile"]["username"] == "exportuser"

def test_export_csv(client, auth_headers):
    headers = auth_headers(client, "exportuser2", "password")
    
    # Log data
    client.post("/measurements", json={"date": "2026-07-01", "chest": 100}, headers=headers)
    
    resp = client.get("/export/csv", headers=headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/csv; charset=utf-8"
    assert "attachment; filename" in resp.headers["content-disposition"]
    
    content = resp.text
    assert "# PROFILE" in content
    assert "exportuser2" in content
    assert "# BODY WEIGHT LOGS" in content
