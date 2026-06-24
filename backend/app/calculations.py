"""
All math lives here, isolated from FastAPI/DB code, so it can be unit tested
directly. Formulas used are standard, widely-cited fitness formulas - sources
noted inline. Nothing here is a substitute for medical/nutrition advice.
"""
from datetime import date, timedelta
from typing import Optional


# ---------------------------------------------------------------------------
# Unit conversion
# ---------------------------------------------------------------------------

KG_PER_LB = 0.45359237


def kg_to_lb(kg: float) -> float:
    return kg / KG_PER_LB


def lb_to_kg(lb: float) -> float:
    return lb * KG_PER_LB


# ---------------------------------------------------------------------------
# One-rep max estimation
# ---------------------------------------------------------------------------

def estimate_1rm_epley(weight_kg: float, reps: int) -> float:
    """Epley formula. Most accurate for reps <= ~10-12."""
    if reps <= 0 or weight_kg < 0:
        raise ValueError("weight must be >= 0 and reps must be > 0")
    if reps == 1:
        return round(weight_kg, 2)
    return round(weight_kg * (1 + reps / 30), 2)


def estimate_1rm_brzycki(weight_kg: float, reps: int) -> float:
    if reps <= 0 or weight_kg < 0:
        raise ValueError("weight must be >= 0 and reps must be > 0")
    if reps == 1:
        return round(weight_kg, 2)
    if reps >= 37:
        raise ValueError("Brzycki formula is unreliable for reps >= 37")
    return round(weight_kg * 36 / (37 - reps), 2)


def best_estimated_1rm(sets: list[tuple[float, int]]) -> float:
    if not sets:
        return 0.0
    return max(estimate_1rm_epley(w, r) for w, r in sets)


# ---------------------------------------------------------------------------
# BMR / TDEE
# ---------------------------------------------------------------------------

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

KCAL_PER_KG_BODY_MASS = 7700


def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    if gender == "male":
        return round(base + 5, 1)
    elif gender == "female":
        return round(base - 161, 1)
    else:
        return round(base + (5 - 161) / 2, 1)


def calculate_tdee(bmr: float, activity_level: str) -> float:
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, ACTIVITY_MULTIPLIERS["moderate"])
    return round(bmr * multiplier, 1)


def estimate_actual_tdee(avg_daily_calories: float, weight_change_kg: float, num_days: int) -> Optional[float]:
    if num_days < 10:
        return None
    total_balance_kcal = weight_change_kg * KCAL_PER_KG_BODY_MASS
    avg_daily_balance = total_balance_kcal / num_days
    return round(avg_daily_calories - avg_daily_balance, 0)


# ---------------------------------------------------------------------------
# Trend / change calculations
# ---------------------------------------------------------------------------

def percent_change(old_value: float, new_value: float) -> Optional[float]:
    if old_value == 0:
        return None
    return round(((new_value - old_value) / abs(old_value)) * 100, 2)


def simple_moving_average(values: list[float], window: int) -> list[Optional[float]]:
    if window <= 0:
        raise ValueError("window must be > 0")
    result: list[Optional[float]] = []
    for i in range(len(values)):
        if i + 1 < window:
            result.append(None)
        else:
            window_slice = values[i + 1 - window: i + 1]
            result.append(round(sum(window_slice) / window, 2))
    return result


def linear_regression_slope(x_values: list[float], y_values: list[float]) -> Optional[float]:
    n = len(x_values)
    if n < 2 or len(set(x_values)) < 2:
        return None
    mean_x = sum(x_values) / n
    mean_y = sum(y_values) / n
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_values, y_values))
    denominator = sum((x - mean_x) ** 2 for x in x_values)
    if denominator == 0:
        return None
    return numerator / denominator


def weekly_rate_of_change(dated_values: list[tuple[date, float]]) -> Optional[float]:
    if len(dated_values) < 2:
        return None
    dated_values = sorted(dated_values, key=lambda dv: dv[0])
    base_day = dated_values[0][0]
    x_values = [(d - base_day).days for d, _ in dated_values]
    y_values = [v for _, v in dated_values]
    slope_per_day = linear_regression_slope(x_values, y_values)
    if slope_per_day is None:
        return None
    return round(slope_per_day * 7, 3)


def project_days_to_goal(current_weight_kg: float, goal_weight_kg: float, weekly_rate_kg: Optional[float]) -> Optional[int]:
    diff = goal_weight_kg - current_weight_kg
    if abs(diff) < 0.05:
        return None
    if weekly_rate_kg is None or abs(weekly_rate_kg) < 0.01:
        return None
    if (diff > 0) != (weekly_rate_kg > 0):
        return None
    weeks_needed = diff / weekly_rate_kg
    return round(weeks_needed * 7)


# ---------------------------------------------------------------------------
# Comprehensive Strength Standards
#
# METHODOLOGY:
# ============
# All standards are expressed as bodyweight (BW) multiplier ratios for
# estimated 1RM. Sources: Symmetric Strength, ExRx.net, Stronger By Science
# population data, r/weightroom community standards, and published EMG/
# force production research.
#
# KEY DESIGN DECISIONS:
#
# 1. DUMBBELL EXERCISES: Weight entered is PER HAND (as is standard practice).
#    Dumbbell standards use LOWER ratios than barbell because:
#    - Unilateral stability demand is higher (more muscle activation needed
#      for balance, not just force production)
#    - No bar path assist — each arm works independently
#    - Real population data (Symmetric Strength) shows DB bench intermediate
#      male ~0.3x BW per hand vs barbell bench ~1.0x BW total
#    Source: Symmetric Strength DB standards, ExRx.net DB norms
#
# 2. UNILATERAL EXERCISES (Bulgarian Split Squat, Single-leg movements):
#    Weight entered is the dumbbell/barbell load, not bodyweight equivalent.
#    Standards are lower because half the body is the primary load.
#    Source: published BSS research, Stronger By Science
#
# 3. ISOLATION EXERCISES (curls, lateral raises, pushdowns etc.):
#    Standards are much lower ratios because isolation = single joint,
#    smaller muscle, less systemic loading.
#    Source: ExRx.net exercise standards, community norms
#
# 4. MACHINE EXERCISES (leg press, lat pulldown, cable rows etc.):
#    Higher absolute numbers due to assisted movement pattern / leverage.
#    Leg press standards are significantly higher than squat.
#    Source: ExRx.net machine standards
#
# 5. GENDER SPLIT: Male/female ratios differ per exercise based on which
#    muscle groups show the largest relative strength differences.
#    Upper body: females typically ~55-60% of male absolute strength
#    Lower body: females typically ~65-75% of male absolute strength
#    Source: NSCA strength ratio research
# ---------------------------------------------------------------------------

STRENGTH_STANDARDS = {
    "male": {
        # ── Barbell compound ──────────────────────────────────────────────
        # Full barbell weight including plates
        "bench":            {"beginner": 0.5,  "novice": 0.75, "intermediate": 1.0,  "advanced": 1.5,  "elite": 2.0},
        "incline_bench":    {"beginner": 0.4,  "novice": 0.6,  "intermediate": 0.85, "advanced": 1.25, "elite": 1.7},
        "squat":            {"beginner": 0.75, "novice": 1.0,  "intermediate": 1.5,  "advanced": 2.0,  "elite": 2.5},
        "deadlift":         {"beginner": 1.0,  "novice": 1.25, "intermediate": 1.75, "advanced": 2.25, "elite": 2.75},
        "overhead_press":   {"beginner": 0.35, "novice": 0.5,  "intermediate": 0.7,  "advanced": 1.0,  "elite": 1.3},
        "barbell_row":      {"beginner": 0.5,  "novice": 0.75, "intermediate": 1.0,  "advanced": 1.5,  "elite": 1.9},
        "romanian_deadlift":{"beginner": 0.7,  "novice": 1.0,  "intermediate": 1.4,  "advanced": 1.9,  "elite": 2.4},
        "front_squat":      {"beginner": 0.5,  "novice": 0.75, "intermediate": 1.1,  "advanced": 1.6,  "elite": 2.0},

        # ── Dumbbell exercises (weight = per hand) ────────────────────────
        # Source: Symmetric Strength DB norms. Lower than barbell because
        # of unilateral stability demand and independent arm recruitment.
        "db_bench":         {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.4,  "advanced": 0.55, "elite": 0.7},
        "db_shoulder":      {"beginner": 0.12, "novice": 0.18, "intermediate": 0.25, "advanced": 0.35, "elite": 0.45},
        "db_curl":          {"beginner": 0.1,  "novice": 0.15, "intermediate": 0.2,  "advanced": 0.28, "elite": 0.38},
        "db_lateral_raise": {"beginner": 0.05, "novice": 0.08, "intermediate": 0.12, "advanced": 0.17, "elite": 0.22},
        "db_row":           {"beginner": 0.25, "novice": 0.38, "intermediate": 0.5,  "advanced": 0.65, "elite": 0.8},

        # ── Bodyweight / assisted compound ───────────────────────────────
        # Pullup/chinup: added weight as fraction of BW (0 = can do BW only)
        "pullup":           {"beginner": 0.0,  "novice": 0.1,  "intermediate": 0.25, "advanced": 0.5,  "elite": 0.75},
        "dip":              {"beginner": 0.0,  "novice": 0.15, "intermediate": 0.35, "advanced": 0.6,  "elite": 0.9},

        # ── Machine / cable ───────────────────────────────────────────────
        # Leg press: machine leverage allows much higher absolute loads.
        # Standard: 1.5x BW = beginner for most trained males
        "leg_press":        {"beginner": 1.5,  "novice": 2.0,  "intermediate": 2.8,  "advanced": 3.8,  "elite": 4.8},
        "lat_pulldown":     {"beginner": 0.5,  "novice": 0.65, "intermediate": 0.85, "advanced": 1.1,  "elite": 1.35},
        "cable_row":        {"beginner": 0.45, "novice": 0.6,  "intermediate": 0.8,  "advanced": 1.05, "elite": 1.3},
        "cable_fly":        {"beginner": 0.15, "novice": 0.22, "intermediate": 0.3,  "advanced": 0.4,  "elite": 0.5},
        "pec_deck":         {"beginner": 0.3,  "novice": 0.45, "intermediate": 0.6,  "advanced": 0.8,  "elite": 1.0},
        "t_bar_row":        {"beginner": 0.4,  "novice": 0.6,  "intermediate": 0.85, "advanced": 1.1,  "elite": 1.4},

        # ── Isolation (single joint, smaller muscle) ──────────────────────
        "bicep_curl":       {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.4,  "advanced": 0.55, "elite": 0.7},
        "barbell_curl":     {"beginner": 0.25, "novice": 0.35, "intermediate": 0.5,  "advanced": 0.65, "elite": 0.8},
        "hammer_curl":      {"beginner": 0.1,  "novice": 0.16, "intermediate": 0.22, "advanced": 0.3,  "elite": 0.4},
        "tricep_pushdown":  {"beginner": 0.25, "novice": 0.38, "intermediate": 0.52, "advanced": 0.68, "elite": 0.85},
        "skull_crusher":    {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.42, "advanced": 0.58, "elite": 0.72},
        "lateral_raise":    {"beginner": 0.05, "novice": 0.08, "intermediate": 0.12, "advanced": 0.17, "elite": 0.22},
        "leg_curl":         {"beginner": 0.3,  "novice": 0.45, "intermediate": 0.6,  "advanced": 0.8,  "elite": 1.0},
        "leg_extension":    {"beginner": 0.4,  "novice": 0.55, "intermediate": 0.75, "advanced": 1.0,  "elite": 1.25},
        "calf_raise":       {"beginner": 0.6,  "novice": 0.9,  "intermediate": 1.25, "advanced": 1.6,  "elite": 2.0},
        "cable_crunch":     {"beginner": 0.2,  "novice": 0.32, "intermediate": 0.45, "advanced": 0.6,  "elite": 0.75},
        "face_pull":        {"beginner": 0.1,  "novice": 0.18, "intermediate": 0.28, "advanced": 0.4,  "elite": 0.52},
        "reverse_pec_deck": {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.42, "advanced": 0.58, "elite": 0.72},

        # ── Unilateral / specialty ────────────────────────────────────────
        # Bulgarian split squat: DB weight per hand vs bodyweight
        "bulgarian_split":  {"beginner": 0.15, "novice": 0.3,  "intermediate": 0.5,  "advanced": 0.7,  "elite": 0.9},
        "hip_thrust":       {"beginner": 0.5,  "novice": 0.9,  "intermediate": 1.4,  "advanced": 1.9,  "elite": 2.4},
        "plank":            {"beginner": 0.0,  "novice": 0.0,  "intermediate": 0.0,  "advanced": 0.0,  "elite": 0.0},
    },

    "female": {
        # ── Barbell compound ──────────────────────────────────────────────
        "bench":            {"beginner": 0.3,  "novice": 0.5,  "intermediate": 0.65, "advanced": 1.0,  "elite": 1.3},
        "incline_bench":    {"beginner": 0.22, "novice": 0.38, "intermediate": 0.52, "advanced": 0.8,  "elite": 1.05},
        "squat":            {"beginner": 0.5,  "novice": 0.75, "intermediate": 1.0,  "advanced": 1.5,  "elite": 1.9},
        "deadlift":         {"beginner": 0.65, "novice": 0.9,  "intermediate": 1.25, "advanced": 1.75, "elite": 2.2},
        "overhead_press":   {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.45, "advanced": 0.65, "elite": 0.85},
        "barbell_row":      {"beginner": 0.3,  "novice": 0.5,  "intermediate": 0.65, "advanced": 1.0,  "elite": 1.3},
        "romanian_deadlift":{"beginner": 0.45, "novice": 0.7,  "intermediate": 1.0,  "advanced": 1.4,  "elite": 1.8},
        "front_squat":      {"beginner": 0.32, "novice": 0.5,  "intermediate": 0.75, "advanced": 1.1,  "elite": 1.4},

        # ── Dumbbell (per hand) ───────────────────────────────────────────
        "db_bench":         {"beginner": 0.12, "novice": 0.18, "intermediate": 0.25, "advanced": 0.35, "elite": 0.45},
        "db_shoulder":      {"beginner": 0.07, "novice": 0.11, "intermediate": 0.16, "advanced": 0.22, "elite": 0.29},
        "db_curl":          {"beginner": 0.06, "novice": 0.09, "intermediate": 0.13, "advanced": 0.18, "elite": 0.24},
        "db_lateral_raise": {"beginner": 0.03, "novice": 0.05, "intermediate": 0.08, "advanced": 0.11, "elite": 0.15},
        "db_row":           {"beginner": 0.16, "novice": 0.24, "intermediate": 0.33, "advanced": 0.44, "elite": 0.55},

        # ── Bodyweight ────────────────────────────────────────────────────
        "pullup":           {"beginner": 0.0,  "novice": 0.0,  "intermediate": 0.1,  "advanced": 0.3,  "elite": 0.55},
        "dip":              {"beginner": 0.0,  "novice": 0.0,  "intermediate": 0.2,  "advanced": 0.4,  "elite": 0.65},

        # ── Machine / cable ───────────────────────────────────────────────
        "leg_press":        {"beginner": 1.0,  "novice": 1.4,  "intermediate": 2.0,  "advanced": 2.8,  "elite": 3.6},
        "lat_pulldown":     {"beginner": 0.32, "novice": 0.45, "intermediate": 0.6,  "advanced": 0.8,  "elite": 1.0},
        "cable_row":        {"beginner": 0.28, "novice": 0.4,  "intermediate": 0.55, "advanced": 0.72, "elite": 0.9},
        "cable_fly":        {"beginner": 0.08, "novice": 0.13, "intermediate": 0.19, "advanced": 0.26, "elite": 0.34},
        "pec_deck":         {"beginner": 0.18, "novice": 0.28, "intermediate": 0.4,  "advanced": 0.55, "elite": 0.7},
        "t_bar_row":        {"beginner": 0.25, "novice": 0.4,  "intermediate": 0.55, "advanced": 0.75, "elite": 0.95},

        # ── Isolation ─────────────────────────────────────────────────────
        "bicep_curl":       {"beginner": 0.12, "novice": 0.18, "intermediate": 0.26, "advanced": 0.36, "elite": 0.46},
        "barbell_curl":     {"beginner": 0.15, "novice": 0.22, "intermediate": 0.32, "advanced": 0.44, "elite": 0.56},
        "hammer_curl":      {"beginner": 0.06, "novice": 0.1,  "intermediate": 0.14, "advanced": 0.2,  "elite": 0.27},
        "tricep_pushdown":  {"beginner": 0.15, "novice": 0.24, "intermediate": 0.34, "advanced": 0.46, "elite": 0.58},
        "skull_crusher":    {"beginner": 0.12, "novice": 0.19, "intermediate": 0.27, "advanced": 0.38, "elite": 0.48},
        "lateral_raise":    {"beginner": 0.03, "novice": 0.05, "intermediate": 0.08, "advanced": 0.11, "elite": 0.15},
        "leg_curl":         {"beginner": 0.2,  "novice": 0.32, "intermediate": 0.44, "advanced": 0.6,  "elite": 0.76},
        "leg_extension":    {"beginner": 0.28, "novice": 0.4,  "intermediate": 0.55, "advanced": 0.74, "elite": 0.93},
        "calf_raise":       {"beginner": 0.4,  "novice": 0.6,  "intermediate": 0.85, "advanced": 1.15, "elite": 1.45},
        "cable_crunch":     {"beginner": 0.12, "novice": 0.2,  "intermediate": 0.3,  "advanced": 0.42, "elite": 0.54},
        "face_pull":        {"beginner": 0.06, "novice": 0.11, "intermediate": 0.18, "advanced": 0.26, "elite": 0.35},
        "reverse_pec_deck": {"beginner": 0.12, "novice": 0.19, "intermediate": 0.28, "advanced": 0.38, "elite": 0.5},

        # ── Unilateral ────────────────────────────────────────────────────
        "bulgarian_split":  {"beginner": 0.1,  "novice": 0.2,  "intermediate": 0.35, "advanced": 0.5,  "elite": 0.68},
        "hip_thrust":       {"beginner": 0.4,  "novice": 0.75, "intermediate": 1.15, "advanced": 1.6,  "elite": 2.1},
        "plank":            {"beginner": 0.0,  "novice": 0.0,  "intermediate": 0.0,  "advanced": 0.0,  "elite": 0.0},
    },
}

# ---------------------------------------------------------------------------
# Exercise name → standards key mapping
#
# IMPORTANT NOTE ON DUMBBELL WEIGHTS:
# Users enter weight PER HAND for all dumbbell exercises.
# The db_* standards already account for this — they are calibrated to
# per-hand weights based on real population data (Symmetric Strength).
# Do NOT multiply by 2 before looking up. The ratio is already correct.
# ---------------------------------------------------------------------------

EXERCISE_TO_STANDARD = {
    # Barbell bench variants
    "bench press":               "bench",
    "barbell bench press":       "bench",
    "incline bench press":       "incline_bench",

    # Dumbbell bench/press (per hand input)
    "dumbbell bench press":      "db_bench",
    "dumbbell incline press":    "db_bench",
    "dumbbell shoulder press":   "db_shoulder",
    "dumbbell press":            "db_bench",

    # Squat variants
    "squat":                     "squat",
    "back squat":                "squat",
    "front squat":               "front_squat",
    "bulgarian split squat":     "bulgarian_split",

    # Deadlift variants
    "deadlift":                  "deadlift",
    "romanian deadlift":         "romanian_deadlift",

    # OHP
    "overhead press":            "overhead_press",
    "ohp":                       "overhead_press",
    "shoulder press":            "overhead_press",

    # Back — barbell
    "barbell row":               "barbell_row",
    "t-bar row":                 "t_bar_row",

    # Back — machine/cable
    "lat pulldown":              "lat_pulldown",
    "seated cable row":          "cable_row",
    "cable row":                 "cable_row",

    # Back — dumbbell (per hand)
    "dumbbell row":              "db_row",

    # Back — bodyweight
    "pull-up":                   "pullup",
    "pullup":                    "pullup",
    "pull up":                   "pullup",
    "chin-up":                   "pullup",
    "chinup":                    "pullup",

    # Chest — isolation
    "dip":                       "dip",
    "cable fly":                 "cable_fly",
    "pec deck":                  "pec_deck",

    # Shoulders — isolation
    "lateral raise":             "lateral_raise",
    "face pull":                 "face_pull",
    "reverse pec deck":          "reverse_pec_deck",

    # Arms — barbell
    "barbell curl":              "barbell_curl",

    # Arms — dumbbell (per hand)
    "bicep curl":                "bicep_curl",
    "dumbbell curl":             "db_curl",
    "hammer curl":               "hammer_curl",
    "dumbbell bicep curl":       "db_curl",

    # Triceps
    "tricep pushdown":           "tricep_pushdown",
    "skull crusher":             "skull_crusher",
    "skullcrusher":              "skull_crusher",

    # Legs — machine
    "leg press":                 "leg_press",
    "leg curl":                  "leg_curl",
    "leg extension":             "leg_extension",

    # Glutes / posterior chain
    "hip thrust":                "hip_thrust",

    # Calves / core
    "calf raise":                "calf_raise",
    "cable crunch":              "cable_crunch",
    "plank":                     "plank",
}


def classify_strength_level(
    exercise_name: str,
    gender: str,
    bodyweight_kg: float,
    one_rm_kg: float,
) -> Optional[str]:
    """
    Returns one of: beginner / novice / intermediate / advanced / elite
    Returns None if:
      - exercise not in standards table
      - gender is 'other' (no validated population data)
      - bodyweight not set

    The 1RM passed in should be the RAW logged weight for the exercise.
    For dumbbell exercises this is the per-hand weight, which is correct —
    the db_* standards are already calibrated to per-hand inputs.
    """
    key = EXERCISE_TO_STANDARD.get(exercise_name.strip().lower())
    if key is None or gender not in STRENGTH_STANDARDS or bodyweight_kg <= 0:
        return None

    standards = STRENGTH_STANDARDS[gender]
    if key not in standards:
        return None

    # Plank is time-based, skip ratio comparison
    if key == "plank":
        return None

    ratio = one_rm_kg / bodyweight_kg
    table = standards[key]
    level = None
    for tier in ["beginner", "novice", "intermediate", "advanced", "elite"]:
        if ratio >= table[tier]:
            level = tier
    return level


def get_strength_standard_info(
    exercise_name: str,
    gender: str,
    bodyweight_kg: float,
) -> Optional[dict]:
    """
    Returns the full standard breakpoints for an exercise so the frontend
    can show a visual scale of where the user sits.
    Returns absolute kg values (ratio × bodyweight) for each tier.
    """
    key = EXERCISE_TO_STANDARD.get(exercise_name.strip().lower())
    if key is None or gender not in STRENGTH_STANDARDS or bodyweight_kg <= 0:
        return None

    standards = STRENGTH_STANDARDS[gender]
    if key not in standards or key == "plank":
        return None

    table = standards[key]
    return {
        tier: round(ratio * bodyweight_kg, 1)
        for tier, ratio in table.items()
    }
