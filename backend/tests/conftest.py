import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

os.environ.setdefault("SECRET_KEY", "test-token")
os.environ.setdefault("TESTING", "1")

from app.main import app
from app.database import Base, get_db
from app.seed_exercises import seed_exercises
from app import models

# Disable rate limiting for integration tests
app.state.limiter.enabled = False

# Run Celery tasks synchronously in tests
from app.worker import celery_app
celery_app.conf.update(task_always_eager=True)

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
        c.TestingSessionLocal = TestingSessionLocal
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture()
def auth_headers():
    def _auth_headers(client, username="alice", password="hunter22", is_admin=False):
        client.post("/auth/register", json={"username": username, "email": f"{username}@example.com", "password": password})
        db = client.TestingSessionLocal()
        user = db.query(models.User).filter_by(username=username).first()
        if user:
            user.email_verified = True
            if is_admin:
                user.role = "admin"
            db.commit()
        db.close()
        resp = client.post("/auth/login", data={"username": username, "password": password})
        assert resp.status_code == 200, resp.text
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return _auth_headers
