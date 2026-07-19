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

from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

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
    year: Optional[int] = None,
    month: Optional[int] = None,
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
            extract('year', models.LiftLog.date) == target_year,
            extract('month', models.LiftLog.date) == target_month
        )
        .all()
    )

    weight_logs = (
        db.query(models.BodyWeightLog)
        .filter(
            models.BodyWeightLog.user_id == current_user.id,
            extract('year', models.BodyWeightLog.date) == target_year,
            extract('month', models.BodyWeightLog.date) == target_month
        )
        .all()
    )

    calorie_logs = (
        db.query(models.CalorieLog)
        .filter(
            models.CalorieLog.user_id == current_user.id,
            extract('year', models.CalorieLog.date) == target_year,
            extract('month', models.CalorieLog.date) == target_month
        )
        .all()
    )

    active_days = set()
    def _parse_date(d):
        if not d: return None
        if hasattr(d, 'date'): return d.date()
        if isinstance(d, str):
            try:
                from datetime import datetime
                return datetime.strptime(d.split('T')[0], "%Y-%m-%d").date()
            except:
                return None
        return d

    for logs in (weight_logs, lift_logs, calorie_logs):
        for l in logs:
            pd = _parse_date(l.date)
            if pd:
                active_days.add(pd)
    
    # Calculate streak just for this month's active days
    # (Simplified streak logic just for the month)
    longest_streak = 0
    current_run = 0
    prev_date = None
    # Sort robustly, filtering out any uncomparable types just in case
    sorted_days = sorted([d for d in active_days if hasattr(d, 'days') or hasattr(d, 'toordinal')])
    for d in sorted_days:
        if prev_date is not None and getattr(d - prev_date, 'days', 0) == 1:
            current_run += 1
        else:
            current_run = 1
        longest_streak = max(longest_streak, current_run)
        prev_date = d

    total_volume_kg = sum((l.weight_kg * l.reps) for l in lift_logs if l.weight_kg and l.reps)
    elephants = round(total_volume_kg / 4000, 2) if total_volume_kg else 0.0
    
    # Muscle group tracking
    muscle_volume = defaultdict(float)
    biggest_pr_weight = 0
    biggest_pr_exercise = "Nothing yet"
    
    for l in lift_logs:
        vol = (l.weight_kg * l.reps) if l.weight_kg and l.reps else 0
        
        # Safely access exercise
        ex = getattr(l, 'exercise', None)
        group = getattr(ex, 'muscle_group', None) or "other"
        muscle_volume[group] += vol
        
        # Max weight lifted (simple PR for narrative)
        if l.weight_kg and l.weight_kg > biggest_pr_weight:
            biggest_pr_weight = l.weight_kg
            biggest_pr_exercise = getattr(ex, 'name', "Unknown Exercise")

    most_trained_muscle = "Nothing yet"
    if muscle_volume:
        best_muscle = max(muscle_volume, key=muscle_volume.get)
        if best_muscle:
            most_trained_muscle = best_muscle

    try:
        month_name = date_type(target_year, target_month, 1).strftime('%B')
    except Exception:
        month_name = "Month"

    return {
        "period": f"{month_name} {target_year}",
        "total_volume_kg": total_volume_kg,
        "elephants": elephants,
        "most_trained_muscle": most_trained_muscle.capitalize() if isinstance(most_trained_muscle, str) else str(most_trained_muscle),
        "biggest_pr_weight": biggest_pr_weight,
        "biggest_pr_exercise": biggest_pr_exercise,
        "longest_streak": longest_streak,
        "active_days": len(active_days)
    }

@router.get("/strength-percentiles")
def strength_percentiles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    For each of the user's logged lifts that has a strength-standards
    mapping (bench, squat, deadlift, OHP, rows, etc.), computes a smooth
    0-100 percentile — "stronger than X% of lifters your bodyweight" —
    using the user's best estimated 1RM per exercise.

    Requires gender ("male" or "female") and at least one bodyweight
    entry to be set on the profile; returns an explanatory status if
    either is missing rather than guessing.
    """
    if current_user.gender not in ("male", "female"):
        return {
            "available": False,
            "reason": "set_gender",
            "message": "Set your gender in your profile to see strength percentiles.",
            "lifts": [],
        }

    latest_weight = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id)
        .order_by(models.BodyWeightLog.date.desc())
        .first()
    )
    if not latest_weight:
        return {
            "available": False,
            "reason": "log_bodyweight",
            "message": "Log your bodyweight to see strength percentiles.",
            "lifts": [],
        }
    bodyweight_kg = latest_weight.weight_kg

    lift_logs = (
        db.query(models.LiftLog)
        .filter(models.LiftLog.user_id == current_user.id)
        .all()
    )

    # Group sets by exercise name (only exercises with a strength-standard
    # mapping are worth grouping — everything else can't produce a percentile)
    sets_by_exercise: dict[str, list[tuple[float, int]]] = defaultdict(list)
    for log in lift_logs:
        name = log.exercise.name
        if calc.EXERCISE_TO_STANDARD.get(name.strip().lower()) is None:
            continue
        sets_by_exercise[name].append((log.weight_kg, log.reps))

    results = []
    for exercise_name, sets in sets_by_exercise.items():
        best_1rm = calc.best_estimated_1rm(sets)
        if best_1rm <= 0:
            continue
        result = calc.get_strength_percentile(
            exercise_name, current_user.gender, bodyweight_kg, best_1rm
        )
        if result is None:
            continue
        results.append({
            "exercise": exercise_name,
            "best_estimated_1rm_kg": round(best_1rm, 1),
            "bodyweight_kg": bodyweight_kg,
            "percentile": result["percentile"],
            "tier": result["tier"],
        })

    results.sort(key=lambda r: r["percentile"], reverse=True)

    return {"available": True, "reason": None, "message": None, "lifts": results}


