import re

with open('backend/app/routers/analytics.py', 'r') as f:
    content = f.read()

new_routes = """
from sqlalchemy import func

@router.get("/volume")
def get_volume_data(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Group by ISO year and week
    # SQLite strftime('%Y-%W', date) gives Year-Week
    rows = db.query(
        func.strftime('%Y-%W', models.LiftLog.date).label('week'),
        func.min(models.LiftLog.date).label('week_start'),
        func.sum(models.LiftLog.weight_kg * models.LiftLog.reps).label('volume')
    ).filter(models.LiftLog.user_id == current_user.id).group_by('week').order_by('week').all()
    
    return [{"week_label": row.week_start, "volume": row.volume} for row in rows]

@router.get("/muscle_volume")
def get_muscle_volume_data(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    rows = db.query(
        models.Exercise.muscle_group,
        func.sum(models.LiftLog.weight_kg * models.LiftLog.reps).label('volume')
    ).join(models.Exercise).filter(
        models.LiftLog.user_id == current_user.id,
        models.Exercise.muscle_group != None
    ).group_by(models.Exercise.muscle_group).all()
    
    return {row.muscle_group: row.volume for row in rows if row.muscle_group}
"""

content += new_routes

with open('backend/app/routers/analytics.py', 'w') as f:
    f.write(content)
