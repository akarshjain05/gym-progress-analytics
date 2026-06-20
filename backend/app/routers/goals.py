from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db
from ..security import get_current_user
from .lifts import _get_owned_exercise

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("", response_model=schemas.GoalLiftOut, status_code=201)
def set_lift_goal(
    payload: schemas.GoalLiftIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_owned_exercise(db, payload.exercise_id, current_user)
    existing = (
        db.query(models.GoalLift)
        .filter(models.GoalLift.user_id == current_user.id, models.GoalLift.exercise_id == payload.exercise_id)
        .first()
    )
    if existing:
        existing.target_weight_kg = payload.target_weight_kg
        existing.target_reps = payload.target_reps
        db.commit()
        db.refresh(existing)
        return existing

    goal = models.GoalLift(user_id=current_user.id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("", response_model=list[schemas.GoalLiftOut])
def list_lift_goals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.GoalLift).filter(models.GoalLift.user_id == current_user.id).all()


@router.delete("/{goal_id}", status_code=204)
def delete_lift_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = (
        db.query(models.GoalLift)
        .filter(models.GoalLift.id == goal_id, models.GoalLift.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return None
