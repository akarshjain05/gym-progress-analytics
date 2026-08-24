from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException

from app import models
from app.schemas import FinishWorkoutIn
from app import calculations as calc

def finish_workout_logic(
    payload: FinishWorkoutIn,
    db: Session,
    current_user: models.User,
    template_id: Optional[int],
    template_name: str,
):
    """Shared logic for finishing both template and free workouts."""
    if not payload.exercises:
        raise HTTPException(status_code=400, detail="No exercises to save")

    total_sets_saved = sum(
        1 for ex in payload.exercises for s in ex.sets if s.completed
    )
    if total_sets_saved == 0:
        raise HTTPException(status_code=400, detail="No completed sets to save")
        
    exercises_saved = sum(
        1 for ex in payload.exercises if any(s.completed for s in ex.sets)
    )

    session = models.WorkoutSession(
        user_id=current_user.id,
        template_id=template_id,
        template_name=template_name,
        date=payload.date,
        duration_seconds=payload.duration_seconds,
        exercises_count=exercises_saved,
        sets_count=total_sets_saved,
    )
    db.add(session)
    db.flush()

    new_prs = []

    for ex_data in payload.exercises:
        exercise = (
            db.query(models.Exercise)
            .filter(
                models.Exercise.id == ex_data.exercise_id,
                or_(
                    models.Exercise.created_by.is_(None),
                    models.Exercise.created_by == current_user.id
                ),
            )
            .first()
        )
        if not exercise:
            continue

        completed_sets = [s for s in ex_data.sets if s.completed]
        if not completed_sets:
            continue

        existing_logs = (
            db.query(models.LiftLog)
            .filter(
                models.LiftLog.user_id == current_user.id,
                models.LiftLog.exercise_id == ex_data.exercise_id,
            )
            .all()
        )
        old_pr = max(
            (calc.estimate_1rm_epley(l.weight_kg, l.reps) for l in existing_logs),
            default=0.0,
        )

        set_number = 1
        session_1rms = []
        for set_data in completed_sets:
            entry = models.LiftLog(
                user_id=current_user.id,
                exercise_id=ex_data.exercise_id,
                date=payload.date,
                weight_kg=set_data.weight_kg,
                reps=set_data.reps,
                rpe=set_data.rpe,
                set_number=set_number,
                notes=ex_data.notes,
            )
            session.lift_logs.append(entry)
            db.add(entry)
            session_1rms.append(calc.estimate_1rm_epley(set_data.weight_kg, set_data.reps))
            set_number += 1

        if session_1rms:
            session_best = max(session_1rms)
            if session_best > old_pr:
                new_prs.append({
                    "exercise": exercise.name,
                    "new_1rm_kg": round(session_best, 1),
                    "old_1rm_kg": round(old_pr, 1),
                })

    db.commit()
    db.refresh(session)

    return {
        "success": True,
        "session_id": session.id,
        "exercises_saved": exercises_saved,
        "total_sets_saved": total_sets_saved,
        "new_prs": new_prs,
        "date": payload.date.isoformat(),
    }
