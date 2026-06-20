from datetime import date as date_type, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models, calculations as calc
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.post("", response_model=schemas.CalorieLogOut, status_code=201)
def log_calories(
    payload: schemas.CalorieLogIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.user_id == current_user.id, models.CalorieLog.date == payload.date)
        .first()
    )
    if existing:
        for field, value in payload.model_dump().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    entry = models.CalorieLog(user_id=current_user.id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=list[schemas.CalorieLogOut])
def list_calorie_logs(
    start: Optional[date_type] = None,
    end: Optional[date_type] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.CalorieLog).filter(models.CalorieLog.user_id == current_user.id)
    if start:
        q = q.filter(models.CalorieLog.date >= start)
    if end:
        q = q.filter(models.CalorieLog.date <= end)
    return q.order_by(models.CalorieLog.date.asc()).all()


@router.delete("/{log_id}", status_code=204)
def delete_calorie_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.id == log_id, models.CalorieLog.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Calorie log not found")
    db.delete(entry)
    db.commit()
    return None


@router.get("/summary")
def nutrition_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Formula-based BMR/TDEE from profile (if age/height/gender are set),
    PLUS a data-driven 'actual TDEE' estimate back-calculated from real
    logged calories + real weight change - the two will often disagree,
    and that gap is genuinely useful information.
    """
    calorie_logs = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.user_id == current_user.id)
        .order_by(models.CalorieLog.date.asc())
        .all()
    )
    weight_logs = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id)
        .order_by(models.BodyWeightLog.date.asc())
        .all()
    )

    formula_bmr = formula_tdee = None
    if current_user.age and current_user.height_cm and current_user.gender and weight_logs:
        formula_bmr = calc.calculate_bmr(
            weight_logs[-1].weight_kg, current_user.height_cm, current_user.age, current_user.gender
        )
        formula_tdee = calc.calculate_tdee(formula_bmr, current_user.activity_level or "moderate")

    if not calorie_logs:
        return {
            "has_calorie_data": False,
            "formula_bmr_kcal": formula_bmr,
            "formula_tdee_kcal": formula_tdee,
            "message": "No calorie logs yet.",
        }

    avg_calories = round(sum(c.calories for c in calorie_logs) / len(calorie_logs), 0)

    # Actual TDEE estimate: needs overlapping window of calorie logs + weight logs
    actual_tdee = None
    if len(calorie_logs) >= 10 and len(weight_logs) >= 2:
        start_date = calorie_logs[0].date
        end_date = calorie_logs[-1].date
        num_days = (end_date - start_date).days + 1
        weight_in_range = [w for w in weight_logs if start_date <= w.date <= end_date]
        if len(weight_in_range) >= 2:
            weight_change = weight_in_range[-1].weight_kg - weight_in_range[0].weight_kg
            actual_tdee = calc.estimate_actual_tdee(avg_calories, weight_change, num_days)

    last_7 = calorie_logs[-7:]
    avg_calories_7d = round(sum(c.calories for c in last_7) / len(last_7), 0)

    return {
        "has_calorie_data": True,
        "formula_bmr_kcal": formula_bmr,
        "formula_tdee_kcal": formula_tdee,
        "actual_tdee_estimate_kcal": actual_tdee,
        "avg_calories_all_time": avg_calories,
        "avg_calories_last_7_days": avg_calories_7d,
        "days_logged": len(calorie_logs),
        "series": [
            {
                "date": c.date.isoformat(),
                "calories": c.calories,
                "protein_g": c.protein_g,
                "carbs_g": c.carbs_g,
                "fats_g": c.fats_g,
            }
            for c in calorie_logs
        ],
    }
