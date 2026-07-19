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

        weight_logs = db.query(models.BodyWeightLog).filter(models.BodyWeightLog.user_id == user_id).order_by(models.BodyWeightLog.date.asc()).all()
        current_bw = weight_logs[-1].weight_kg if weight_logs else 70.0
        gender = user.gender if user.gender else "male"

        insights = []

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

            latest_1rm = calc.best_estimated_1rm(sessions[session_dates[-1]])
            exercise = db.get(models.Exercise, exercise_id)
            name = exercise.name if exercise else "Exercise"

            pct = None
            pct_data = calc.get_strength_percentile(name, gender, current_bw, latest_1rm)
            if pct_data:
                pct = pct_data["percentile"]
            if pct is not None and pct > 0:
                insights.append({
                    "type": "percentile",
                    "title": name,
                    "text": f"You {name.lower()} more than {pct}% of {gender} lifters your bodyweight.",
                    "value": pct
                })

            first_1rm = calc.best_estimated_1rm(sessions[baseline_date])
            change = calc.percent_change(first_1rm, latest_1rm)
            if change is not None and change != 0:
                sign = "+" if change > 0 else ""
                insights.append({
                    "type": "trend",
                    "title": f"{name} Progress",
                    "text": f"{sign}{change}% over the last 90 days ({first_1rm}kg → {latest_1rm}kg est. 1RM)",
                    "value": change
                })

        if len(weight_logs) >= 2:
            cutoff = weight_logs[-1].date - timedelta(days=28)
            recent = [(w.date, w.weight_kg) for w in weight_logs if w.date >= cutoff]
            rate = calc.weekly_rate_of_change(recent) if len(recent) >= 2 else None
            if rate is not None and abs(rate) >= 0.05:
                direction = "gaining" if rate > 0 else "losing"
                insights.append({
                    "type": "weight",
                    "title": "Body Weight",
                    "text": f"You're {direction} about {abs(rate)}kg/week over the last 4 weeks",
                    "value": abs(rate)
                })

        percentiles = sorted([i for i in insights if i["type"] == "percentile"], key=lambda x: x["value"], reverse=True)
        trends = sorted([i for i in insights if i["type"] == "trend"], key=lambda x: x["value"], reverse=True)
        weights = [i for i in insights if i["type"] == "weight"]
        
        final_insights = percentiles[:3] + trends[:3] + weights

        return {"insights": final_insights}
    finally:
        db.close()
