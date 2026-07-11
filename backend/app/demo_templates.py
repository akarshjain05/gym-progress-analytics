from sqlalchemy.orm import Session
from . import models

def create_demo_templates(db: Session, user_id: int):
    """
    Creates standard Push/Pull/Legs demo templates for a user.
    """
    # Check if user already has the Push Day demo template to avoid duplicates
    existing = db.query(models.WorkoutTemplate).filter(
        models.WorkoutTemplate.user_id == user_id,
        models.WorkoutTemplate.name == "Push Day"
    ).first()
    if existing:
        return

    # Map exercise names to their IDs
    exercise_names = [
        "Bench Press", "Overhead Press", "Incline Dumbbell Press", "Tricep Pushdown",
        "Deadlift", "Lat Pulldown", "Barbell Row", "Bicep Curl",
        "Squat", "Leg Press", "Leg Extension", "Leg Curl"
    ]
    
    exercises = db.query(models.Exercise).filter(models.Exercise.name.in_(exercise_names)).all()
    ex_map = {e.name: e.id for e in exercises}

    # Define the templates
    demo_templates = [
        {
            "name": "Push Day",
            "description": "Chest, Shoulders, and Triceps focus.",
            "exercises": [
                {"name": "Bench Press", "sets": 3, "reps": 8},
                {"name": "Overhead Press", "sets": 3, "reps": 10},
                {"name": "Incline Dumbbell Press", "sets": 3, "reps": 10},
                {"name": "Tricep Pushdown", "sets": 3, "reps": 12},
            ]
        },
        {
            "name": "Pull Day",
            "description": "Back and Biceps focus.",
            "exercises": [
                {"name": "Deadlift", "sets": 3, "reps": 5},
                {"name": "Lat Pulldown", "sets": 3, "reps": 10},
                {"name": "Barbell Row", "sets": 3, "reps": 10},
                {"name": "Bicep Curl", "sets": 3, "reps": 12},
            ]
        },
        {
            "name": "Leg Day",
            "description": "Quads, Hamstrings, and Calves focus.",
            "exercises": [
                {"name": "Squat", "sets": 3, "reps": 8},
                {"name": "Leg Press", "sets": 3, "reps": 10},
                {"name": "Leg Extension", "sets": 3, "reps": 15},
                {"name": "Leg Curl", "sets": 3, "reps": 15},
            ]
        }
    ]

    for t_data in demo_templates:
        template = models.WorkoutTemplate(
            user_id=user_id,
            name=t_data["name"],
            description=t_data["description"]
        )
        db.add(template)
        db.flush() # To get template.id

        for idx, ex_data in enumerate(t_data["exercises"]):
            ex_id = ex_map.get(ex_data["name"])
            if ex_id:
                te = models.WorkoutTemplateExercise(
                    template_id=template.id,
                    exercise_id=ex_id,
                    position=idx,
                    target_sets=ex_data["sets"],
                    target_reps=ex_data["reps"]
                )
                db.add(te)

    db.commit()
