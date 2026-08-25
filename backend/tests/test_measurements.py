import pytest

def test_measurements_crud(client, auth_headers):
    headers = auth_headers(client, "measuser", "password123")
    
    # 1. Create a measurement
    resp = client.post("/measurements", json={
        "date": "2026-06-01",
        "chest": 100.5,
        "waist": 85.0
    }, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["chest"] == 100.5
    m_id = resp.json()["id"]
    
    # 2. Update the same day (should update existing)
    resp = client.post("/measurements", json={
        "date": "2026-06-01",
        "chest": 102.0,
        "waist": 84.5
    }, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["id"] == m_id
    assert resp.json()["chest"] == 102.0
    
    # 3. List measurements
    resp = client.get("/measurements", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    
    # 4. Create another measurement
    client.post("/measurements", json={"date": "2026-06-05", "chest": 103}, headers=headers)
    
    # 5. List with date filtering
    resp = client.get("/measurements?start=2026-06-02", headers=headers)
    assert len(resp.json()) == 1
    assert resp.json()[0]["chest"] == 103.0
    
    # 6. Delete measurement
    resp = client.delete(f"/measurements/{m_id}", headers=headers)
    assert resp.status_code == 204
    
    resp = client.get("/measurements?start=2026-06-01&end=2026-06-02", headers=headers)
    assert len(resp.json()) == 0
