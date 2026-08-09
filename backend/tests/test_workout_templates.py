import pytest
import datetime
from app import models

def get_exercise_id(client, headers, name):
    resp = client.get("/exercises", headers=headers)
    for ex in resp.json():
        if ex["name"] == name:
            return ex["id"]
    return None

def test_create_and_get_template(client, auth_headers):
    headers = auth_headers(client, "testuser", "password")
    
    # Create template
    resp = client.post("/templates", json={
        "name": "Push Day",
        "description": "Focus on chest and shoulders"
    }, headers=headers)
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert data["name"] == "Push Day"
    assert data["description"] == "Focus on chest and shoulders"
    template_id = data["id"]
    
    # Get templates
    resp = client.get("/templates", headers=headers)
    assert resp.status_code == 200
    templates = resp.json()
    assert len(templates) >= 1
    assert templates[0]["id"] == template_id

def test_update_template(client, auth_headers):
    headers = auth_headers(client, "testuser", "password")
    
    resp = client.post("/templates", json={"name": "Old Name"}, headers=headers)
    t_id = resp.json()["id"]
    
    resp = client.put(f"/templates/{t_id}", json={
        "name": "New Name",
        "description": "Updated"
    }, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"
    assert resp.json()["description"] == "Updated"

def test_delete_template(client, auth_headers):
    headers = auth_headers(client, "testuser", "password")
    
    resp = client.post("/templates", json={"name": "To Delete"}, headers=headers)
    t_id = resp.json()["id"]
    
    resp = client.delete(f"/templates/{t_id}", headers=headers)
    assert resp.status_code == 204
    
    resp = client.get("/templates", headers=headers)
    assert not any(t["id"] == t_id for t in resp.json())

def test_add_and_update_template_exercise(client, auth_headers):
    headers = auth_headers(client, "testuser", "password")
    
    # Get an exercise ID (Squat)
    sq_id = get_exercise_id(client, headers, "Squat")
    assert sq_id is not None
    
    # 1. Create template
    resp = client.post("/templates", json={"name": "Legs"}, headers=headers)
    t_id = resp.json()["id"]
    
    # 2. Add exercise
    resp = client.post(f"/templates/{t_id}/exercises", json={
        "exercise_id": sq_id,
        "target_sets": 3,
        "target_reps": 8,
        "notes": "Deep"
    }, headers=headers)
    assert resp.status_code in (200, 201)
    ex_id = resp.json()["id"]
    
    # 3. Update exercise
    resp = client.put(f"/templates/{t_id}/exercises/{ex_id}", json={
        "target_sets": 5,
        "target_reps": 5,
        "notes": "Heavier"
    }, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["target_sets"] == 5
    
    # 4. Get template with exercises
    resp = client.get(f"/templates/{t_id}", headers=headers)
    assert len(resp.json()["exercises"]) == 1
    assert resp.json()["exercises"][0]["target_sets"] == 5

def test_delete_template_exercise(client, auth_headers):
    headers = auth_headers(client, "testuser", "password")
    bc_id = get_exercise_id(client, headers, "Bicep Curl")
    
    resp = client.post("/templates", json={"name": "Arms"}, headers=headers)
    t_id = resp.json()["id"]
    
    resp = client.post(f"/templates/{t_id}/exercises", json={
        "exercise_id": bc_id,
        "target_sets": 3
    }, headers=headers)
    ex_id = resp.json()["id"]
    
    resp = client.delete(f"/templates/{t_id}/exercises/{ex_id}", headers=headers)
    assert resp.status_code == 204
    
    resp = client.get(f"/templates/{t_id}", headers=headers)
    assert len(resp.json()["exercises"]) == 0

def test_reorder_exercises(client, auth_headers):
    headers = auth_headers(client, "testuser", "password")
    
    sq_id = get_exercise_id(client, headers, "Squat")
    bp_id = get_exercise_id(client, headers, "Bench Press")
    dl_id = get_exercise_id(client, headers, "Deadlift")
    
    resp = client.post("/templates", json={"name": "Full Body"}, headers=headers)
    t_id = resp.json()["id"]
    
    id1 = client.post(f"/templates/{t_id}/exercises", json={"exercise_id": sq_id}, headers=headers).json()["id"]
    id2 = client.post(f"/templates/{t_id}/exercises", json={"exercise_id": bp_id}, headers=headers).json()["id"]
    id3 = client.post(f"/templates/{t_id}/exercises", json={"exercise_id": dl_id}, headers=headers).json()["id"]
    
    # Reorder to 3, 1, 2
    resp = client.post(f"/templates/{t_id}/reorder", json={"ordered_ids": [id3, id1, id2]}, headers=headers)
    assert resp.status_code == 200
    
    resp = client.get(f"/templates/{t_id}", headers=headers)
    exercises = resp.json()["exercises"]
    assert exercises[0]["id"] == id3
    assert exercises[1]["id"] == id1
    assert exercises[2]["id"] == id2
    assert exercises[0]["position"] == 0
    assert exercises[1]["position"] == 1
    assert exercises[2]["position"] == 2

def test_share_and_import_template(client, auth_headers):
    headers = auth_headers(client)
    
    # 1. Create a template as user 1
    resp = client.post("/templates", json={
        "name": "Sharable Routine",
        "description": "A routine to share"
    }, headers=headers)
    assert resp.status_code == 201
    template_id = resp.json()["id"]
    
    # 2. Share the template
    resp = client.post(f"/templates/{template_id}/share", headers=headers)
    assert resp.status_code == 200
    share_id = resp.json()["share_id"]
    assert share_id is not None
    
    # 3. Preview shared template (public endpoint, but we test it anyway)
    resp = client.get(f"/templates/shared/{share_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Sharable Routine"
    
    # 4. Create user 2
    client.post("/auth/register", json={
        "username": "user2_import",
        "email": "user2@import.com",
        "password": "password123"
    })
    
    # Manually verify user2 so they can login
    from app.models import User
    db = client.TestingSessionLocal()
    user2 = db.query(User).filter(User.username == "user2_import").first()
    user2.email_verified = True
    db.commit()
    db.close()
    
    login_resp = client.post("/auth/login", data={"username": "user2_import", "password": "password123"})
    user2_token = login_resp.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}
    
    # 5. Import the template as user 2
    resp = client.post(f"/templates/shared/{share_id}/import", headers=user2_headers)
    assert resp.status_code == 200
    imported_template = resp.json()
    assert imported_template["name"].startswith("Sharable Routine")
    assert imported_template["id"] != template_id
    
    # 6. Verify user 2 has the template
    resp = client.get("/templates", headers=user2_headers)
    assert resp.status_code == 200
    assert any(t["id"] == imported_template["id"] for t in resp.json())

def test_finish_workout_basic(client, auth_headers):
    headers = auth_headers(client, "testuser", "password")
    sq_id = get_exercise_id(client, headers, "Squat")
    
    resp = client.post("/templates/free/finish", json={
        "date": "2026-05-01",
        "notes": "Good workout",
        "duration_seconds": 3600,
        "exercises": [
            {
                "exercise_id": sq_id,
                "sets": [
                    {"reps": 5, "weight_kg": 100},
                    {"reps": 5, "weight_kg": 105}
                ]
            }
        ]
    }, headers=headers)
    
    assert resp.status_code in (200, 201)
    assert "session_id" in resp.json()

def test_finish_workout_pr_detection(client, auth_headers):
    headers = auth_headers(client, "testuser", "password")
    sq_id = get_exercise_id(client, headers, "Squat")
    
    # Workout 1: Squat 100kg x 5 -> epley 1RM = 100 * (1 + 5/30) = 116.67
    client.post("/templates/free/finish", json={
        "date": "2026-05-01",
        "exercises": [{"exercise_id": sq_id, "sets": [{"reps": 5, "weight_kg": 100}]}]
    }, headers=headers)
    
    # Workout 2: Squat 110kg x 5 -> epley 1RM = 110 * (1 + 5/30) = 128.33 (NEW PR)
    resp = client.post("/templates/free/finish", json={
        "date": "2026-05-02",
        "exercises": [{"exercise_id": sq_id, "sets": [{"reps": 5, "weight_kg": 110}]}]
    }, headers=headers)
    
    assert resp.status_code in (200, 201)
    
    assert len(resp.json()["new_prs"]) == 1
    assert round(resp.json()["new_prs"][0]["new_1rm_kg"], 1) == 128.3
