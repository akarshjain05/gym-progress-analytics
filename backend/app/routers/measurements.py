from datetime import date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/measurements", tags=["measurements"])


@router.post("", response_model=schemas.BodyMeasurementOut, status_code=201)
def log_measurement(
    payload: schemas.BodyMeasurementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # One entry per day per user - if today's already logged, update it
    existing = (
        db.query(models.BodyMeasurement)
        .filter(models.BodyMeasurement.user_id == current_user.id, models.BodyMeasurement.date == payload.date)
        .first()
    )
    
    if existing:
        existing.chest = payload.chest
        existing.waist = payload.waist
        existing.neck = payload.neck
        existing.hip = payload.hip
        existing.arm = payload.arm
        existing.forearm = payload.forearm
        existing.thigh = payload.thigh
        existing.calf = payload.calf
        existing.shoulders = payload.shoulders
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return existing

    entry = models.BodyMeasurement(user_id=current_user.id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=list[schemas.BodyMeasurementOut])
def list_measurements(
    start: Optional[date_type] = None,
    end: Optional[date_type] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.BodyMeasurement).filter(models.BodyMeasurement.user_id == current_user.id)
    if start:
        q = q.filter(models.BodyMeasurement.date >= start)
    if end:
        q = q.filter(models.BodyMeasurement.date <= end)
    return q.order_by(models.BodyMeasurement.date.asc()).all()


@router.delete("/{log_id}", status_code=204)
def delete_measurement(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    entry = (
        db.query(models.BodyMeasurement)
        .filter(models.BodyMeasurement.id == log_id, models.BodyMeasurement.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Measurement log not found")
    db.delete(entry)
    db.commit()
    return None
