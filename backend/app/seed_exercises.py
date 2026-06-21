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
    ("Bicep Curl", "isolation", "biceps"),
    ("Barbell Curl", "isolation", "biceps"),
    ("Dumbbell Curl", "isolation", "biceps"),
    ("Hammer Curl", "isolation", "biceps"),
    ("Tricep Pushdown", "isolation", "triceps"),
    ("Skull Crusher", "isolation", "triceps"),
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
    """
    Inserts any predefined exercise that doesn't exist yet, AND updates the
    category/muscle_group of ones that already exist if the predefined list
    has changed since they were first seeded (e.g. splitting "arms" into
    "biceps"/"triceps"). Without the update half, changing PREDEFINED_EXERCISES
    would only affect brand-new databases - anyone already deployed would be
    stuck with stale values forever, since this only ever touches rows where
    created_by is NULL (the global catalog), never a user's custom exercises.
    """
    existing = {
        e.name: e
        for e in db.query(models.Exercise).filter(models.Exercise.created_by.is_(None)).all()
    }
    for name, category, muscle_group in PREDEFINED_EXERCISES:
        if name in existing:
            exercise = existing[name]
            if exercise.category != category or exercise.muscle_group != muscle_group:
                exercise.category = category
                exercise.muscle_group = muscle_group
        else:
            db.add(models.Exercise(name=name, category=category, muscle_group=muscle_group, is_custom=False, created_by=None))
    db.commit()