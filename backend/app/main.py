from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, SessionLocal
from .seed_exercises import seed_exercises
from .config import settings
from .routers import auth, profile, weight, exercises, lifts, nutrition, goals, analytics


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


@app.get("/")
def root():
    return {"status": "ok", "service": "gym-progress-analytics-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}
