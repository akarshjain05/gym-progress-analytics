from sqlalchemy.orm import Session

from . import models

# ---------------------------------------------------------------------------
# Exercise catalog
# Format: (name, category, muscle_group)
#
# BODYWEIGHT EXERCISES: category = "bodyweight"
#   These are classified by reps only — no weight input needed.
#   Weighted variants (e.g. "Weighted Pull-up") are separate entries
#   with category = "compound" and use added weight for classification.
#
# UNILATERAL / DUMBBELL: weight logged is PER HAND.
#   Strength standards account for this — do NOT double the weight.
#
# SMITH MACHINE: slightly higher standards than free weight versions
#   because the machine guides the bar path (less stabilizer demand).
# ---------------------------------------------------------------------------

PREDEFINED_EXERCISES = [
    # ── CHEST ────────────────────────────────────────────────────────────────
    ("Bench Press",                   "compound",   "chest"),
    ("Incline Bench Press",           "compound",   "chest"),
    ("Decline Bench Press",           "compound",   "chest"),
    ("Dumbbell Bench Press",          "compound",   "chest"),   # per hand
    ("Incline Dumbbell Press",        "compound",   "chest"),   # per hand
    ("Flat Dumbbell Fly",             "isolation",  "chest"),   # per hand
    ("Dumbbell Fly",                  "isolation",  "chest"),   # per hand
    ("Weighted Dip",                  "compound",   "chest"),   # added weight
    ("Dip",                           "bodyweight", "chest"),   # reps only
    ("Machine Chest Press",           "compound",   "chest"),
    ("Smith Machine Bench Press",     "compound",   "chest"),
    ("Incline Machine Press",         "compound",   "chest"),
    ("Smith Machine Incline Press",   "compound",   "chest"),
    ("Pec Deck",                      "isolation",  "chest"),
    ("Cable Fly",                     "isolation",  "chest"),   # bilateral
    ("Low Cable Fly",                 "isolation",  "chest"),
    ("High Cable Fly",                "isolation",  "chest"),

    # ── BACK ─────────────────────────────────────────────────────────────────
    ("Deadlift",                      "compound",   "back"),
    ("Barbell Row",                   "compound",   "back"),
    ("T-Bar Row",                     "compound",   "back"),
    ("Chest-Supported Row",           "compound",   "back"),
    ("Seated Cable Row",              "isolation",  "back"),
    ("Wide-Grip Cable Row",           "isolation",  "back"),
    ("Close-Grip Lat Pulldown",       "isolation",  "back"),
    ("Lat Pulldown",                  "isolation",  "back"),
    ("One-Arm Dumbbell Row",          "compound",   "back"),    # per hand
    ("Machine Row",                   "isolation",  "back"),
    ("Pull-up",                       "bodyweight", "back"),    # reps only
    ("Chin-up",                       "bodyweight", "back"),    # reps only
    ("Weighted Pull-up",              "compound",   "back"),    # added weight
    ("Weighted Chin-up",              "compound",   "back"),    # added weight
    ("Back Extension",                "isolation",  "back"),
    ("Romanian Deadlift",             "compound",   "hamstrings"),

    # ── SHOULDERS ─────────────────────────────────────────────────────────────
    ("Overhead Press",                "compound",   "shoulders"),
    ("Dumbbell Shoulder Press",       "compound",   "shoulders"), # per hand
    ("Arnold Press",                  "compound",   "shoulders"), # per hand
    ("Machine Shoulder Press",        "compound",   "shoulders"),
    ("Smith Machine OHP",             "compound",   "shoulders"),
    ("Lateral Raise",                 "isolation",  "shoulders"), # per hand
    ("Cable Lateral Raise",           "isolation",  "shoulders"), # single arm
    ("Dumbbell Lateral Raise",        "isolation",  "shoulders"), # per hand
    ("Rear Delt Fly",                 "isolation",  "shoulders"), # per hand
    ("Cable Rear Delt Fly",           "isolation",  "shoulders"), # single arm
    ("Reverse Pec Deck",              "isolation",  "shoulders"),
    ("Face Pull",                     "isolation",  "shoulders"),
    ("Upright Row",                   "compound",   "shoulders"),

    # ── BICEPS ───────────────────────────────────────────────────────────────
    ("Barbell Curl",                  "isolation",  "biceps"),
    ("EZ Bar Curl",                   "isolation",  "biceps"),
    ("Bicep Curl",                    "isolation",  "biceps"),   # per hand DB
    ("Dumbbell Curl",                 "isolation",  "biceps"),   # per hand
    ("Incline Dumbbell Curl",         "isolation",  "biceps"),   # per hand
    ("Concentration Curl",            "isolation",  "biceps"),   # per hand
    ("Spider Curl",                   "isolation",  "biceps"),   # per hand
    ("Hammer Curl",                   "isolation",  "biceps"),   # per hand
    ("Preacher Curl",                 "isolation",  "biceps"),
    ("Cable Curl",                    "isolation",  "biceps"),   # bilateral
    ("Bayesian Cable Curl",           "isolation",  "biceps"),   # single arm
    ("Chin-up",                       "bodyweight", "back"),     # already listed

    # ── TRICEPS ───────────────────────────────────────────────────────────────
    ("Tricep Pushdown",               "isolation",  "triceps"),  # bilateral rope
    ("Cable Pushdown",                "isolation",  "triceps"),  # bilateral
    ("Straight-Bar Pushdown",         "isolation",  "triceps"),  # bilateral
    ("Single-Arm Cable Pushdown",     "isolation",  "triceps"),  # single arm
    ("Rope Pushdown",                 "isolation",  "triceps"),  # bilateral
    ("Skull Crusher",                 "isolation",  "triceps"),
    ("Close-Grip Bench Press",        "compound",   "triceps"),
    ("Overhead Cable Tricep Extension","isolation", "triceps"),  # bilateral
    ("Dumbbell Overhead Extension",   "isolation",  "triceps"),  # per hand
    ("Machine Tricep Extension",      "isolation",  "triceps"),

    # ── LEGS ─────────────────────────────────────────────────────────────────
    ("Squat",                         "compound",   "quads"),
    ("Front Squat",                   "compound",   "quads"),
    ("Hack Squat",                    "compound",   "quads"),
    ("Goblet Squat",                  "compound",   "quads"),
    ("Smith Machine Squat",           "compound",   "quads"),
    ("Leg Press",                     "compound",   "quads"),
    ("Leg Extension",                 "isolation",  "quads"),
    ("Bulgarian Split Squat",         "compound",   "quads"),     # per hand DB
    ("Walking Lunges",                "compound",   "glutes"),     # per hand DB
    ("Leg Curl",                      "isolation",  "hamstrings"),
    ("Lying Leg Curl",                "isolation",  "hamstrings"),
    ("Seated Leg Curl",               "isolation",  "hamstrings"),
    ("Hip Thrust",                    "compound",   "glutes"),
    ("Cable Kickback",                "isolation",  "glutes"),   # single leg
    ("Adductor Machine",              "isolation",  "adductors"),
    ("Standing Calf Raise",           "isolation",  "calves"),
    ("Seated Calf Raise",             "isolation",  "calves"),
    ("Calf Raise",                    "isolation",  "calves"),

    # ── CORE ─────────────────────────────────────────────────────────────────
    ("Cable Crunch",                  "isolation",  "core"),
    ("Hanging Leg Raise",             "bodyweight", "core"),     # reps only
    ("Plank",                         "bodyweight", "core"),     # time-based

    # ── KEEP EXISTING NAMES that users may have already logged ───────────────
    # (aliases so existing user data still matches)
    ("Dumbbell Shoulder Press",       "compound",   "shoulders"),
    ("Lateral Raise",                 "isolation",  "shoulders"),
    ("Bicep Curl",                    "isolation",  "biceps"),
    ("Barbell Curl",                  "isolation",  "biceps"),
    ("Dumbbell Curl",                 "isolation",  "biceps"),
    ("Hammer Curl",                   "isolation",  "biceps"),
    ("Tricep Pushdown",               "isolation",  "triceps"),
    ("Skull Crusher",                 "isolation",  "triceps"),
    ("Leg Curl",                      "isolation",  "hamstrings"),
    ("Leg Extension",                 "isolation",  "quads"),
    ("Calf Raise",                    "isolation",  "calves"),
    ("Hip Thrust",                    "compound",   "glutes"),
    ("Bulgarian Split Squat",         "compound",   "quads"),
    ("Plank",                         "bodyweight", "core"),
    ("Cable Crunch",                  "isolation",  "core"),
    ("Pec Deck",                      "isolation",  "chest"),
    ("Cable Fly",                     "isolation",  "chest"),
    ("T-Bar Row",                     "compound",   "back"),
    ("Reverse Pec Deck",              "isolation",  "shoulders"),
    ("Face Pull",                     "isolation",  "shoulders"),
    ("Dumbbell Bench Press",          "compound",   "chest"),
]

# De-duplicate preserving first occurrence
def _dedup(exercises):
    seen = set()
    result = []
    for entry in exercises:
        if entry[0] not in seen:
            seen.add(entry[0])
            result.append(entry)
    return result

PREDEFINED_EXERCISES = _dedup(PREDEFINED_EXERCISES)


def seed_exercises(db: Session) -> None:
    """
    Inserts any predefined exercise that doesn't exist yet, AND updates the
    category/muscle_group of ones that already exist if the predefined list
    has changed. Only touches rows where created_by is NULL (global catalog),
    never a user's custom exercises.
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
            db.add(models.Exercise(
                name=name,
                category=category,
                muscle_group=muscle_group,
                is_custom=False,
                created_by=None,
            ))
    db.commit()