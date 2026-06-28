from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .database import Base, engine, SessionLocal
from .seed_exercises import seed_exercises
from .config import settings
from .routers import auth, profile, weight, exercises, lifts, nutrition, goals, analytics, coach

# ---------------------------------------------------------------------------
# Rate limiter
# Uses the client's real IP address. On Render, X-Forwarded-For is set by the
# load balancer, so get_remote_address correctly resolves to the real client IP.
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=[])


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_exercises(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Gym Progress Analytics API", version="1.0.0", lifespan=lifespan)

# Attach limiter to app state so route decorators can access it
app.state.limiter = limiter

# Rate limit exceeded → 429 JSON response (not a 500)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# SlowAPI middleware must come BEFORE CORSMiddleware so rate-limited requests
# still get the correct CORS headers in their 429 response
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "https://gym-progress-frontend.onrender.com",
        "https://gym-progress-frontend-wmbt.onrender.com",
    ],
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


@app.get("/")
def root():
    return {"status": "ok", "service": "gym-progress-analytics-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}