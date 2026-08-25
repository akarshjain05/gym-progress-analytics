import pytest

def test_calc_body_metrics(client):
    resp = client.post("/calculators/body-metrics", json={
        "weight_kg": 80.0,
        "height_cm": 180.0,
        "gender": "male"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "bmi" in data
    assert "ibw_kg" in data
    assert "lbm_kg" in data
    assert "ffmi" in data

def test_calc_powerlifting(client):
    resp = client.post("/calculators/powerlifting", json={
        "weight_kg": 80.0,
        "total_kg": 500.0,
        "gender": "male"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "wilks_score" in data
    assert "dots_score" in data
    assert data["wilks_score"] > 0

def test_calc_macros(client):
    resp = client.post("/calculators/macros", json={
        "calories": 2500,
        "goal": "maintain"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "protein_g" in data
    assert "carbs_g" in data
    assert "fat_g" in data
