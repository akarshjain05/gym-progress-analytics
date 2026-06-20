from datetime import date as date_type, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models, calculations as calc
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/weight", tags=["weight"])


@router.post("", response_model=schemas.WeightLogOut, status_code=201)
def log_weight(
    payload: schemas.WeightLogIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # One entry per day per user - if today's already logged, update it
    # instead of erroring, since re-weighing and correcting same-day is common.
    existing = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id, models.BodyWeightLog.date == payload.date)
        .first()
    )
    if existing:
        existing.weight_kg = payload.weight_kg
        existing.body_fat_pct = payload.body_fat_pct
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return existing

    entry = models.BodyWeightLog(user_id=current_user.id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=list[schemas.WeightLogOut])
def list_weight_logs(
    start: Optional[date_type] = None,
    end: Optional[date_type] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.BodyWeightLog).filter(models.BodyWeightLog.user_id == current_user.id)
    if start:
        q = q.filter(models.BodyWeightLog.date >= start)
    if end:
        q = q.filter(models.BodyWeightLog.date <= end)
    return q.order_by(models.BodyWeightLog.date.asc()).all()


@router.delete("/{log_id}", status_code=204)
def delete_weight_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.id == log_id, models.BodyWeightLog.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Weight log not found")
    db.delete(entry)
    db.commit()
    return None


@router.get("/summary")
def weight_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Trend, 7-day moving average, weekly rate, and goal projection."""
    logs = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id)
        .order_by(models.BodyWeightLog.date.asc())
        .all()
    )
    if not logs:
        return {
            "has_data": False,
            "message": "No weight logs yet - log your weight to see trends.",
        }

    dates = [l.date for l in logs]
    weights = [l.weight_kg for l in logs]

    sma7 = calc.simple_moving_average(weights, window=7)
    current_weight = weights[-1]
    starting_weight = weights[0]

    # Rate of change calculated over the trailing 28 days (or all data if shorter)
    cutoff = dates[-1] - timedelta(days=28)
    recent = [(d, w) for d, w in zip(dates, weights) if d >= cutoff]
    weekly_rate = calc.weekly_rate_of_change(recent) if len(recent) >= 2 else None

    days_to_goal = None
    if current_user.goal_weight_kg:
        days_to_goal = calc.project_days_to_goal(current_weight, current_user.goal_weight_kg, weekly_rate)

    return {
        "has_data": True,
        "starting_weight_kg": starting_weight,
        "current_weight_kg": current_weight,
        "total_change_kg": round(current_weight - starting_weight, 2),
        "total_change_pct": calc.percent_change(starting_weight, current_weight),
        "weekly_rate_kg": weekly_rate,
        "goal_weight_kg": current_user.goal_weight_kg,
        "estimated_days_to_goal": days_to_goal,
        "series": [
            {"date": d.isoformat(), "weight_kg": w, "moving_avg_7d": sma}
            for d, w, sma in zip(dates, weights, sma7)
        ],
    }
