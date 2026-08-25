import re

with open('backend/app/routers/measurements.py', 'r') as f:
    content = f.read()

# Add IntegrityError import
if 'IntegrityError' not in content:
    content = content.replace('from sqlalchemy.orm import Session', 'from sqlalchemy.orm import Session\nfrom sqlalchemy.exc import IntegrityError')

old_logic = """    if existing:
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
    return entry"""

new_logic = """    if existing:
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
    try:
        db.commit()
        db.refresh(entry)
        return entry
    except IntegrityError:
        db.rollback()
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
        raise"""

content = content.replace(old_logic, new_logic)

with open('backend/app/routers/measurements.py', 'w') as f:
    f.write(content)
