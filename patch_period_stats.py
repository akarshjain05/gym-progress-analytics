import re

with open('backend/app/routers/analytics.py', 'r') as f:
    content = f.read()

period_old = """def _period_stats(user_id: int, start: date_type, end: date_type, db: Session) -> dict:
    # We need logs < end for PR calculation
    all_lift_logs = (
        db.query(models.LiftLog)
        .filter(models.LiftLog.user_id == user_id, models.LiftLog.date < end)
        .order_by(models.LiftLog.date.asc())
        .all()
    )
    
    # Other logs for consistency just need to be in range
    weight_logs = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == user_id, models.BodyWeightLog.date >= start, models.BodyWeightLog.date < end)
        .all()
    )
    calorie_logs = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.user_id == user_id, models.CalorieLog.date >= start, models.CalorieLog.date < end)
        .all()
    )
    
    active_days = set()
    def _parse_date(d):
        if not d: return None
        if hasattr(d, 'date'): return d.date()
        if isinstance(d, str):
            try:
                from datetime import datetime
                return datetime.strptime(d.split('T')[0], "%Y-%m-%d").date()
            except:
                return None
        return d
        
    total_volume_kg = 0.0
    pr_count = 0
    max_1rm_by_ex = {}
    
    for l in all_lift_logs:
        pd = _parse_date(l.date)
        if not pd: continue
        
        # Calculate 1RM
        est_1rm = calc.estimate_1rm_epley(l.weight_kg, l.reps) if l.weight_kg and l.reps else 0.0
        
        # PR logic
        is_pr = False
        prev_max = max_1rm_by_ex.get(l.exercise_id, 0)
        if est_1rm > prev_max:
            max_1rm_by_ex[l.exercise_id] = est_1rm
            is_pr = True
            
        # Is it in our target window?
        if pd >= start and pd < end:
            active_days.add(pd)
            if l.weight_kg and l.reps:
                total_volume_kg += (l.weight_kg * l.reps)
            if is_pr:
                pr_count += 1"""

period_new = """def _period_stats(user_id: int, start: date_type, end: date_type, db: Session) -> dict:
    from sqlalchemy import func
    
    # Fast paths for unbounded PR check: pre-compute max 1RM before start
    prev_maxes = db.query(
        models.LiftLog.exercise_id, 
        func.max(models.LiftLog.weight_kg * (1.0 + models.LiftLog.reps / 30.0)).label('max_1rm')
    ).filter(
        models.LiftLog.user_id == user_id, 
        models.LiftLog.date < start
    ).group_by(models.LiftLog.exercise_id).all()
    
    max_1rm_by_ex = {row.exercise_id: row.max_1rm or 0.0 for row in prev_maxes}
    
    # We only fetch lift logs in the target window
    lift_logs_in_period = (
        db.query(models.LiftLog)
        .filter(models.LiftLog.user_id == user_id, models.LiftLog.date >= start, models.LiftLog.date < end)
        .order_by(models.LiftLog.date.asc())
        .all()
    )
    
    # Other logs for consistency just need to be in range
    weight_logs = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == user_id, models.BodyWeightLog.date >= start, models.BodyWeightLog.date < end)
        .all()
    )
    calorie_logs = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.user_id == user_id, models.CalorieLog.date >= start, models.CalorieLog.date < end)
        .all()
    )
    
    active_days = set()
    def _parse_date(d):
        if not d: return None
        if hasattr(d, 'date'): return d.date()
        if isinstance(d, str):
            try:
                from datetime import datetime
                return datetime.strptime(d.split('T')[0], "%Y-%m-%d").date()
            except:
                return None
        return d
        
    total_volume_kg = 0.0
    pr_count = 0
    
    for l in lift_logs_in_period:
        pd = _parse_date(l.date)
        if not pd: continue
        
        active_days.add(pd)
        if l.weight_kg and l.reps:
            total_volume_kg += (l.weight_kg * l.reps)
            
        est_1rm = calc.estimate_1rm_epley(l.weight_kg, l.reps) if l.weight_kg and l.reps else 0.0
        
        prev_max = max_1rm_by_ex.get(l.exercise_id, 0)
        if est_1rm > prev_max:
            max_1rm_by_ex[l.exercise_id] = est_1rm
            pr_count += 1"""

content = content.replace(period_old, period_new)

with open('backend/app/routers/analytics.py', 'w') as f:
    f.write(content)
