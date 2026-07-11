from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .database import Base, engine, SessionLocal
from .seed_exercises import seed_exercises
from .config import settings
from .rate_limiter import limiter
from .routers import (
    auth, profile, weight, exercises, lifts,
    nutrition, goals, analytics, coach, workout_templates,
)
from .push_notifications import router as push_router, PushSubscription
from .export import router as export_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        try:
            from sqlalchemy import text
            db.execute(text("ALTER TABLE users ADD COLUMN sidebar_collapsed BOOLEAN DEFAULT FALSE NOT NULL"))
            db.commit()
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE lift_logs ADD COLUMN session_id INTEGER REFERENCES workout_sessions(id)"))
            db.commit()
        except Exception:
            db.rollback()

        try:
            db.execute(text("ALTER TABLE workout_templates ADD COLUMN share_id VARCHAR UNIQUE"))
            db.commit()
        except Exception:
            db.rollback()

        seed_exercises(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Gym Progress Analytics API", version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(weight.router)
app.include_router(exercises.router)
app.include_router(lifts.router)
app.include_router(nutrition.router)
app.include_router(goals.router)
app.include_router(analytics.router)
app.include_router(coach.router)
app.include_router(workout_templates.router)
app.include_router(push_router)
app.include_router(export_router)


@app.get("/")
def root():
    return {"status": "ok", "service": "gym-progress-analytics-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}
