import re

with open('backend/app/routers/admin.py', 'r') as f:
    content = f.read()

# Add joinedload import if missing
if 'from sqlalchemy.orm import joinedload' not in content:
    content = content.replace('from sqlalchemy.orm import Session', 'from sqlalchemy.orm import Session, joinedload')

# Patch lift logs
content = content.replace(
    'lift_logs = db.query(models.LiftLog).order_by(models.LiftLog.id.desc()).limit(30).all()',
    'lift_logs = db.query(models.LiftLog).options(joinedload(models.LiftLog.user), joinedload(models.LiftLog.exercise)).order_by(models.LiftLog.id.desc()).limit(30).all()'
)
# Patch weight logs
content = content.replace(
    'weight_logs = db.query(models.BodyWeightLog).order_by(models.BodyWeightLog.id.desc()).limit(30).all()',
    'weight_logs = db.query(models.BodyWeightLog).options(joinedload(models.BodyWeightLog.user)).order_by(models.BodyWeightLog.id.desc()).limit(30).all()'
)
# Patch workout templates
content = content.replace(
    'templates = db.query(models.WorkoutTemplate).order_by(models.WorkoutTemplate.id.desc()).limit(30).all()',
    'templates = db.query(models.WorkoutTemplate).options(joinedload(models.WorkoutTemplate.user)).order_by(models.WorkoutTemplate.id.desc()).limit(30).all()'
)
# Patch goals
content = content.replace(
    'goals = db.query(models.Goal).order_by(models.Goal.id.desc()).limit(30).all()',
    'goals = db.query(models.Goal).options(joinedload(models.Goal.user)).order_by(models.Goal.id.desc()).limit(30).all()'
)

with open('backend/app/routers/admin.py', 'w') as f:
    f.write(content)
