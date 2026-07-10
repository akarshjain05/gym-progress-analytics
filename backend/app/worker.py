import os
from celery import Celery

celery_app = Celery(
    "gym_analytics_worker",
    broker=os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    task_track_started=True,
    task_time_limit=3600,
    beat_schedule={
        'daily-inactivity-check': {
            'task': 'run_inactivity_check',
            'schedule': 86400.0, # Run every 24 hours
        },
    }
)

from sqlalchemy.orm import Session
from .database import SessionLocal
from . import models, calculations as calc, push_notifications
from collections import defaultdict
from datetime import timedelta, timezone, datetime

IST = timezone(timedelta(hours=5, minutes=30))

def ist_today():
    return datetime.now(IST).date()

def ist_week_start():
    today = ist_today()
    return today - timedelta(days=today.weekday())

@celery_app.task(name="run_inactivity_check")
def run_inactivity_check():
    db: Session = SessionLocal()
    try:
        push_notifications.notify_inactivity_check(db)
    finally:
        db.close()

@celery_app.task(name="generate_insights")
def generate_insights(user_id: int):
    db: Session = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return {"insights": []}

        lines = []
        today_ist = ist_today()
        week_start_ist = ist_week_start()

        lift_logs = db.query(models.LiftLog).filter(models.LiftLog.user_id == user_id).order_by(models.LiftLog.date.asc()).all()
        by_exercise = defaultdict(list)
        for log in lift_logs:
            by_exercise[log.exercise_id].append(log)

        for exercise_id, entries in by_exercise.items():
            sessions = defaultdict(list)
            for e in entries:
                sessions[e.date].append((e.weight_kg, e.reps))
            session_dates = sorted(sessions.keys())
            if len(session_dates) < 2: continue

            cutoff = session_dates[-1] - timedelta(days=90)
            recent_dates = [d for d in session_dates if d >= cutoff]
            baseline_date = recent_dates[0] if recent_dates else session_dates[0]

            first_1rm = calc.best_estimated_1rm(sessions[baseline_date])
            latest_1rm = calc.best_estimated_1rm(sessions[session_dates[-1]])
            change = calc.percent_change(first_1rm, latest_1rm)
            if change is None or change == 0: continue

            exercise = db.get(models.Exercise, exercise_id)
            name = exercise.name if exercise else "Exercise"
            sign = "+" if change > 0 else ""
            lines.append(f"{name} {sign}{change}% over the last 90 days ({first_1rm}kg → {latest_1rm}kg est. 1RM)")

        weight_logs = db.query(models.BodyWeightLog).filter(models.BodyWeightLog.user_id == user_id).order_by(models.BodyWeightLog.date.asc()).all()
        if len(weight_logs) >= 2:
            cutoff = weight_logs[-1].date - timedelta(days=28)
            recent = [(w.date, w.weight_kg) for w in weight_logs if w.date >= cutoff]
            rate = calc.weekly_rate_of_change(recent) if len(recent) >= 2 else None
            if rate is not None and abs(rate) >= 0.05:
                direction = "gaining" if rate > 0 else "losing"
                lines.append(f"You're {direction} about {abs(rate)}kg/week over the last 4 weeks")

        return {"insights": lines}
    finally:
        db.close()
