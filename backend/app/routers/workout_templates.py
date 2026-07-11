"""
workout_templates.py — Workout Templates & Active Workout Router

Endpoints:
  GET    /templates              — list user's templates
  POST   /templates              — create template
  POST   /templates/free/finish  — finish free (no template) workout
  GET    /templates/history      — list completed workout sessions
  PATCH  /templates/history/{session_id}/notes — update session notes
  GET    /templates/{id}         — get template with exercises
  PUT    /templates/{id}         — update template name/description
  DELETE /templates/{id}         — delete template
  POST   /templates/{id}/exercises        — add exercise to template
  PUT    /templates/{id}/exercises/{eid}  — update exercise in template
  DELETE /templates/{id}/exercises/{eid} — remove exercise from template
  POST   /templates/{id}/reorder          — reorder exercises

  POST   /templates/{id}/finish  — finish active workout: saves all logged
                                   sets to lift_logs in one transaction.
                                   This is the core "end workout" endpoint.
"""

from datetime import date as date_type, datetime, timezone
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])


# ---------------------------------------------------------------------------
# Pydantic schemas (local — only used here)
# ---------------------------------------------------------------------------

class TemplateExerciseIn(BaseModel):
    exercise_id: int
    position: int = 0
    target_sets: int = Field(default=3, ge=1, le=20)
    target_reps: int = Field(default=10, ge=1, le=100)
    target_weight_kg: Optional[float] = Field(default=None, ge=0, le=600)
    rest_seconds: int = Field(default=90, ge=0, le=600)
    notes: Optional[str] = None


class TemplateExerciseUpdate(BaseModel):
    position: Optional[int] = None
    target_sets: Optional[int] = Field(default=None, ge=1, le=20)
    target_reps: Optional[int] = Field(default=None, ge=1, le=100)
    target_weight_kg: Optional[float] = Field(default=None, ge=0, le=600)
    rest_seconds: Optional[int] = Field(default=None, ge=0, le=600)
    notes: Optional[str] = None


class TemplateIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    description: Optional[str] = None
    exercises: list[TemplateExerciseIn] = []


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    description: Optional[str] = None


class ReorderIn(BaseModel):
    # List of template_exercise IDs in the new desired order
    ordered_ids: list[int]


# Logged set submitted when finishing a workout
class LoggedSet(BaseModel):
    weight_kg: float = Field(ge=0, le=600)
    reps: int = Field(ge=1, le=100)
    rpe: Optional[float] = Field(default=None, ge=1, le=10)
    completed: bool = True   # False = user skipped this set


class LoggedExercise(BaseModel):
    exercise_id: int
    sets: list[LoggedSet]
    notes: Optional[str] = None


class FinishWorkoutIn(BaseModel):
    date: date_type
    duration_seconds: Optional[int] = None   # total workout duration
    exercises: list[LoggedExercise]
    notes: Optional[str] = None


class SessionNotesIn(BaseModel):
    notes: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_template(db: Session, template_id: int, user: models.User) -> models.WorkoutTemplate:
    t = (
        db.query(models.WorkoutTemplate)
        .filter(
            models.WorkoutTemplate.id == template_id,
            models.WorkoutTemplate.user_id == user.id,
        )
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return t


def _get_exercise(db: Session, exercise_id: int, user: models.User) -> models.Exercise:
    ex = (
        db.query(models.Exercise)
        .filter(
            models.Exercise.id == exercise_id,
            (
                (models.Exercise.created_by.is_(None)) |
                (models.Exercise.created_by == user.id)
            ),
        )
        .first()
    )
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


def _template_out(t: models.WorkoutTemplate) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "share_id": t.share_id,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        "exercise_count": len(t.exercises),
        "exercises": [_tex_out(te) for te in sorted(t.exercises, key=lambda x: x.position)],
    }


def _tex_out(te: models.WorkoutTemplateExercise) -> dict:
    return {
        "id": te.id,
        "exercise_id": te.exercise_id,
        "exercise_name": te.exercise.name if te.exercise else "Unknown",
        "muscle_group": te.exercise.muscle_group if te.exercise else None,
        "position": te.position,
        "target_sets": te.target_sets,
        "target_reps": te.target_reps,
        "target_weight_kg": te.target_weight_kg,
        "rest_seconds": te.rest_seconds,
        "notes": te.notes,
    }


def _finish_workout_logic(
    payload: FinishWorkoutIn,
    db: Session,
    current_user: models.User,
    template_id: Optional[int],
    template_name: str,
):
    """Shared logic for finishing both template and free workouts."""
    from .. import calculations as calc

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
                (
                    (models.Exercise.created_by.is_(None)) |
                    (models.Exercise.created_by == current_user.id)
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
                session_id=session.id,
                date=payload.date,
                weight_kg=set_data.weight_kg,
                reps=set_data.reps,
                rpe=set_data.rpe,
                set_number=set_number,
                notes=ex_data.notes,
            )
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


# ---------------------------------------------------------------------------
# Template CRUD  (no path params — must come before /{template_id} routes)
# ---------------------------------------------------------------------------

@router.get("")
def list_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    templates = (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.user_id == current_user.id)
        .order_by(models.WorkoutTemplate.updated_at.desc())
        .all()
    )
    return [_template_out(t) for t in templates]


@router.post("", status_code=201)
def create_template(
    payload: TemplateIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Validate all exercises exist before creating anything
    for ex_in in payload.exercises:
        _get_exercise(db, ex_in.exercise_id, current_user)

    template = models.WorkoutTemplate(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description,
    )
    db.add(template)
    db.flush()  # get template.id without committing

    for i, ex_in in enumerate(payload.exercises):
        te = models.WorkoutTemplateExercise(
            template_id=template.id,
            exercise_id=ex_in.exercise_id,
            position=ex_in.position if ex_in.position else i,
            target_sets=ex_in.target_sets,
            target_reps=ex_in.target_reps,
            target_weight_kg=ex_in.target_weight_kg,
            rest_seconds=ex_in.rest_seconds,
            notes=ex_in.notes,
        )
        db.add(te)

    db.commit()
    db.refresh(template)
    return _template_out(template)


# ---------------------------------------------------------------------------
# Static-path routes — MUST be defined BEFORE /{template_id} routes
# so FastAPI doesn't try to parse "free" or "history" as an integer.
# ---------------------------------------------------------------------------

@router.post("/free/finish")
def finish_free_workout(
    payload: FinishWorkoutIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Finish a free (no template) workout session."""
    return _finish_workout_logic(payload, db, current_user, None, "Free Workout")


@router.get("/history")
def list_workout_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List completed workout sessions for the user."""
    sessions = (
        db.query(models.WorkoutSession)
        .filter(models.WorkoutSession.user_id == current_user.id)
        .order_by(models.WorkoutSession.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": s.id,
            "template_name": s.template_name,
            "date": s.date.isoformat() if s.date else None,
            "duration_seconds": s.duration_seconds,
            "exercises_count": s.exercises_count,
            "sets_count": s.sets_count,
            "notes": s.notes,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


@router.get("/history/{session_id}")
def get_workout_session_details(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get full details of a workout session including all completed sets."""
    from sqlalchemy.orm import joinedload
    session = (
        db.query(models.WorkoutSession)
        .options(joinedload(models.WorkoutSession.lift_logs).joinedload(models.LiftLog.exercise))
        .filter(
            models.WorkoutSession.id == session_id,
            models.WorkoutSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")

    # Group lift_logs by exercise
    # Note: lift_logs is populated via joinedload
    exercises_map = {}
    for log in session.lift_logs:
        if log.exercise_id not in exercises_map:
            exercises_map[log.exercise_id] = {
                "exercise_id": log.exercise_id,
                "exercise_name": log.exercise.name,
                "sets": []
            }
        exercises_map[log.exercise_id]["sets"].append({
            "id": log.id,
            "weight_kg": log.weight_kg,
            "reps": log.reps,
            "rpe": log.rpe,
            "set_number": log.set_number,
        })
        
    # Sort sets by set_number
    for ex in exercises_map.values():
        ex["sets"].sort(key=lambda s: s.get("set_number") or 0)

    return {
        "id": session.id,
        "template_id": session.template_id,
        "template_name": session.template_name,
        "date": session.date.isoformat() if session.date else None,
        "duration_seconds": session.duration_seconds,
        "exercises_count": session.exercises_count,
        "sets_count": session.sets_count,
        "notes": session.notes,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "exercises": list(exercises_map.values())
    }
def update_session_notes(
    session_id: int,
    payload: SessionNotesIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update the notes for a completed workout session."""
    session = (
        db.query(models.WorkoutSession)
        .filter(
            models.WorkoutSession.id == session_id,
            models.WorkoutSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")
    session.notes = payload.notes.strip() or None
    db.commit()
    return {"status": "updated", "notes": session.notes}


@router.delete("/history/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a completed workout session record (lift logs are preserved)."""
    session = (
        db.query(models.WorkoutSession)
        .filter(
            models.WorkoutSession.id == session_id,
            models.WorkoutSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Workout session not found")
    db.delete(session)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Template Sharing Routes
# ---------------------------------------------------------------------------

@router.post("/{template_id}/share")
def share_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generate a share link for a template."""
    t = _get_template(db, template_id, current_user)
    if not t.share_id:
        t.share_id = str(uuid.uuid4())
        db.commit()
    return {"share_id": t.share_id}


@router.get("/shared/{share_id}")
def get_shared_template(
    share_id: str,
    db: Session = Depends(get_db),
):
    """Public endpoint to preview a shared template."""
    t = (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.share_id == share_id)
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Shared template not found")
    
    return {
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "creator_username": t.user.username if t.user else "Unknown",
        "exercise_count": len(t.exercises),
        "exercises": [_tex_out(te) for te in sorted(t.exercises, key=lambda x: x.position)],
    }


@router.post("/shared/{share_id}/import")
def import_shared_template(
    share_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Import a shared template into the current user's account."""
    t = (
        db.query(models.WorkoutTemplate)
        .filter(models.WorkoutTemplate.share_id == share_id)
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Shared template not found")
    
    if t.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot import your own template")

    new_name = f"{t.name} (by {t.user.username})" if t.user else f"{t.name} (Imported)"
    new_template = models.WorkoutTemplate(
        user_id=current_user.id,
        name=new_name,
        description=t.description,
    )
    db.add(new_template)
    db.flush()

    for te in t.exercises:
        new_te = models.WorkoutTemplateExercise(
            template_id=new_template.id,
            exercise_id=te.exercise_id,
            position=te.position,
            target_sets=te.target_sets,
            target_reps=te.target_reps,
            target_weight_kg=te.target_weight_kg,
            rest_seconds=te.rest_seconds,
            notes=te.notes,
        )
        db.add(new_te)
    
    db.commit()
    db.refresh(new_template)
    return _template_out(new_template)


# ---------------------------------------------------------------------------
# Dynamic-path routes — /{template_id} and sub-resources
# ---------------------------------------------------------------------------

@router.get("/{template_id}")
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _template_out(_get_template(db, template_id, current_user))


@router.put("/{template_id}")
def update_template(
    template_id: int,
    payload: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = _get_template(db, template_id, current_user)
    if payload.name is not None:
        t.name = payload.name.strip()
    if payload.description is not None:
        t.description = payload.description
    t.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(t)
    return _template_out(t)


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = _get_template(db, template_id, current_user)
    db.delete(t)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Template exercise management
# ---------------------------------------------------------------------------

@router.post("/{template_id}/exercises", status_code=201)
def add_exercise_to_template(
    template_id: int,
    payload: TemplateExerciseIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = _get_template(db, template_id, current_user)
    _get_exercise(db, payload.exercise_id, current_user)

    # Auto-assign position if not specified
    max_pos = max((te.position for te in t.exercises), default=-1)
    position = payload.position if payload.position is not None else max_pos + 1

    te = models.WorkoutTemplateExercise(
        template_id=t.id,
        exercise_id=payload.exercise_id,
        position=position,
        target_sets=payload.target_sets,
        target_reps=payload.target_reps,
        target_weight_kg=payload.target_weight_kg,
        rest_seconds=payload.rest_seconds,
        notes=payload.notes,
    )
    db.add(te)
    t.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(te)
    return _tex_out(te)


@router.put("/{template_id}/exercises/{te_id}")
def update_template_exercise(
    template_id: int,
    te_id: int,
    payload: TemplateExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = _get_template(db, template_id, current_user)
    te = db.query(models.WorkoutTemplateExercise).filter(
        models.WorkoutTemplateExercise.id == te_id,
        models.WorkoutTemplateExercise.template_id == t.id,
    ).first()
    if not te:
        raise HTTPException(status_code=404, detail="Exercise entry not found in template")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(te, field, value)

    t.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(te)
    return _tex_out(te)


@router.delete("/{template_id}/exercises/{te_id}", status_code=204)
def remove_exercise_from_template(
    template_id: int,
    te_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = _get_template(db, template_id, current_user)
    te = db.query(models.WorkoutTemplateExercise).filter(
        models.WorkoutTemplateExercise.id == te_id,
        models.WorkoutTemplateExercise.template_id == t.id,
    ).first()
    if not te:
        raise HTTPException(status_code=404, detail="Exercise entry not found in template")
    db.delete(te)
    t.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return None


@router.post("/{template_id}/reorder")
def reorder_template_exercises(
    template_id: int,
    payload: ReorderIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = _get_template(db, template_id, current_user)
    te_map = {te.id: te for te in t.exercises}

    for new_pos, te_id in enumerate(payload.ordered_ids):
        if te_id not in te_map:
            raise HTTPException(
                status_code=400,
                detail=f"Exercise entry {te_id} not found in this template",
            )
        te_map[te_id].position = new_pos

    t.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return _template_out(t)


# ---------------------------------------------------------------------------
# Finish workout — the core active workout save endpoint (template-based)
# ---------------------------------------------------------------------------

@router.post("/{template_id}/finish")
def finish_workout(
    template_id: int,
    payload: FinishWorkoutIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Saves all completed sets from an active workout to lift_logs.

    Called when the user taps "Finish Workout" in the active workout screen.
    Each exercise's completed sets are saved as individual LiftLog rows,
    exactly like logging via the Lifts page — so PRs, 1RM calculations, and
    all analytics pick them up automatically.

    Skipped sets (completed=False) are not saved.
    Returns a summary: exercises logged, total sets, any new PRs detected.
    """
    # Verify template belongs to user
    tmpl = _get_template(db, template_id, current_user)
    return _finish_workout_logic(payload, db, current_user, template_id, tmpl.name)
