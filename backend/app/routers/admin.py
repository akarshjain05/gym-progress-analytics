from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import schemas, models
from ..database import get_db
from ..security import get_current_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[schemas.AdminUserOut])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Admin only: Get a list of all registered users."""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return users


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Admin only: Delete a user by ID."""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself.")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    db.delete(user)
    db.commit()
    return {"message": f"User {user.username} deleted successfully."}


@router.post("/promote/{user_id}")
def promote_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Admin only: Promote a user to admin."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="User is already an admin.")
    
    user.role = "admin"
    db.commit()
    return {"message": f"User {user.username} is now an admin."}


@router.get("/stats", response_model=schemas.AdminStatsOut)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    total_users = db.query(func.count(models.User.id)).scalar()
    total_workouts = db.query(func.count(models.WorkoutSession.id)).scalar()
    total_lift_logs = db.query(func.count(models.LiftLog.id)).scalar()
    total_weight_logs = db.query(func.count(models.BodyWeightLog.id)).scalar()
    total_goals = db.query(func.count(models.Goal.id)).scalar()

    return schemas.AdminStatsOut(
        total_users=total_users or 0,
        total_workouts=total_workouts or 0,
        total_lift_logs=total_lift_logs or 0,
        total_weight_logs=total_weight_logs or 0,
        total_goals=total_goals or 0
    )


@router.get("/logs", response_model=List[schemas.AdminLogEntryOut])
def get_admin_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    logs = []
    
    # Lift Logs
    lift_logs = db.query(models.LiftLog).order_by(models.LiftLog.id.desc()).limit(30).all()
    for l in lift_logs:
        logs.append(schemas.AdminLogEntryOut(
            log_id=l.id,
            log_type="lift",
            user_id=l.user.id,
            username=l.user.username,
            email=l.user.email,
            date=l.date,
            description=f"Logged {l.weight_kg}kg x {l.reps} reps for {l.exercise.name}"
        ))
        
    # Weight Logs
    weight_logs = db.query(models.BodyWeightLog).order_by(models.BodyWeightLog.id.desc()).limit(30).all()
    for w in weight_logs:
        logs.append(schemas.AdminLogEntryOut(
            log_id=w.id,
            log_type="weight",
            user_id=w.user.id,
            username=w.user.username,
            email=w.user.email,
            date=w.date,
            description=f"Logged body weight: {w.weight_kg}kg"
        ))
        
    # Workout Sessions
    workouts = db.query(models.WorkoutSession).order_by(models.WorkoutSession.id.desc()).limit(30).all()
    for w in workouts:
        logs.append(schemas.AdminLogEntryOut(
            log_id=w.id,
            log_type="workout",
            user_id=w.user.id,
            username=w.user.username,
            email=w.user.email,
            date=w.date,
            description=f"Completed workout: {w.template_name} ({w.exercises_count} exercises)"
        ))
        
    # Goals
    goals = db.query(models.Goal).order_by(models.Goal.id.desc()).limit(30).all()
    for g in goals:
        desc = f"Set a new {g.goal_type} goal"
        if g.goal_type == "lift" and g.exercise:
            desc = f"Set lift goal: {g.target_weight_kg}kg for {g.exercise.name}"
        elif g.goal_type == "weight":
            desc = f"Set weight goal: {g.target_body_weight_kg}kg"
            
        logs.append(schemas.AdminLogEntryOut(
            log_id=g.id,
            log_type="goal",
            user_id=g.user.id,
            username=g.user.username,
            email=g.user.email,
            date=g.created_at.date(),
            description=desc
        ))

    # Sort combined logs by date (newest first) and limit to top 100
    logs.sort(key=lambda x: getattr(x, "date", ""), reverse=True)
    return logs[:100]


@router.delete("/logs/{log_type}/{log_id}")
def delete_admin_log(
    log_type: str,
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    model_map = {
        "lift": models.LiftLog,
        "weight": models.BodyWeightLog,
        "workout": models.WorkoutSession,
        "goal": models.Goal,
    }
    
    if log_type not in model_map:
        raise HTTPException(status_code=400, detail="Invalid log type")
        
    ModelClass = model_map[log_type]
    log = db.query(ModelClass).filter(ModelClass.id == log_id).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
        
    db.delete(log)
    db.commit()
    return {"message": "Log deleted successfully"}
