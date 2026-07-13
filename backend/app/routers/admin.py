from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

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
