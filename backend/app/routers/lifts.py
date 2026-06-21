from collections import defaultdict
from datetime import date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models, calculations as calc
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/lifts", tags=["lifts"])


def _get_owned_exercise(db: Session, exercise_id: int, user: models.User) -> models.Exercise:
    exercise = (
        db.query(models.Exercise)
        .filter(
            models.Exercise.id == exercise_id,
            ((models.Exercise.created_by.is_(None)) | (models.Exercise.created_by == user.id)),
        )
        .first()
    )
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise


@router.post("", response_model=schemas.LiftLogOut, status_code=201)
def log_lift(
    payload: schemas.LiftLogIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_owned_exercise(db, payload.exercise_id, current_user)
    entry = models.LiftLog(user_id=current_user.id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/session", response_model=list[schemas.LiftLogOut], status_code=201)
def log_lift_session(
    payload: schemas.LiftSessionIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Logs every set of one session (same exercise, same date) in a single
    request. set_number is assigned automatically in the order given, so
    PRs/volume/1RM calculations - which already aggregate per exercise per
    date - pick up the whole session correctly with no extra work.
    """
    _get_owned_exercise(db, payload.exercise_id, current_user)

    entries = []
    for i, set_entry in enumerate(payload.sets, start=1):
        entry = models.LiftLog(
            user_id=current_user.id,
            exercise_id=payload.exercise_id,
            date=payload.date,
            weight_kg=set_entry.weight_kg,
            reps=set_entry.reps,
            rpe=set_entry.rpe,
            set_number=i,
            notes=payload.notes,
        )
        db.add(entry)
        entries.append(entry)

    db.commit()
    for entry in entries:
        db.refresh(entry)
    return entries


@router.get("", response_model=list[schemas.LiftLogOut])
def list_lifts(
    exercise_id: Optional[int] = None,
    start: Optional[date_type] = None,
    end: Optional[date_type] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.LiftLog).filter(models.LiftLog.user_id == current_user.id)
    if exercise_id:
        q = q.filter(models.LiftLog.exercise_id == exercise_id)
    if start:
        q = q.filter(models.LiftLog.date >= start)
    if end:
        q = q.filter(models.LiftLog.date <= end)
    return q.order_by(models.LiftLog.date.asc()).all()


@router.delete("/{log_id}", status_code=204)
def delete_lift(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = (
        db.query(models.LiftLog)
        .filter(models.LiftLog.id == log_id, models.LiftLog.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Lift log not found")
    db.delete(entry)
    db.commit()
    return None


@router.get("/progress/{exercise_id}")
def lift_progress(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Per-exercise progress: best estimated 1RM per session over time,
    all-time PR, % change from first to most recent session, volume per
    session, and an approximate strength-level classification.
    """
    exercise = _get_owned_exercise(db, exercise_id, current_user)
    logs = (
        db.query(models.LiftLog)
        .filter(models.LiftLog.user_id == current_user.id, models.LiftLog.exercise_id == exercise_id)
        .order_by(models.LiftLog.date.asc())
        .all()
    )
    if not logs:
        return {"has_data": False, "exercise": exercise.name, "message": "No logs yet for this exercise."}

    # Group sets by date (a "session")
    sessions: dict[date_type, list[models.LiftLog]] = defaultdict(list)
    for log in logs:
        sessions[log.date].append(log)

    session_dates = sorted(sessions.keys())
    series = []
    for d in session_dates:
        sets = [(s.weight_kg, s.reps) for s in sessions[d]]
        best_1rm = calc.best_estimated_1rm(sets)
        volume = sum(w * r for w, r in sets)
        top_set = max(sessions[d], key=lambda s: calc.estimate_1rm_epley(s.weight_kg, s.reps))
        series.append({
            "date": d.isoformat(),
            "estimated_1rm_kg": best_1rm,
            "volume_kg": round(volume, 1),
            "top_set": {"weight_kg": top_set.weight_kg, "reps": top_set.reps},
        })

    first_1rm = series[0]["estimated_1rm_kg"]
    latest_1rm = series[-1]["estimated_1rm_kg"]
    pr_1rm = max(s["estimated_1rm_kg"] for s in series)
    pr_session = next(s for s in series if s["estimated_1rm_kg"] == pr_1rm)

    strength_level = None
    if current_user.gender and current_user.height_cm:
        # Use most recent bodyweight if available, otherwise skip classification
        latest_bw = (
            db.query(models.BodyWeightLog)
            .filter(models.BodyWeightLog.user_id == current_user.id)
            .order_by(models.BodyWeightLog.date.desc())
            .first()
        )
        if latest_bw:
            strength_level = calc.classify_strength_level(
                exercise.name, current_user.gender, latest_bw.weight_kg, pr_1rm
            )

    return {
        "has_data": True,
        "exercise": exercise.name,
        "muscle_group": exercise.muscle_group,
        "first_session_1rm_kg": first_1rm,
        "latest_session_1rm_kg": latest_1rm,
        "change_pct": calc.percent_change(first_1rm, latest_1rm),
        "personal_record_1rm_kg": pr_1rm,
        "personal_record_date": pr_session["date"],
        "approximate_strength_level": strength_level,
        "series": series,
    }


@router.get("/personal-records")
def all_personal_records(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """All-time best estimated 1RM per exercise the user has logged."""
    logs = db.query(models.LiftLog).filter(models.LiftLog.user_id == current_user.id).all()
    if not logs:
        return []

    by_exercise: dict[int, list[models.LiftLog]] = defaultdict(list)
    for log in logs:
        by_exercise[log.exercise_id].append(log)

    results = []
    for exercise_id, entries in by_exercise.items():
        exercise = db.get(models.Exercise, exercise_id)
        best = max(entries, key=lambda e: calc.estimate_1rm_epley(e.weight_kg, e.reps))
        results.append({
            "exercise_id": exercise_id,
            "exercise": exercise.name if exercise else "Unknown",
            "muscle_group": exercise.muscle_group if exercise else None,
            "estimated_1rm_kg": calc.estimate_1rm_epley(best.weight_kg, best.reps),
            "achieved_with": {"weight_kg": best.weight_kg, "reps": best.reps},
            "date": best.date.isoformat(),
        })
    return sorted(results, key=lambda r: r["estimated_1rm_kg"], reverse=True)