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

    return {
        "username": current_user.username,
        "current_weight_kg": current_weight,
        "weight_change_last_30d_kg": weight_change_30d,
        "goal_weight_kg": current_user.goal_weight_kg,
        "avg_calories_last_7_days": avg_calories_7d,
        "total_lift_sessions_logged": len({l.date for l in lift_logs}),
        "total_weight_entries": len(weight_logs),
        "total_calorie_entries": len(calorie_logs),
        **streak,
    }


@router.get("/insights")
def insights(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Plain-English summary lines from the user's own data.
    All date comparisons use IST so "this week" is correct for Indian users.
    """
    lines: list[str] = []
    today_ist = ist_today()
    week_start_ist = ist_week_start()

    # --- Lift insights: % change in estimated 1RM per exercise over last 90 days ---
    lift_logs = (
        db.query(models.LiftLog)
        .filter(models.LiftLog.user_id == current_user.id)
        .order_by(models.LiftLog.date.asc())
        .all()
    )
    by_exercise = defaultdict(list)
    for log in lift_logs:
        by_exercise[log.exercise_id].append(log)

    for exercise_id, entries in by_exercise.items():
        sessions = defaultdict(list)
        for e in entries:
            sessions[e.date].append((e.weight_kg, e.reps))
        session_dates = sorted(sessions.keys())
        if len(session_dates) < 2:
            continue

        cutoff = session_dates[-1] - timedelta(days=90)
        recent_dates = [d for d in session_dates if d >= cutoff]
        baseline_date = recent_dates[0] if recent_dates else session_dates[0]

        first_1rm = calc.best_estimated_1rm(sessions[baseline_date])
        latest_1rm = calc.best_estimated_1rm(sessions[session_dates[-1]])
        change = calc.percent_change(first_1rm, latest_1rm)
        if change is None or change == 0:
            continue

        exercise = db.get(models.Exercise, exercise_id)
        name = exercise.name if exercise else "Exercise"
        sign = "+" if change > 0 else ""
        lines.append(
            f"{name} {sign}{change}% over the last 90 days ({first_1rm}kg → {latest_1rm}kg est. 1RM)"
        )

    # --- Weight insight ---
    weight_logs = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id)
        .order_by(models.BodyWeightLog.date.asc())
        .all()
    )
    if len(weight_logs) >= 2:
        cutoff = weight_logs[-1].date - timedelta(days=28)
        recent = [(w.date, w.weight_kg) for w in weight_logs if w.date >= cutoff]
        rate = calc.weekly_rate_of_change(recent) if len(recent) >= 2 else None
        if rate is not None and abs(rate) >= 0.05:
            direction = "gaining" if rate > 0 else "losing"
            lines.append(f"You're {direction} about {abs(rate)}kg/week over the last 4 weeks")

    # --- Calorie vs actual TDEE insight ---
    calorie_logs = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.user_id == current_user.id)
        .order_by(models.CalorieLog.date.asc())
        .all()
    )
    if len(calorie_logs) >= 10 and len(weight_logs) >= 2:
        start_date, end_date = calorie_logs[0].date, calorie_logs[-1].date
        num_days = (end_date - start_date).days + 1
        weight_in_range = [w for w in weight_logs if start_date <= w.date <= end_date]
        if len(weight_in_range) >= 2:
            weight_change = weight_in_range[-1].weight_kg - weight_in_range[0].weight_kg
            avg_cal = sum(c.calories for c in calorie_logs) / len(calorie_logs)
            actual_tdee = calc.estimate_actual_tdee(avg_cal, weight_change, num_days)
            if actual_tdee:
                lines.append(
                    f"Based on your logged data, your real maintenance calories are roughly {int(actual_tdee)} kcal/day"
                )

    # --- Personal records THIS WEEK (using IST week boundaries) ---
    # "This week" = Monday to today in IST, NOT a rolling 7-day window
    for exercise_id, entries in by_exercise.items():
        # Best all-time entry for this exercise
        best_ever = max(entries, key=lambda e: calc.estimate_1rm_epley(e.weight_kg, e.reps))
        best_ever_1rm = calc.estimate_1rm_epley(best_ever.weight_kg, best_ever.reps)

        # Best entry logged THIS week (IST)
        this_week_entries = [e for e in entries if e.date >= week_start_ist and e.date <= today_ist]
        if not this_week_entries:
            continue

        best_this_week = max(this_week_entries, key=lambda e: calc.estimate_1rm_epley(e.weight_kg, e.reps))
        best_this_week_1rm = calc.estimate_1rm_epley(best_this_week.weight_kg, best_this_week.reps)

        # Only show as "New PR" if this week's best equals the all-time best
        # (meaning the PR was actually set this week, not just matched from before)
        if best_this_week_1rm >= best_ever_1rm:
            exercise = db.get(models.Exercise, exercise_id)
            name = exercise.name if exercise else "Exercise"
            lines.append(
                f"New PR this week: {name} est. 1RM {best_this_week_1rm}kg "
                f"({best_this_week.weight_kg}kg x {best_this_week.reps})"
            )

    if not lines:
        lines.append("Log a few more entries (weight, lifts, calories) and insights will start showing up here.")

    return {"insights": lines}
