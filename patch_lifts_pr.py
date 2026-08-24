import re

with open('backend/app/routers/lifts.py', 'r') as f:
    content = f.read()

# Locate the function body
def_start = content.find('def all_personal_records(')
def_end = content.find('def sync_exercises(', def_start)
func_body = content[def_start:def_end]

# Patch the loop
new_func_body = func_body.replace(
    '    flat = []\n    for exercise_id, entries in by_exercise.items():\n        exercise = db.get(models.Exercise, exercise_id)',
    '    exercise_ids = list(by_exercise.keys())\n    exercises = {ex.id: ex for ex in db.query(models.Exercise).filter(models.Exercise.id.in_(exercise_ids)).all()}\n\n    flat = []\n    for exercise_id, entries in by_exercise.items():\n        exercise = exercises.get(exercise_id)'
)

content = content[:def_start] + new_func_body + content[def_end:]

with open('backend/app/routers/lifts.py', 'w') as f:
    f.write(content)
