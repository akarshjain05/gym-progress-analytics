with open('backend/app/export.py', 'r') as f:
    content = f.read()

bad_block = """    # Workout sessions (history)
    workout_sessions = []
    try:
        from . import models as m
        if hasattr(m, 'WorkoutSession'):
            sessions = db.query(m.WorkoutSession).filter(
                m.WorkoutSession.user_id == user.id
            ).order_by(m.WorkoutSession.date.desc()).all()
            workout_sessions = [
                {
                    "date": str(s.date),
                    "template_name": s.template_name,
                    "duration_seconds": s.duration_seconds,
                    "exercises_count": s.exercises_count,
                    "sets_count": s.sets_count,
                    "notes": s.notes,
                }
                for s in sessions
            ]
    except Exception:
        logger.exception(f"Failed to fetch workout sessions for user {user.id} during export")"""

good_block = """    # Workout sessions (history)
    sessions = db.query(models.WorkoutSession).filter(
        models.WorkoutSession.user_id == user.id
    ).order_by(models.WorkoutSession.date.desc()).all()
    workout_sessions = [
        {
            "date": str(s.date),
            "template_name": s.template_name,
            "duration_seconds": s.duration_seconds,
            "exercises_count": s.exercises_count,
            "sets_count": s.sets_count,
            "notes": s.notes,
        }
        for s in sessions
    ]"""

content = content.replace(bad_block, good_block)

with open('backend/app/export.py', 'w') as f:
    f.write(content)
