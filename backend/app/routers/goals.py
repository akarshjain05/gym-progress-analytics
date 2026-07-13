from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db
from ..security import get_current_user
from .lifts import _get_owned_exercise

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("", response_model=schemas.GoalOut, status_code=201)
def create_goal(
    payload: schemas.GoalIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.goal_type == "lift" and payload.exercise_id:
        _get_owned_exercise(db, payload.exercise_id, current_user)
        
    goal = models.Goal(user_id=current_user.id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("", response_model=list[schemas.GoalOut])
def list_goals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Goal).filter(models.Goal.user_id == current_user.id).order_by(models.Goal.created_at.desc()).all()


@router.delete("/{goal_id}", status_code=204)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = (
        db.query(models.Goal)
        .filter(models.Goal.id == goal_id, models.Goal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return None

@router.post("/{goal_id}/toggle-completion", response_model=schemas.GoalOut)
def toggle_goal_completion(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    goal = (
        db.query(models.Goal)
        .filter(models.Goal.id == goal_id, models.Goal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    goal.is_completed = not goal.is_completed
    if goal.is_completed:
        goal.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    else:
        goal.completed_at = None
        
    db.commit()
    db.refresh(goal)
    return goal
