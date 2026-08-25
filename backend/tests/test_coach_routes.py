def test_coach_analysis(client, auth_headers):
    headers = auth_headers(client, "coachuser", "pass123")
    resp = client.get("/coach/analysis", headers=headers)
    assert resp.status_code == 200, resp.text
    assert "consistency" in resp.json()

def test_coach_advice(client, auth_headers):
    headers = auth_headers(client, "coachuser2", "pass123")
    # Needs a goal
    client.post("/goals", json={
        "goal_type": "lift",
        "exercise_id": 1,
        "target_weight_kg": 100,
        "target_date": "2026-12-31"
    }, headers=headers)
    
    resp = client.get("/coach/advice?goal_id=1", headers=headers)
    assert resp.status_code == 200, resp.text
    assert "Start logging" in resp.text
