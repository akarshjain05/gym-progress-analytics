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

    # Heatmap Data (Last 90 days)
    ninety_days_ago = date.today() - timedelta(days=90)
    sessions = (
        db.query(models.WorkoutSession)
        .filter(models.WorkoutSession.user_id == current_user.id)
        .filter(models.WorkoutSession.date >= ninety_days_ago)
        .all()
    )
    
    heatmap_data = {}
    for s in sessions:
        ds = s.date.isoformat()
        heatmap_data[ds] = heatmap_data.get(ds, 0) + s.sets_count

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
