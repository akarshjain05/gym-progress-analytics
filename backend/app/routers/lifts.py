from collections import defaultdict
from datetime import date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models, calculations as calc
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/lifts", tags=["lifts"])

# Muscle group display order for PRs
MUSCLE_GROUP_ORDER = [
    "chest", "back", "shoulders", "legs", "quads",
    "hamstrings", "glutes", "biceps", "triceps", "core", "calves", "other"
]


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


BODYWEIGHT_EXERCISE_NAMES = {
    "pull-up", "pullup", "pull up",
    "chin-up", "chinup", "chin up",
    "dip",
    "hanging leg raise",
    "plank",
}


def _is_bodyweight_exercise(exercise_name: str) -> bool:
    return exercise_name.strip().lower() in BODYWEIGHT_EXERCISE_NAMES


def _get_strength_info(
    exercise_name: str,
    gender: Optional[str],
    bodyweight_kg: Optional[float],
    pr_1rm: float,
    best_reps: int = 0,
) -> dict:
    """
    Returns strength level + breakpoints.

    For bodyweight exercises (dip, pull-up, chin-up, hanging leg raise, plank):
      - Uses best_reps for classification, not weight
      - breakpoints are rep counts (or seconds for plank), not kg
      - is_bodyweight = True so frontend shows reps scale

    For weighted exercises:
      - Uses pr_1rm / bodyweight ratio
      - breakpoints are kg values
    """
    is_bw = _is_bodyweight_exercise(exercise_name)

    # Bodyweight exercises only need gender, not bodyweight_kg
    if is_bw:
        if not gender or gender == "other":
            return {
                "level": None,
                "reason": "Add gender in Profile to see your strength level",
                "breakpoints_kg": None,
                "is_bodyweight": True,
                "best_reps": best_reps,
            }
        level = calc.classify_bodyweight_exercise(exercise_name, gender, best_reps)
        breakpoints = calc.get_strength_standard_info(exercise_name, gender, bodyweight_kg or 70)
        return {
            "level": level or "beginner",
            "reason": None,
            "breakpoints_kg": breakpoints,  # actually rep breakpoints for BW exercises
            "is_bodyweight": True,
            "best_reps": best_reps,
        }

    # Weighted exercises need both gender and bodyweight
    if not gender or not bodyweight_kg or bodyweight_kg <= 0:
        return {
            "level": None,
            "reason": "Add bodyweight and gender in Profile to see your strength level",
            "breakpoints_kg": None,
            "is_bodyweight": False,
            "best_reps": 0,
        }

    if gender == "other":
        return {
            "level": None,
            "reason": "Strength standards are only available for male/female profiles",
            "breakpoints_kg": None,
            "is_bodyweight": False,
            "best_reps": 0,
        }

    level = calc.classify_strength_level(exercise_name, gender, bodyweight_kg, pr_1rm)
    breakpoints = calc.get_strength_standard_info(exercise_name, gender, bodyweight_kg)

    if level is None and breakpoints is None:
        return {
            "level": None,
            "reason": "No population standard available for this exercise yet",
            "breakpoints_kg": None,
            "is_bodyweight": False,
            "best_reps": 0,
        }

    return {
        "level": level or "beginner",
        "reason": None,
        "breakpoints_kg": breakpoints,
        "is_bodyweight": False,
        "best_reps": 0,
    }


@router.get("/progress/{exercise_id}")
def lift_progress(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Per-exercise progress with:
    - Sessions grouped by date with all sets listed
    - Strength level + full breakpoint scale for visual display
    - Best 1RM per session for the chart
    """
    exercise = _get_owned_exercise(db, exercise_id, current_user)
    logs = (
        db.query(models.LiftLog)
        .filter(models.LiftLog.user_id == current_user.id, models.LiftLog.exercise_id == exercise_id)
        .order_by(models.LiftLog.date.asc(), models.LiftLog.set_number.asc())
        .all()
    )
    if not logs:
        return {"has_data": False, "exercise": exercise.name, "message": "No logs yet for this exercise."}

    # Group by date — preserve set order
    sessions: dict[date_type, list[models.LiftLog]] = defaultdict(list)
    for log in logs:
        sessions[log.date].append(log)

    session_dates = sorted(sessions.keys(), reverse=True)  # newest first for display

    # Build series (oldest first) for chart
    series = []
    for d in sorted(sessions.keys()):
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

    # Sessions grouped by date with individual sets (newest first)
    sessions_grouped = []
    for d in session_dates:
        day_logs = sessions[d]
        sets_list = []
        for log in sorted(day_logs, key=lambda x: (x.set_number or 0)):
            sets_list.append({
                "id": log.id,
                "set_number": log.set_number,
                "weight_kg": log.weight_kg,
                "reps": log.reps,
                "rpe": log.rpe,
                "notes": log.notes,
            })
        day_1rm = calc.best_estimated_1rm([(s["weight_kg"], s["reps"]) for s in sets_list])
        sessions_grouped.append({
            "date": d.isoformat(),
            "sets": sets_list,
            "set_count": len(sets_list),
            "best_1rm_kg": round(day_1rm, 1),
            "volume_kg": round(sum(s["weight_kg"] * s["reps"] for s in sets_list), 1),
        })

    first_1rm = series[0]["estimated_1rm_kg"]
    latest_1rm = series[-1]["estimated_1rm_kg"]
    pr_1rm = max(s["estimated_1rm_kg"] for s in series)
    pr_session = next(s for s in series if s["estimated_1rm_kg"] == pr_1rm)

    # Get bodyweight for strength classification
    latest_bw = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id)
        .order_by(models.BodyWeightLog.date.desc())
        .first()
    )
    bw_kg = latest_bw.weight_kg if latest_bw else None

    # For bodyweight exercises (dip, pull-up etc.) use max reps as the metric
    best_reps_ever = 0
    latest_session_best_reps = 0
    if _is_bodyweight_exercise(exercise.name):
        best_reps_ever = max((log.reps for log in logs), default=0)
        # Latest session = most recent date's best reps
        latest_date = session_dates[0]  # session_dates is newest first
        latest_session_best_reps = max(
            (log.reps for log in sessions[latest_date]), default=0
        )

    strength_info = _get_strength_info(
        exercise.name, current_user.gender, bw_kg, pr_1rm, best_reps=best_reps_ever
    )

    return {
        "has_data": True,
        "exercise": exercise.name,
        "muscle_group": exercise.muscle_group,
        "category": exercise.category,
        "is_bodyweight": _is_bodyweight_exercise(exercise.name),
        "first_session_1rm_kg": first_1rm,
        "latest_session_1rm_kg": latest_1rm,
        "change_pct": calc.percent_change(first_1rm, latest_1rm),
        "personal_record_1rm_kg": pr_1rm,
        "personal_record_date": pr_session["date"],
        "best_reps_ever": best_reps_ever,
        "latest_session_best_reps": latest_session_best_reps,
        # Strength level with full breakpoints
        "approximate_strength_level": strength_info["level"],
        "strength_reason": strength_info["reason"],
        "strength_breakpoints_kg": strength_info["breakpoints_kg"],
        "is_bodyweight_exercise": strength_info["is_bodyweight"],
        "bodyweight_kg": bw_kg,
        # Sessions newest first with all sets
        "sessions_grouped": sessions_grouped,
        # Chart data oldest first
        "series": series,
    }


@router.get("/personal-records")
def all_personal_records(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    All-time best estimated 1RM per exercise, grouped by muscle group.
    Also includes strength level for each exercise.
    """
    logs = db.query(models.LiftLog).filter(models.LiftLog.user_id == current_user.id).all()
    if not logs:
        return {"grouped": [], "flat": []}

    by_exercise: dict[int, list[models.LiftLog]] = defaultdict(list)
    for log in logs:
        by_exercise[log.exercise_id].append(log)

    latest_bw = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id)
        .order_by(models.BodyWeightLog.date.desc())
        .first()
    )
    bw_kg = latest_bw.weight_kg if latest_bw else None

    flat = []
    for exercise_id, entries in by_exercise.items():
        exercise = db.get(models.Exercise, exercise_id)
        if not exercise:
            continue
        best = max(entries, key=lambda e: calc.estimate_1rm_epley(e.weight_kg, e.reps))
        pr_1rm = calc.estimate_1rm_epley(best.weight_kg, best.reps)

        # For bodyweight exercises use max reps as metric
        best_reps = max((e.reps for e in entries), default=0) if _is_bodyweight_exercise(exercise.name) else 0
        strength_info = _get_strength_info(
            exercise.name, current_user.gender, bw_kg, pr_1rm, best_reps=best_reps
        )

        flat.append({
            "exercise_id": exercise_id,
            "exercise": exercise.name,
            "muscle_group": exercise.muscle_group or "other",
            "category": exercise.category,
            "is_bodyweight": _is_bodyweight_exercise(exercise.name),
            "best_reps": best_reps,
            "estimated_1rm_kg": pr_1rm,
            "achieved_with": {"weight_kg": best.weight_kg, "reps": best.reps},
            "date": best.date.isoformat(),
            "strength_level": strength_info["level"],
            "strength_breakpoints_kg": strength_info["breakpoints_kg"],
        })

    # Group by muscle group in anatomical order
    by_group: dict[str, list] = defaultdict(list)
    for pr in flat:
        group = pr["muscle_group"].lower() if pr["muscle_group"] else "other"
        by_group[group].append(pr)

    # Sort within each group by 1RM descending
    for group in by_group:
        by_group[group].sort(key=lambda x: x["estimated_1rm_kg"], reverse=True)

    # Build ordered groups list
    grouped = []
    seen = set()
    for group_key in MUSCLE_GROUP_ORDER:
        if group_key in by_group:
            grouped.append({
                "muscle_group": group_key,
                "label": group_key.capitalize(),
                "records": by_group[group_key],
            })
            seen.add(group_key)

    # Any groups not in our order list go at the end
    for group_key, records in by_group.items():
        if group_key not in seen:
            grouped.append({
                "muscle_group": group_key,
                "label": group_key.capitalize(),
                "records": records,
            })

    return {
        "grouped": grouped,
        "flat": sorted(flat, key=lambda r: r["estimated_1rm_kg"], reverse=True),
    }