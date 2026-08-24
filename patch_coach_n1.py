import re

with open('backend/app/routers/coach.py', 'r') as f:
    content = f.read()

# 1. _predict_strength_hybrid
hybrid_loop = """    results = []
    for eid, logs in by_exercise.items():
        ex = db.get(models.Exercise, eid)"""

hybrid_replacement = """    eids = list(by_exercise.keys())
    exercises = {ex.id: ex for ex in db.query(models.Exercise).filter(models.Exercise.id.in_(eids)).all()}
    
    results = []
    for eid, logs in by_exercise.items():
        ex = exercises.get(eid)"""
content = content.replace(hybrid_loop, hybrid_replacement)

# 2. _muscle_group_volume
muscle_loop = """    exercise_cache: dict[int, models.Exercise] = {}
    recent_vol: dict[str, float] = defaultdict(float)
    prev_vol: dict[str, float] = defaultdict(float)

    for log in lift_logs:
        if log.exercise_id not in exercise_cache:
            exercise_cache[log.exercise_id] = db.get(models.Exercise, log.exercise_id)
        ex = exercise_cache[log.exercise_id]"""

muscle_replacement = """    recent_vol: dict[str, float] = defaultdict(float)
    prev_vol: dict[str, float] = defaultdict(float)
    
    eids = list({log.exercise_id for log in lift_logs})
    exercises = {ex.id: ex for ex in db.query(models.Exercise).filter(models.Exercise.id.in_(eids)).all()}

    for log in lift_logs:
        ex = exercises.get(log.exercise_id)"""
content = content.replace(muscle_loop, muscle_replacement)

with open('backend/app/routers/coach.py', 'w') as f:
    f.write(content)
