from sqlalchemy.orm import Session

from . import models

PREDEFINED_EXERCISES = [
    ("Bench Press", "compound", "chest"),
    ("Incline Bench Press", "compound", "chest"),
    ("Squat", "compound", "legs"),
    ("Front Squat", "compound", "legs"),
    ("Deadlift", "compound", "back"),
    ("Romanian Deadlift", "compound", "hamstrings"),
    ("Overhead Press", "compound", "shoulders"),
    ("Barbell Row", "compound", "back"),
    ("Pull-up", "compound", "back"),
    ("Chin-up", "compound", "back"),
    ("Dip", "compound", "chest"),
    ("Leg Press", "compound", "legs"),
    ("Lat Pulldown", "isolation", "back"),
    ("Seated Cable Row", "isolation", "back"),
    ("Dumbbell Bench Press", "compound", "chest"),
    ("Dumbbell Shoulder Press", "compound", "shoulders"),
    ("Lateral Raise", "isolation", "shoulders"),
    ("Bicep Curl", "isolation", "arms"),
    ("Barbell Curl", "isolation", "arms"),
    ("Dumbbell Curl", "isolation", "arms"),
    ("Hammer Curl", "isolation", "arms"),
    ("Tricep Pushdown", "isolation", "arms"),
    ("Skull Crusher", "isolation", "arms"),
    ("Leg Curl", "isolation", "hamstrings"),
    ("Leg Extension", "isolation", "quads"),
    ("Calf Raise", "isolation", "calves"),
    ("Hip Thrust", "compound", "glutes"),
    ("Bulgarian Split Squat", "compound", "legs"),
    ("Plank", "core", "core"),
    ("Cable Crunch", "isolation", "core"),
    ("Pec Deck", "isolation", "chest"),
    ("Cable Fly", "isolation", "chest"),
    ("T-Bar Row", "compound", "back"),
    ("Reverse Pec Deck", "isolation", "shoulders"),
    ("Face Pull", "isolation", "shoulders"),
]


def seed_exercises(db: Session) -> None:
    existing_names = {e.name for e in db.query(models.Exercise).filter(models.Exercise.created_by.is_(None)).all()}
    for name, category, muscle_group in PREDEFINED_EXERCISES:
        if name not in existing_names:
            db.add(models.Exercise(name=name, category=category, muscle_group=muscle_group, is_custom=False, created_by=None))
    db.commit()