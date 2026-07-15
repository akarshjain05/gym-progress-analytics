from contextlib import asynccontextmanager
import sentry_sdk

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
    nutrition, goals, analytics, coach, workout_templates, admin, calculators, measurements
)
from .push_notifications import router as push_router, PushSubscription
from .export import router as export_router
from sqlalchemy import text
from . import models


@asynccontextmanager
async def lifespan(app: FastAPI):
    import subprocess
    import os
    
    # Automatically run alembic upgrade head on startup
    # We do this via subprocess so it uses the alembic CLI context cleanly
    try:
        subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=os.path.dirname(os.path.dirname(__file__)),
            check=True
        )
    except Exception as e:
        print(f"Warning: Alembic migration failed to run automatically: {e}")

    db = SessionLocal()
    try:
        if settings.initial_admin_username:
            try:
                db.execute(
                    text("UPDATE users SET role = 'admin' WHERE username = :u AND role != 'admin'"),
                    {"u": settings.initial_admin_username}
                )
                db.commit()
            except Exception:
                db.rollback()

        seed_exercises(db)
    finally:
        db.close()
    yield


if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

app = FastAPI(title="Gym Progress Analytics API", version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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
app.include_router(admin.router)
app.include_router(calculators.router)
app.include_router(measurements.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "gym-progress-analytics-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}