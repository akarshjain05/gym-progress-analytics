from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[schemas.ExerciseOut])
def list_exercises(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Returns global predefined exercises plus this user's own custom ones."""
    return (
        db.query(models.Exercise)
        .filter(or_(models.Exercise.created_by.is_(None), models.Exercise.created_by == current_user.id))
        .order_by(models.Exercise.name.asc())
        .all()
    )


@router.post("", response_model=schemas.ExerciseOut, status_code=201)
def create_custom_exercise(
    payload: schemas.ExerciseIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = (
        db.query(models.Exercise)
        .filter(models.Exercise.name == payload.name, models.Exercise.created_by == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already have a custom exercise with this name")

    exercise = models.Exercise(
        name=payload.name,
        category=payload.category,
        muscle_group=payload.muscle_group,
        secondary_muscle=payload.secondary_muscle,
        equipment=payload.equipment,
        difficulty=payload.difficulty,
        instructions=payload.instructions,
        is_custom=True,
        created_by=current_user.id,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=204)
def delete_custom_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    exercise = (
        db.query(models.Exercise)
        .filter(models.Exercise.id == exercise_id, models.Exercise.created_by == current_user.id)
        .first()
    )
    if not exercise:
        raise HTTPException(status_code=404, detail="Custom exercise not found (predefined exercises can't be deleted)")
    db.delete(exercise)
    db.commit()
    return None
