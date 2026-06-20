import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

os.environ.setdefault("SECRET_KEY", "test-secret")

from app.main import app
from app.database import Base, get_db
from app.seed_exercises import seed_exercises


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)
    seed_db = TestingSessionLocal()
    seed_exercises(seed_db)
    seed_db.close()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def auth_headers(client, username="alice", password="hunter22"):
    client.post("/auth/register", json={"username": username, "email": f"{username}@example.com", "password": password})
    resp = client.post("/auth/login", data={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_register_and_login(client):
    headers = auth_headers(client)
    resp = client.get("/profile/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "alice"


def test_duplicate_username_rejected(client):
    client.post("/auth/register", json={"username": "bob", "email": "bob@example.com", "password": "password1"})
    resp = client.post("/auth/register", json={"username": "bob", "email": "bob2@example.com", "password": "password1"})
    assert resp.status_code == 400


def test_unauthenticated_request_rejected(client):
    resp = client.get("/profile/me")
    assert resp.status_code == 401


def test_weight_logging_and_upsert(client):
    headers = auth_headers(client)
    r1 = client.post("/weight", json={"date": "2026-01-01", "weight_kg": 80.0}, headers=headers)
    assert r1.status_code == 201
    # Re-logging same day should UPDATE, not create a duplicate
    r2 = client.post("/weight", json={"date": "2026-01-01", "weight_kg": 79.8}, headers=headers)
    assert r2.status_code == 201
    logs = client.get("/weight", headers=headers).json()
    assert len(logs) == 1
    assert logs[0]["weight_kg"] == 79.8


def test_weight_summary_trend_and_goal_projection(client):
    headers = auth_headers(client)
    client.put("/profile/me", json={"goal_weight_kg": 75.0}, headers=headers)
    # Log a clean linear loss of 0.5kg/week over 6 weeks (42 days)
    import datetime
    base = datetime.date(2026, 1, 1)
    for i in range(7):
        d = base + datetime.timedelta(days=7 * i)
        w = 80 - 0.5 * i
        resp = client.post("/weight", json={"date": d.isoformat(), "weight_kg": w}, headers=headers)
        assert resp.status_code == 201

    summary = client.get("/weight/summary", headers=headers).json()
    assert summary["has_data"] is True
    assert summary["current_weight_kg"] == pytest.approx(77.0, abs=0.01)
    assert summary["weekly_rate_kg"] == pytest.approx(-0.5, abs=0.05)
    assert summary["estimated_days_to_goal"] is not None
    assert summary["estimated_days_to_goal"] > 0


def test_exercise_list_includes_predefined(client):
    headers = auth_headers(client)
    resp = client.get("/exercises", headers=headers)
    assert resp.status_code == 200
    names = [e["name"] for e in resp.json()]
    assert "Bench Press" in names
    assert "Squat" in names


def test_custom_exercise_isolated_per_user(client):
    headers_a = auth_headers(client, "userA", "passwordA1")
    headers_b = auth_headers(client, "userB", "passwordB1")
    client.post("/exercises", json={"name": "Sled Push", "category": "compound"}, headers=headers_a)

    names_a = [e["name"] for e in client.get("/exercises", headers=headers_a).json()]
    names_b = [e["name"] for e in client.get("/exercises", headers=headers_b).json()]
    assert "Sled Push" in names_a
    assert "Sled Push" not in names_b


def test_lift_logging_and_progress_percent_increase(client):
    headers = auth_headers(client)
    exercises = client.get("/exercises", headers=headers).json()
    bench = next(e for e in exercises if e["name"] == "Bench Press")

    # session 1: 80kg x 5 -> 1RM ~93.33
    client.post("/lifts", json={"exercise_id": bench["id"], "date": "2026-01-01", "weight_kg": 80, "reps": 5}, headers=headers)
    # session 2 (later, +20% roughly): 96kg x 5 -> 1RM 112
    client.post("/lifts", json={"exercise_id": bench["id"], "date": "2026-02-01", "weight_kg": 96, "reps": 5}, headers=headers)

    progress = client.get(f"/lifts/progress/{bench['id']}", headers=headers).json()
    assert progress["has_data"] is True
    assert progress["first_session_1rm_kg"] == pytest.approx(93.33, abs=0.01)
    assert progress["latest_session_1rm_kg"] == pytest.approx(112.0, abs=0.01)
    assert progress["change_pct"] == pytest.approx(20.0, abs=0.1)
    assert progress["personal_record_1rm_kg"] == pytest.approx(112.0, abs=0.01)


def test_lift_log_rejects_invalid_exercise(client):
    headers = auth_headers(client)
    resp = client.post("/lifts", json={"exercise_id": 999999, "date": "2026-01-01", "weight_kg": 80, "reps": 5}, headers=headers)
    assert resp.status_code == 404


def test_personal_records_endpoint(client):
    headers = auth_headers(client)
    exercises = client.get("/exercises", headers=headers).json()
    bench = next(e for e in exercises if e["name"] == "Bench Press")
    squat = next(e for e in exercises if e["name"] == "Squat")

    client.post("/lifts", json={"exercise_id": bench["id"], "date": "2026-01-01", "weight_kg": 80, "reps": 5}, headers=headers)
    client.post("/lifts", json={"exercise_id": squat["id"], "date": "2026-01-01", "weight_kg": 120, "reps": 3}, headers=headers)

    prs = client.get("/lifts/personal-records", headers=headers).json()
    assert len(prs) == 2
    pr_names = {p["exercise"] for p in prs}
    assert pr_names == {"Bench Press", "Squat"}


def test_calorie_logging_and_actual_tdee():
    pass  # covered in dedicated test below for clarity


def test_nutrition_summary_actual_tdee_from_real_data(client):
    headers = auth_headers(client)
    import datetime
    base = datetime.date(2026, 1, 1)
    # 14 days, eating 2200 avg, losing 1kg total over the period
    for i in range(14):
        d = base + datetime.timedelta(days=i)
        client.post("/nutrition", json={"date": d.isoformat(), "calories": 2200}, headers=headers)
    client.post("/weight", json={"date": base.isoformat(), "weight_kg": 80.0}, headers=headers)
    client.post("/weight", json={"date": (base + datetime.timedelta(days=13)).isoformat(), "weight_kg": 79.0}, headers=headers)

    summary = client.get("/nutrition/summary", headers=headers).json()
    assert summary["has_calorie_data"] is True
    assert summary["avg_calories_all_time"] == 2200
    # deficit 1kg/14days*7700 = 550kcal/day deficit -> actual tdee ~ 2750
    assert summary["actual_tdee_estimate_kcal"] == pytest.approx(2750, abs=5)


def test_calorie_log_upsert_same_day(client):
    headers = auth_headers(client)
    client.post("/nutrition", json={"date": "2026-01-01", "calories": 2000}, headers=headers)
    client.post("/nutrition", json={"date": "2026-01-01", "calories": 2500}, headers=headers)
    logs = client.get("/nutrition", headers=headers).json()
    assert len(logs) == 1
    assert logs[0]["calories"] == 2500


def test_goal_lift_set_and_list(client):
    headers = auth_headers(client)
    exercises = client.get("/exercises", headers=headers).json()
    bench = next(e for e in exercises if e["name"] == "Bench Press")
    resp = client.post("/goals", json={"exercise_id": bench["id"], "target_weight_kg": 100, "target_reps": 1}, headers=headers)
    assert resp.status_code == 201
    goals = client.get("/goals", headers=headers).json()
    assert len(goals) == 1
    assert goals[0]["target_weight_kg"] == 100


def test_dashboard_streak_tracking(client):
    headers = auth_headers(client)
    import datetime
    today = datetime.date.today()
    client.post("/weight", json={"date": today.isoformat(), "weight_kg": 80}, headers=headers)
    client.post("/weight", json={"date": (today - datetime.timedelta(days=1)).isoformat(), "weight_kg": 80.2}, headers=headers)
    client.post("/weight", json={"date": (today - datetime.timedelta(days=2)).isoformat(), "weight_kg": 80.4}, headers=headers)
    # gap on day 3
    client.post("/weight", json={"date": (today - datetime.timedelta(days=4)).isoformat(), "weight_kg": 80.6}, headers=headers)

    dash = client.get("/analytics/dashboard", headers=headers).json()
    assert dash["current_streak_days"] == 3
    assert dash["longest_streak_days"] == 3


def test_insights_generated_from_data(client):
    headers = auth_headers(client)
    exercises = client.get("/exercises", headers=headers).json()
    bench = next(e for e in exercises if e["name"] == "Bench Press")
    client.post("/lifts", json={"exercise_id": bench["id"], "date": "2026-01-01", "weight_kg": 80, "reps": 5}, headers=headers)
    client.post("/lifts", json={"exercise_id": bench["id"], "date": "2026-02-01", "weight_kg": 96, "reps": 5}, headers=headers)

    resp = client.get("/analytics/insights", headers=headers).json()
    joined = " ".join(resp["insights"])
    assert "Bench Press" in joined
    assert "+20" in joined or "20.0" in joined


def test_users_cannot_see_each_others_data(client):
    headers_a = auth_headers(client, "isolA", "passwordA1")
    headers_b = auth_headers(client, "isolB", "passwordB1")
    client.post("/weight", json={"date": "2026-01-01", "weight_kg": 70}, headers=headers_a)

    logs_a = client.get("/weight", headers=headers_a).json()
    logs_b = client.get("/weight", headers=headers_b).json()
    assert len(logs_a) == 1
    assert len(logs_b) == 0


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
