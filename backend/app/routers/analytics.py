"""
analytics.py — fixed for IST timezone.

The key change: date_type.today() on Render returns UTC date. For users in
India (IST = UTC+5:30) this means after midnight IST but before 5:30am UTC,
"today" on the server is still yesterday — so a PR logged on June 15 IST
can appear as "this week" when it shouldn't, or vice versa.

Fix: use a helper ist_today() that returns the current date in IST always.
"""
from collections import defaultdict
from datetime import date as date_type, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, calculations as calc
from ..database import get_db
from ..security import get_current_user
from ..worker import generate_insights

router = APIRouter(prefix="/analytics", tags=["analytics"])

# IST = UTC + 5:30
IST = timezone(timedelta(hours=5, minutes=30))


def ist_today() -> date_type:
    """Returns the current date in Indian Standard Time (UTC+5:30)."""
    return datetime.now(IST).date()


def ist_week_start() -> date_type:
    """Returns Monday of the current IST week."""
    today = ist_today()
    return today - timedelta(days=today.weekday())


def _logging_streak(active_days: set[date_type]) -> dict:
    if not active_days:
        return {"current_streak_days": 0, "longest_streak_days": 0}

    today = ist_today()
    # Current streak: count back from today (or yesterday, so a day that
    # hasn't been logged YET today doesn't zero out the streak)
    current = 0
    cursor = today if today in active_days else today - timedelta(days=1)
    while cursor in active_days:
        current += 1
        cursor -= timedelta(days=1)

    longest = 0
    run = 0
    prev = None
    for d in sorted(active_days):
        if prev is not None and (d - prev).days == 1:
            run += 1
        else:
            run = 1
        longest = max(longest, run)
        prev = d

    return {"current_streak_days": current, "longest_streak_days": longest}


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    weight_logs = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id)
        .order_by(models.BodyWeightLog.date.asc())
        .all()
    )
    lift_logs = (
        db.query(models.LiftLog)
        .filter(models.LiftLog.user_id == current_user.id)
        .order_by(models.LiftLog.date.asc())
        .all()
    )
    calorie_logs = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.user_id == current_user.id)
        .order_by(models.CalorieLog.date.asc())
        .all()
    )

    active_days = {l.date for l in weight_logs} | {l.date for l in lift_logs} | {l.date for l in calorie_logs}
    streak = _logging_streak(active_days)

    current_weight = weight_logs[-1].weight_kg if weight_logs else None
    weight_change_30d = None
    if weight_logs:
        cutoff = weight_logs[-1].date - timedelta(days=30)
        baseline = next((w for w in weight_logs if w.date >= cutoff), weight_logs[0])
        weight_change_30d = round(weight_logs[-1].weight_kg - baseline.weight_kg, 2)

    avg_calories_7d = None
    if calorie_logs:
        last7 = calorie_logs[-7:]
        avg_calories_7d = round(sum(c.calories for c in last7) / len(last7), 0)

    # Heatmap Data (All time history for calendar)
    heatmap_data = {}
    for l in lift_logs:
        ds = l.date.isoformat()
        heatmap_data[ds] = heatmap_data.get(ds, 0) + 1

    return {
        "username": current_user.username,
        "current_weight_kg": current_weight,
        "weight_change_last_30d_kg": weight_change_30d,
        "goal_weight_kg": current_user.goal_weight_kg,
        "avg_calories_last_7_days": avg_calories_7d,
        "total_lift_sessions_logged": len({l.date for l in lift_logs}),
        "total_weight_entries": len(weight_logs),
        "total_calorie_entries": len(calorie_logs),
        "heatmap_data": heatmap_data,
        **streak,
    }


@router.get("/insights")
def insights(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Generate insights synchronously since it's extremely fast.
    """
    return generate_insights(current_user.id)

@router.get("/wrapped")
def wrapped(
    year: int = None,
    month: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = ist_today()
    target_year = year or today.year
    target_month = month or today.month

    # Get all logs for this month/year
    lift_logs = (
        db.query(models.LiftLog)
        .join(models.Exercise)
        .filter(
            models.LiftLog.user_id == current_user.id,
            db.func.extract('year', models.LiftLog.date) == target_year,
            db.func.extract('month', models.LiftLog.date) == target_month
        )
        .all()
    )

    weight_logs = (
        db.query(models.BodyWeightLog)
        .filter(
            models.BodyWeightLog.user_id == current_user.id,
            db.func.extract('year', models.BodyWeightLog.date) == target_year,
            db.func.extract('month', models.BodyWeightLog.date) == target_month
        )
        .all()
    )

    calorie_logs = (
        db.query(models.CalorieLog)
        .filter(
            models.CalorieLog.user_id == current_user.id,
            db.func.extract('year', models.CalorieLog.date) == target_year,
            db.func.extract('month', models.CalorieLog.date) == target_month
        )
        .all()
    )

    active_days = {l.date for l in weight_logs} | {l.date for l in lift_logs} | {l.date for l in calorie_logs}
    
    # Calculate streak just for this month's active days
    # (Simplified streak logic just for the month)
    longest_streak = 0
    current_run = 0
    prev_date = None
    for d in sorted(active_days):
        if prev_date is not None and (d - prev_date).days == 1:
            current_run += 1
        else:
            current_run = 1
        longest_streak = max(longest_streak, current_run)
        prev_date = d

    total_volume_kg = sum((l.weight_kg * l.reps) for l in lift_logs if l.weight_kg and l.reps)
    elephants = round(total_volume_kg / 4000, 2)
    
    # Muscle group tracking
    muscle_volume = defaultdict(float)
    biggest_pr_weight = 0
    biggest_pr_exercise = "Nothing yet"
    
    for l in lift_logs:
        vol = (l.weight_kg * l.reps) if l.weight_kg and l.reps else 0
        group = l.exercise.muscle_group or "other"
        muscle_volume[group] += vol
        
        # Max weight lifted (simple PR for narrative)
        if l.weight_kg and l.weight_kg > biggest_pr_weight:
            biggest_pr_weight = l.weight_kg
            biggest_pr_exercise = l.exercise.name

    most_trained_muscle = "Nothing yet"
    if muscle_volume:
        most_trained_muscle = max(muscle_volume, key=muscle_volume.get)

    month_name = date_type(target_year, target_month, 1).strftime('%B')

    return {
        "period": f"{month_name} {target_year}",
        "total_volume_kg": total_volume_kg,
        "elephants": elephants,
        "most_trained_muscle": most_trained_muscle.capitalize(),
        "biggest_pr_weight": biggest_pr_weight,
        "biggest_pr_exercise": biggest_pr_exercise,
        "longest_streak": longest_streak,
        "active_days": len(active_days)
    }
