import re

with open('backend/app/routers/weight.py', 'r') as f:
    content = f.read()

# Add IntegrityError import
if 'IntegrityError' not in content:
    content = content.replace('from sqlalchemy.orm import Session', 'from sqlalchemy.orm import Session\nfrom sqlalchemy.exc import IntegrityError')

old_logic = """    existing = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id, models.BodyWeightLog.date == payload.date)
        .first()
    )
    if existing:
        existing.weight_kg = payload.weight_kg
        existing.body_fat_pct = payload.body_fat_pct
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return existing

    entry = models.BodyWeightLog(user_id=current_user.id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry"""

new_logic = """    existing = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id, models.BodyWeightLog.date == payload.date)
        .first()
    )
    if existing:
        existing.weight_kg = payload.weight_kg
        existing.body_fat_pct = payload.body_fat_pct
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return existing

    entry = models.BodyWeightLog(user_id=current_user.id, **payload.model_dump())
    db.add(entry)
    try:
        db.commit()
        db.refresh(entry)
        return entry
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(models.BodyWeightLog)
            .filter(models.BodyWeightLog.user_id == current_user.id, models.BodyWeightLog.date == payload.date)
            .first()
        )
        if existing:
            existing.weight_kg = payload.weight_kg
            existing.body_fat_pct = payload.body_fat_pct
            existing.notes = payload.notes
            db.commit()
            db.refresh(existing)
            return existing
        raise  # Should never happen"""

content = content.replace(old_logic, new_logic)

with open('backend/app/routers/weight.py', 'w') as f:
    f.write(content)
