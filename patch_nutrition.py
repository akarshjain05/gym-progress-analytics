import re

with open('backend/app/routers/nutrition.py', 'r') as f:
    content = f.read()

# Add IntegrityError import
if 'IntegrityError' not in content:
    content = content.replace('from sqlalchemy.orm import Session', 'from sqlalchemy.orm import Session\nfrom sqlalchemy.exc import IntegrityError')

old_logic = """    existing = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.user_id == current_user.id, models.CalorieLog.date == payload.date)
        .first()
    )
    if existing:
        for field, value in payload.model_dump().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    entry = models.CalorieLog(user_id=current_user.id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry"""

new_logic = """    existing = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.user_id == current_user.id, models.CalorieLog.date == payload.date)
        .first()
    )
    if existing:
        for field, value in payload.model_dump().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    entry = models.CalorieLog(user_id=current_user.id, **payload.model_dump())
    db.add(entry)
    try:
        db.commit()
        db.refresh(entry)
        return entry
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(models.CalorieLog)
            .filter(models.CalorieLog.user_id == current_user.id, models.CalorieLog.date == payload.date)
            .first()
        )
        if existing:
            for field, value in payload.model_dump().items():
                setattr(existing, field, value)
            db.commit()
            db.refresh(existing)
            return existing
        raise"""

content = content.replace(old_logic, new_logic)

with open('backend/app/routers/nutrition.py', 'w') as f:
    f.write(content)
