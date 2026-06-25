"""
All math lives here, isolated from FastAPI/DB code.

STRENGTH CLASSIFICATION SYSTEM
================================

THREE types of exercises:

1. WEIGHTED exercises — ratio of (1RM or weight) to bodyweight
   Sources: Symmetric Strength, ExRx.net, Stronger By Science

2. BODYWEIGHT exercises — classified by REPS only (no weight)
   pull-up, chin-up, dip, hanging leg raise, plank
   Source: r/bodyweightfitness standards, gymnastics community norms

3. WEIGHTED BODYWEIGHT — added weight on top of your own bodyweight
   weighted pull-up, weighted chin-up, weighted dip
   Standard: added weight as fraction of bodyweight
   e.g. +0.5 BW added = strong (you + half your bodyweight)

UNILATERAL / DUMBBELL NOTE:
   Weight logged = PER HAND for all dumbbell exercises.
   Standards are calibrated to per-hand weights based on Symmetric Strength
   dumbbell population data. Do NOT multiply by 2.
   A 25kg dumbbell bench = 25kg per hand. Standard ~0.4x BW per hand for
   intermediate male vs barbell bench 1.0x BW total.

SMITH MACHINE NOTE:
   Smith machine removes stabilizer demand → can handle more load.
   Standards are ~10-15% higher than free-weight equivalent.

CABLE BILATERAL vs UNILATERAL:
   Bilateral cables (both arms, e.g. cable curl, pushdown) — full stack weight
   Unilateral cables (one arm, e.g. Bayesian curl, single-arm pushdown) — per arm
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
# BODYWEIGHT EXERCISE REP STANDARDS
# Source: r/bodyweightfitness, gymnastics community, coaches' standards
#
# These are max clean reps (full ROM, controlled) at bodyweight only.
# For weighted variants, we use the separate STRENGTH_STANDARDS below.
# ---------------------------------------------------------------------------

BODYWEIGHT_REP_STANDARDS = {
    "male": {
        "pull_up":            {"beginner": 1,  "novice": 5,  "intermediate": 10, "advanced": 15, "elite": 20},
        "chin_up":            {"beginner": 1,  "novice": 5,  "intermediate": 10, "advanced": 15, "elite": 20},
        "dip":                {"beginner": 1,  "novice": 5,  "intermediate": 12, "advanced": 20, "elite": 30},
        "hanging_leg_raise":  {"beginner": 1,  "novice": 5,  "intermediate": 10, "advanced": 15, "elite": 20},
        "plank_seconds":      {"beginner": 20, "novice": 60, "intermediate": 120,"advanced": 180,"elite": 300},
    },
    "female": {
        "pull_up":            {"beginner": 1,  "novice": 3,  "intermediate": 6,  "advanced": 10, "elite": 15},
        "chin_up":            {"beginner": 1,  "novice": 3,  "intermediate": 6,  "advanced": 10, "elite": 15},
        "dip":                {"beginner": 1,  "novice": 3,  "intermediate": 8,  "advanced": 14, "elite": 20},
        "hanging_leg_raise":  {"beginner": 1,  "novice": 4,  "intermediate": 8,  "advanced": 12, "elite": 16},
        "plank_seconds":      {"beginner": 15, "novice": 45, "intermediate": 90, "advanced": 150,"elite": 240},
    },
}

# Maps exercise name → bodyweight rep standard key
BODYWEIGHT_EXERCISE_MAP = {
    "pull-up":           "pull_up",
    "pullup":            "pull_up",
    "pull up":           "pull_up",
    "chin-up":           "chin_up",
    "chinup":            "chin_up",
    "chin up":           "chin_up",
    "dip":               "dip",
    "hanging leg raise": "hanging_leg_raise",
    "plank":             "plank_seconds",
}


# ---------------------------------------------------------------------------
# WEIGHTED STRENGTH STANDARDS
# All ratios = (weight / bodyweight).
#
# KEY NOTES BY CATEGORY:
#
# BARBELL COMPOUND: full bar weight including plates
#   Bench/OHP: well-validated from powerlifting/Symmetric Strength data
#
# DUMBBELL (per hand): weight entered is PER HAND
#   DB bench intermediate male ~0.4x BW per hand (not 0.5x BW total)
#   This is because: independent arms, no bar path, more stability demand
#   Source: Symmetric Strength dumbbell population data
#
# UNILATERAL DB (Bulgarian, lunges, single-arm row): weight = per hand
#   Standards are lower because: half the body is the primary load,
#   balance is a limiting factor, real-world lifting data shows ~40-50%
#   of bilateral strength per side for beginners, up to ~60% for advanced
#
# SMITH MACHINE: ~10-15% higher than free weight because:
#   - Fixed bar path reduces stabilizer demand
#   - Can focus purely on prime movers
#   - Real-world data shows ~10% more load possible
#
# CABLE BILATERAL: stack weight, both arms working
#   Pushdown, cable curl, face pull — full cable stack weight
#
# CABLE UNILATERAL: single arm/leg, weight is for one side
#   Bayesian curl, single-arm pushdown, cable kickback
#   Standards are lower (roughly 55-60% of bilateral)
#
# MACHINE EXERCISES: generally 10-20% higher than free weight equivalent
#   due to guided movement and no balance requirement
# ---------------------------------------------------------------------------

STRENGTH_STANDARDS = {
    "male": {

        # ── Barbell chest ─────────────────────────────────────────────────
        "bench":               {"beginner": 0.5,  "novice": 0.75, "intermediate": 1.0,  "advanced": 1.5,  "elite": 2.0},
        "incline_bench":       {"beginner": 0.4,  "novice": 0.6,  "intermediate": 0.85, "advanced": 1.25, "elite": 1.65},
        "decline_bench":       {"beginner": 0.55, "novice": 0.8,  "intermediate": 1.05, "advanced": 1.55, "elite": 2.05},
        "close_grip_bench":    {"beginner": 0.4,  "novice": 0.6,  "intermediate": 0.85, "advanced": 1.2,  "elite": 1.6},

        # ── Smith machine chest (10-15% higher than free weight) ──────────
        "smith_bench":         {"beginner": 0.55, "novice": 0.85, "intermediate": 1.1,  "advanced": 1.65, "elite": 2.15},
        "smith_incline":       {"beginner": 0.45, "novice": 0.7,  "intermediate": 0.95, "advanced": 1.38, "elite": 1.8},

        # ── Dumbbell chest (per hand) ────────────────────────────────────
        # Source: Symmetric Strength DB population data
        # Intermediate male: ~0.4x BW per hand (vs barbell 1.0x BW total)
        "db_bench":            {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.4,  "advanced": 0.55, "elite": 0.7},
        "incline_db_bench":    {"beginner": 0.16, "novice": 0.25, "intermediate": 0.35, "advanced": 0.48, "elite": 0.62},
        "db_fly":              {"beginner": 0.1,  "novice": 0.16, "intermediate": 0.22, "advanced": 0.3,  "elite": 0.38},

        # ── Machine / cable chest ────────────────────────────────────────
        "machine_chest":       {"beginner": 0.5,  "novice": 0.75, "intermediate": 1.0,  "advanced": 1.4,  "elite": 1.8},
        "incline_machine":     {"beginner": 0.4,  "novice": 0.62, "intermediate": 0.85, "advanced": 1.18, "elite": 1.52},
        "pec_deck":            {"beginner": 0.3,  "novice": 0.45, "intermediate": 0.6,  "advanced": 0.82, "elite": 1.05},
        "cable_fly":           {"beginner": 0.15, "novice": 0.22, "intermediate": 0.3,  "advanced": 0.42, "elite": 0.55},

        # ── Weighted dip (added weight only, not including bodyweight) ────
        "weighted_dip":        {"beginner": 0.1,  "novice": 0.25, "intermediate": 0.45, "advanced": 0.7,  "elite": 1.0},

        # ── Barbell back ─────────────────────────────────────────────────
        "deadlift":            {"beginner": 1.0,  "novice": 1.25, "intermediate": 1.75, "advanced": 2.25, "elite": 2.75},
        "barbell_row":         {"beginner": 0.5,  "novice": 0.75, "intermediate": 1.0,  "advanced": 1.5,  "elite": 1.9},
        "t_bar_row":           {"beginner": 0.4,  "novice": 0.6,  "intermediate": 0.85, "advanced": 1.15, "elite": 1.45},
        "romanian_deadlift":   {"beginner": 0.7,  "novice": 1.0,  "intermediate": 1.4,  "advanced": 1.9,  "elite": 2.4},
        "back_extension":      {"beginner": 0.2,  "novice": 0.35, "intermediate": 0.55, "advanced": 0.8,  "elite": 1.05},
        "chest_supported_row": {"beginner": 0.35, "novice": 0.55, "intermediate": 0.75, "advanced": 1.05, "elite": 1.35},

        # ── Machine / cable back ─────────────────────────────────────────
        "lat_pulldown":        {"beginner": 0.5,  "novice": 0.65, "intermediate": 0.85, "advanced": 1.1,  "elite": 1.35},
        "close_lat_pulldown":  {"beginner": 0.52, "novice": 0.68, "intermediate": 0.88, "advanced": 1.12, "elite": 1.38},
        "seated_cable_row":    {"beginner": 0.45, "novice": 0.6,  "intermediate": 0.8,  "advanced": 1.05, "elite": 1.3},
        "wide_cable_row":      {"beginner": 0.42, "novice": 0.58, "intermediate": 0.78, "advanced": 1.02, "elite": 1.28},
        "machine_row":         {"beginner": 0.4,  "novice": 0.6,  "intermediate": 0.82, "advanced": 1.1,  "elite": 1.38},

        # ── Dumbbell / unilateral back (per hand) ─────────────────────────
        "db_row":              {"beginner": 0.25, "novice": 0.38, "intermediate": 0.52, "advanced": 0.7,  "elite": 0.88},

        # ── Weighted pull-up/chin-up (added weight, not bodyweight) ───────
        "weighted_pullup":     {"beginner": 0.1,  "novice": 0.2,  "intermediate": 0.35, "advanced": 0.55, "elite": 0.8},
        "weighted_chinup":     {"beginner": 0.1,  "novice": 0.2,  "intermediate": 0.35, "advanced": 0.55, "elite": 0.8},

        # ── Barbell shoulders ─────────────────────────────────────────────
        "overhead_press":      {"beginner": 0.35, "novice": 0.5,  "intermediate": 0.7,  "advanced": 1.0,  "elite": 1.3},
        "upright_row":         {"beginner": 0.3,  "novice": 0.45, "intermediate": 0.62, "advanced": 0.85, "elite": 1.1},

        # ── Smith machine shoulders ───────────────────────────────────────
        "smith_ohp":           {"beginner": 0.38, "novice": 0.55, "intermediate": 0.78, "advanced": 1.1,  "elite": 1.42},

        # ── Dumbbell shoulders (per hand) ─────────────────────────────────
        "db_shoulder_press":   {"beginner": 0.12, "novice": 0.18, "intermediate": 0.25, "advanced": 0.35, "elite": 0.45},
        "arnold_press":        {"beginner": 0.1,  "novice": 0.16, "intermediate": 0.22, "advanced": 0.32, "elite": 0.42},

        # ── Machine shoulders ─────────────────────────────────────────────
        "machine_shoulder":    {"beginner": 0.3,  "novice": 0.45, "intermediate": 0.62, "advanced": 0.85, "elite": 1.1},

        # ── Shoulder isolation (per hand for DB, full stack for cable) ────
        # Lateral raise: very light — even strong people use low %BW
        # Intermediate male: ~0.12x BW per hand (e.g. 8.5kg at 70kg BW)
        "lateral_raise":       {"beginner": 0.05, "novice": 0.08, "intermediate": 0.12, "advanced": 0.17, "elite": 0.22},
        # Cable lateral raise: single arm, weight is stack per arm
        "cable_lateral_raise": {"beginner": 0.05, "novice": 0.08, "intermediate": 0.12, "advanced": 0.17, "elite": 0.22},
        "rear_delt_fly":       {"beginner": 0.04, "novice": 0.07, "intermediate": 0.1,  "advanced": 0.14, "elite": 0.18},
        "cable_rear_delt":     {"beginner": 0.04, "novice": 0.07, "intermediate": 0.1,  "advanced": 0.14, "elite": 0.18},
        "reverse_pec_deck":    {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.42, "advanced": 0.58, "elite": 0.72},
        "face_pull":           {"beginner": 0.1,  "novice": 0.18, "intermediate": 0.28, "advanced": 0.4,  "elite": 0.52},

        # ── Biceps — barbell (full weight) ────────────────────────────────
        "barbell_curl":        {"beginner": 0.25, "novice": 0.35, "intermediate": 0.5,  "advanced": 0.65, "elite": 0.8},
        "ez_bar_curl":         {"beginner": 0.22, "novice": 0.32, "intermediate": 0.45, "advanced": 0.6,  "elite": 0.75},
        "preacher_curl":       {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.42, "advanced": 0.58, "elite": 0.72},

        # ── Biceps — dumbbell (per hand) ──────────────────────────────────
        "db_curl":             {"beginner": 0.1,  "novice": 0.15, "intermediate": 0.2,  "advanced": 0.28, "elite": 0.38},
        "incline_db_curl":     {"beginner": 0.08, "novice": 0.13, "intermediate": 0.18, "advanced": 0.25, "elite": 0.33},
        "concentration_curl":  {"beginner": 0.08, "novice": 0.13, "intermediate": 0.18, "advanced": 0.25, "elite": 0.33},
        "spider_curl":         {"beginner": 0.08, "novice": 0.13, "intermediate": 0.18, "advanced": 0.25, "elite": 0.33},
        "hammer_curl":         {"beginner": 0.1,  "novice": 0.16, "intermediate": 0.22, "advanced": 0.3,  "elite": 0.4},

        # ── Biceps — cable ────────────────────────────────────────────────
        # Cable curl (bilateral, full stack weight for both arms)
        "cable_curl":          {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.42, "advanced": 0.58, "elite": 0.72},
        # Bayesian cable curl (single arm — weight is per arm)
        "bayesian_curl":       {"beginner": 0.1,  "novice": 0.15, "intermediate": 0.22, "advanced": 0.3,  "elite": 0.4},

        # ── Triceps — barbell ─────────────────────────────────────────────
        "skull_crusher":       {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.42, "advanced": 0.58, "elite": 0.72},

        # ── Triceps — cable (bilateral = full stack) ──────────────────────
        "tricep_pushdown":     {"beginner": 0.25, "novice": 0.38, "intermediate": 0.52, "advanced": 0.68, "elite": 0.85},
        "rope_pushdown":       {"beginner": 0.22, "novice": 0.35, "intermediate": 0.48, "advanced": 0.62, "elite": 0.78},
        "straight_bar_pushdown":{"beginner":0.25, "novice": 0.38, "intermediate": 0.52, "advanced": 0.68, "elite": 0.85},
        "overhead_cable_tri":  {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.42, "advanced": 0.58, "elite": 0.72},
        # Single-arm cable pushdown (one arm, half the weight roughly)
        "single_arm_pushdown": {"beginner": 0.12, "novice": 0.18, "intermediate": 0.25, "advanced": 0.34, "elite": 0.44},

        # ── Triceps — dumbbell (per hand) ─────────────────────────────────
        "db_overhead_tri":     {"beginner": 0.1,  "novice": 0.15, "intermediate": 0.22, "advanced": 0.3,  "elite": 0.4},

        # ── Triceps — machine ────────────────────────────────────────────
        "machine_tri":         {"beginner": 0.22, "novice": 0.33, "intermediate": 0.46, "advanced": 0.62, "elite": 0.78},

        # ── Legs — barbell compound ───────────────────────────────────────
        "squat":               {"beginner": 0.75, "novice": 1.0,  "intermediate": 1.5,  "advanced": 2.0,  "elite": 2.5},
        "front_squat":         {"beginner": 0.5,  "novice": 0.75, "intermediate": 1.1,  "advanced": 1.6,  "elite": 2.0},
        "hack_squat":          {"beginner": 0.6,  "novice": 0.9,  "intermediate": 1.3,  "advanced": 1.8,  "elite": 2.3},
        "romanian_dl":         {"beginner": 0.7,  "novice": 1.0,  "intermediate": 1.4,  "advanced": 1.9,  "elite": 2.4},

        # ── Smith machine legs (10% higher than free squat) ───────────────
        "smith_squat":         {"beginner": 0.82, "novice": 1.1,  "intermediate": 1.65, "advanced": 2.2,  "elite": 2.75},

        # ── Machine legs ─────────────────────────────────────────────────
        # Leg press: machine leverage = much higher absolute loads
        # Intermediate male typically 2.5-3x BW
        "leg_press":           {"beginner": 1.5,  "novice": 2.0,  "intermediate": 2.8,  "advanced": 3.8,  "elite": 4.8},
        "leg_extension":       {"beginner": 0.4,  "novice": 0.55, "intermediate": 0.75, "advanced": 1.0,  "elite": 1.25},
        "leg_curl":            {"beginner": 0.3,  "novice": 0.45, "intermediate": 0.6,  "advanced": 0.8,  "elite": 1.0},
        "lying_leg_curl":      {"beginner": 0.28, "novice": 0.42, "intermediate": 0.58, "advanced": 0.78, "elite": 0.98},
        "seated_leg_curl":     {"beginner": 0.3,  "novice": 0.45, "intermediate": 0.62, "advanced": 0.82, "elite": 1.02},
        "adductor_machine":    {"beginner": 0.4,  "novice": 0.6,  "intermediate": 0.85, "advanced": 1.15, "elite": 1.45},

        # ── Unilateral legs (DB = per hand, weight = load not BW) ─────────
        # Bulgarian split squat: per-hand dumbbell weight
        # Real data: intermediate male ~0.3x BW per hand dumbbell
        # (If you weigh 70kg, 21kg dumbbells per hand = intermediate)
        "bulgarian_split":     {"beginner": 0.12, "novice": 0.22, "intermediate": 0.32, "advanced": 0.45, "elite": 0.6},
        # Walking lunges: per-hand dumbbell
        "walking_lunges":      {"beginner": 0.1,  "novice": 0.18, "intermediate": 0.28, "advanced": 0.4,  "elite": 0.55},
        # Goblet squat: single dumbbell (full weight, not per hand)
        "goblet_squat":        {"beginner": 0.2,  "novice": 0.35, "intermediate": 0.5,  "advanced": 0.7,  "elite": 0.9},

        # ── Glutes ────────────────────────────────────────────────────────
        "hip_thrust":          {"beginner": 0.5,  "novice": 0.9,  "intermediate": 1.4,  "advanced": 1.9,  "elite": 2.4},
        # Cable kickback: single leg, weight is per leg
        "cable_kickback":      {"beginner": 0.05, "novice": 0.08, "intermediate": 0.12, "advanced": 0.17, "elite": 0.22},

        # ── Calves ───────────────────────────────────────────────────────
        "calf_raise":          {"beginner": 0.6,  "novice": 0.9,  "intermediate": 1.25, "advanced": 1.6,  "elite": 2.0},
        "seated_calf_raise":   {"beginner": 0.4,  "novice": 0.6,  "intermediate": 0.85, "advanced": 1.15, "elite": 1.45},

        # ── Core ──────────────────────────────────────────────────────────
        "cable_crunch":        {"beginner": 0.2,  "novice": 0.32, "intermediate": 0.45, "advanced": 0.6,  "elite": 0.75},
    },

    "female": {
        # ── Barbell chest ─────────────────────────────────────────────────
        "bench":               {"beginner": 0.3,  "novice": 0.5,  "intermediate": 0.65, "advanced": 1.0,  "elite": 1.3},
        "incline_bench":       {"beginner": 0.22, "novice": 0.38, "intermediate": 0.52, "advanced": 0.8,  "elite": 1.05},
        "decline_bench":       {"beginner": 0.32, "novice": 0.52, "intermediate": 0.68, "advanced": 1.05, "elite": 1.35},
        "close_grip_bench":    {"beginner": 0.22, "novice": 0.38, "intermediate": 0.52, "advanced": 0.78, "elite": 1.02},

        # ── Smith machine chest ───────────────────────────────────────────
        "smith_bench":         {"beginner": 0.33, "novice": 0.55, "intermediate": 0.72, "advanced": 1.1,  "elite": 1.42},
        "smith_incline":       {"beginner": 0.25, "novice": 0.42, "intermediate": 0.57, "advanced": 0.88, "elite": 1.15},

        # ── Dumbbell chest (per hand) ─────────────────────────────────────
        "db_bench":            {"beginner": 0.12, "novice": 0.18, "intermediate": 0.25, "advanced": 0.35, "elite": 0.45},
        "incline_db_bench":    {"beginner": 0.1,  "novice": 0.16, "intermediate": 0.22, "advanced": 0.3,  "elite": 0.4},
        "db_fly":              {"beginner": 0.06, "novice": 0.1,  "intermediate": 0.14, "advanced": 0.2,  "elite": 0.26},

        # ── Machine / cable chest ─────────────────────────────────────────
        "machine_chest":       {"beginner": 0.3,  "novice": 0.48, "intermediate": 0.65, "advanced": 0.9,  "elite": 1.15},
        "incline_machine":     {"beginner": 0.25, "novice": 0.4,  "intermediate": 0.55, "advanced": 0.76, "elite": 0.98},
        "pec_deck":            {"beginner": 0.18, "novice": 0.28, "intermediate": 0.4,  "advanced": 0.55, "elite": 0.7},
        "cable_fly":           {"beginner": 0.08, "novice": 0.13, "intermediate": 0.19, "advanced": 0.27, "elite": 0.36},
        "weighted_dip":        {"beginner": 0.0,  "novice": 0.1,  "intermediate": 0.25, "advanced": 0.45, "elite": 0.65},

        # ── Barbell back ─────────────────────────────────────────────────
        "deadlift":            {"beginner": 0.65, "novice": 0.9,  "intermediate": 1.25, "advanced": 1.75, "elite": 2.2},
        "barbell_row":         {"beginner": 0.3,  "novice": 0.5,  "intermediate": 0.65, "advanced": 1.0,  "elite": 1.3},
        "t_bar_row":           {"beginner": 0.25, "novice": 0.4,  "intermediate": 0.55, "advanced": 0.78, "elite": 1.0},
        "romanian_deadlift":   {"beginner": 0.45, "novice": 0.7,  "intermediate": 1.0,  "advanced": 1.4,  "elite": 1.8},
        "back_extension":      {"beginner": 0.12, "novice": 0.22, "intermediate": 0.35, "advanced": 0.52, "elite": 0.68},
        "chest_supported_row": {"beginner": 0.22, "novice": 0.35, "intermediate": 0.48, "advanced": 0.68, "elite": 0.88},

        # ── Machine / cable back ──────────────────────────────────────────
        "lat_pulldown":        {"beginner": 0.32, "novice": 0.45, "intermediate": 0.6,  "advanced": 0.8,  "elite": 1.0},
        "close_lat_pulldown":  {"beginner": 0.33, "novice": 0.47, "intermediate": 0.62, "advanced": 0.82, "elite": 1.02},
        "seated_cable_row":    {"beginner": 0.28, "novice": 0.4,  "intermediate": 0.55, "advanced": 0.72, "elite": 0.9},
        "wide_cable_row":      {"beginner": 0.26, "novice": 0.38, "intermediate": 0.52, "advanced": 0.7,  "elite": 0.88},
        "machine_row":         {"beginner": 0.25, "novice": 0.38, "intermediate": 0.52, "advanced": 0.72, "elite": 0.92},
        "db_row":              {"beginner": 0.16, "novice": 0.24, "intermediate": 0.33, "advanced": 0.46, "elite": 0.58},
        "weighted_pullup":     {"beginner": 0.0,  "novice": 0.1,  "intermediate": 0.22, "advanced": 0.38, "elite": 0.55},
        "weighted_chinup":     {"beginner": 0.0,  "novice": 0.1,  "intermediate": 0.22, "advanced": 0.38, "elite": 0.55},

        # ── Shoulders ─────────────────────────────────────────────────────
        "overhead_press":      {"beginner": 0.2,  "novice": 0.3,  "intermediate": 0.45, "advanced": 0.65, "elite": 0.85},
        "upright_row":         {"beginner": 0.18, "novice": 0.28, "intermediate": 0.4,  "advanced": 0.55, "elite": 0.72},
        "smith_ohp":           {"beginner": 0.22, "novice": 0.33, "intermediate": 0.5,  "advanced": 0.72, "elite": 0.94},
        "db_shoulder_press":   {"beginner": 0.07, "novice": 0.11, "intermediate": 0.16, "advanced": 0.22, "elite": 0.29},
        "arnold_press":        {"beginner": 0.06, "novice": 0.1,  "intermediate": 0.14, "advanced": 0.2,  "elite": 0.27},
        "machine_shoulder":    {"beginner": 0.18, "novice": 0.28, "intermediate": 0.4,  "advanced": 0.55, "elite": 0.72},
        "lateral_raise":       {"beginner": 0.03, "novice": 0.05, "intermediate": 0.08, "advanced": 0.11, "elite": 0.15},
        "cable_lateral_raise": {"beginner": 0.03, "novice": 0.05, "intermediate": 0.08, "advanced": 0.11, "elite": 0.15},
        "rear_delt_fly":       {"beginner": 0.02, "novice": 0.04, "intermediate": 0.07, "advanced": 0.1,  "elite": 0.13},
        "cable_rear_delt":     {"beginner": 0.02, "novice": 0.04, "intermediate": 0.07, "advanced": 0.1,  "elite": 0.13},
        "reverse_pec_deck":    {"beginner": 0.12, "novice": 0.19, "intermediate": 0.28, "advanced": 0.38, "elite": 0.5},
        "face_pull":           {"beginner": 0.06, "novice": 0.11, "intermediate": 0.18, "advanced": 0.26, "elite": 0.35},

        # ── Biceps ────────────────────────────────────────────────────────
        "barbell_curl":        {"beginner": 0.15, "novice": 0.22, "intermediate": 0.32, "advanced": 0.44, "elite": 0.56},
        "ez_bar_curl":         {"beginner": 0.13, "novice": 0.2,  "intermediate": 0.29, "advanced": 0.4,  "elite": 0.51},
        "preacher_curl":       {"beginner": 0.12, "novice": 0.18, "intermediate": 0.27, "advanced": 0.38, "elite": 0.48},
        "db_curl":             {"beginner": 0.06, "novice": 0.09, "intermediate": 0.13, "advanced": 0.18, "elite": 0.24},
        "incline_db_curl":     {"beginner": 0.05, "novice": 0.08, "intermediate": 0.11, "advanced": 0.16, "elite": 0.22},
        "concentration_curl":  {"beginner": 0.05, "novice": 0.08, "intermediate": 0.11, "advanced": 0.16, "elite": 0.22},
        "spider_curl":         {"beginner": 0.05, "novice": 0.08, "intermediate": 0.11, "advanced": 0.16, "elite": 0.22},
        "hammer_curl":         {"beginner": 0.06, "novice": 0.1,  "intermediate": 0.14, "advanced": 0.2,  "elite": 0.27},
        "cable_curl":          {"beginner": 0.12, "novice": 0.19, "intermediate": 0.27, "advanced": 0.38, "elite": 0.48},
        "bayesian_curl":       {"beginner": 0.06, "novice": 0.09, "intermediate": 0.14, "advanced": 0.19, "elite": 0.26},

        # ── Triceps ───────────────────────────────────────────────────────
        "skull_crusher":       {"beginner": 0.12, "novice": 0.19, "intermediate": 0.27, "advanced": 0.38, "elite": 0.48},
        "tricep_pushdown":     {"beginner": 0.15, "novice": 0.24, "intermediate": 0.34, "advanced": 0.46, "elite": 0.58},
        "rope_pushdown":       {"beginner": 0.13, "novice": 0.21, "intermediate": 0.3,  "advanced": 0.41, "elite": 0.52},
        "straight_bar_pushdown":{"beginner":0.15, "novice": 0.24, "intermediate": 0.34, "advanced": 0.46, "elite": 0.58},
        "overhead_cable_tri":  {"beginner": 0.12, "novice": 0.19, "intermediate": 0.27, "advanced": 0.38, "elite": 0.48},
        "single_arm_pushdown": {"beginner": 0.07, "novice": 0.11, "intermediate": 0.16, "advanced": 0.22, "elite": 0.29},
        "db_overhead_tri":     {"beginner": 0.06, "novice": 0.09, "intermediate": 0.14, "advanced": 0.19, "elite": 0.26},
        "machine_tri":         {"beginner": 0.13, "novice": 0.2,  "intermediate": 0.29, "advanced": 0.4,  "elite": 0.51},
        "close_grip_bench":    {"beginner": 0.22, "novice": 0.38, "intermediate": 0.52, "advanced": 0.78, "elite": 1.02},

        # ── Legs ──────────────────────────────────────────────────────────
        "squat":               {"beginner": 0.5,  "novice": 0.75, "intermediate": 1.0,  "advanced": 1.5,  "elite": 1.9},
        "front_squat":         {"beginner": 0.32, "novice": 0.5,  "intermediate": 0.75, "advanced": 1.1,  "elite": 1.4},
        "hack_squat":          {"beginner": 0.38, "novice": 0.58, "intermediate": 0.85, "advanced": 1.2,  "elite": 1.55},
        "romanian_dl":         {"beginner": 0.45, "novice": 0.7,  "intermediate": 1.0,  "advanced": 1.4,  "elite": 1.8},
        "smith_squat":         {"beginner": 0.55, "novice": 0.82, "intermediate": 1.1,  "advanced": 1.65, "elite": 2.08},
        "leg_press":           {"beginner": 1.0,  "novice": 1.4,  "intermediate": 2.0,  "advanced": 2.8,  "elite": 3.6},
        "leg_extension":       {"beginner": 0.28, "novice": 0.4,  "intermediate": 0.55, "advanced": 0.74, "elite": 0.93},
        "leg_curl":            {"beginner": 0.2,  "novice": 0.32, "intermediate": 0.44, "advanced": 0.6,  "elite": 0.76},
        "lying_leg_curl":      {"beginner": 0.18, "novice": 0.3,  "intermediate": 0.42, "advanced": 0.58, "elite": 0.74},
        "seated_leg_curl":     {"beginner": 0.2,  "novice": 0.32, "intermediate": 0.45, "advanced": 0.62, "elite": 0.78},
        "adductor_machine":    {"beginner": 0.28, "novice": 0.42, "intermediate": 0.6,  "advanced": 0.82, "elite": 1.05},
        "bulgarian_split":     {"beginner": 0.08, "novice": 0.15, "intermediate": 0.22, "advanced": 0.32, "elite": 0.44},
        "walking_lunges":      {"beginner": 0.06, "novice": 0.12, "intermediate": 0.2,  "advanced": 0.3,  "elite": 0.42},
        "goblet_squat":        {"beginner": 0.12, "novice": 0.22, "intermediate": 0.35, "advanced": 0.5,  "elite": 0.65},
        "hip_thrust":          {"beginner": 0.4,  "novice": 0.75, "intermediate": 1.15, "advanced": 1.6,  "elite": 2.1},
        "cable_kickback":      {"beginner": 0.03, "novice": 0.05, "intermediate": 0.08, "advanced": 0.11, "elite": 0.15},
        "calf_raise":          {"beginner": 0.4,  "novice": 0.6,  "intermediate": 0.85, "advanced": 1.15, "elite": 1.45},
        "seated_calf_raise":   {"beginner": 0.25, "novice": 0.4,  "intermediate": 0.58, "advanced": 0.8,  "elite": 1.02},

        # ── Core ──────────────────────────────────────────────────────────
        "cable_crunch":        {"beginner": 0.12, "novice": 0.2,  "intermediate": 0.3,  "advanced": 0.42, "elite": 0.54},
    },
}


# ---------------------------------------------------------------------------
# Exercise name → standard key mapping
# ---------------------------------------------------------------------------

EXERCISE_TO_STANDARD = {
    # ── Chest — barbell ───────────────────────────────────────────────────
    "bench press":                     "bench",
    "barbell bench press":             "bench",
    "incline bench press":             "incline_bench",
    "incline barbell bench press":     "incline_bench",
    "decline bench press":             "decline_bench",
    "close-grip bench press":          "close_grip_bench",
    "close grip bench press":          "close_grip_bench",

    # ── Chest — smith machine ─────────────────────────────────────────────
    "smith machine bench press":       "smith_bench",
    "smith machine incline press":     "smith_incline",

    # ── Chest — dumbbell (per hand) ───────────────────────────────────────
    "dumbbell bench press":            "db_bench",
    "flat dumbbell bench press":       "db_bench",
    "incline dumbbell press":          "incline_db_bench",
    "dumbbell incline press":          "incline_db_bench",
    "dumbbell fly":                    "db_fly",
    "flat dumbbell fly":               "db_fly",
    "db fly":                          "db_fly",

    # ── Chest — machine / cable ───────────────────────────────────────────
    "machine chest press":             "machine_chest",
    "incline machine press":           "incline_machine",
    "pec deck":                        "pec_deck",
    "cable fly":                       "cable_fly",
    "low cable fly":                   "cable_fly",
    "high cable fly":                  "cable_fly",

    # ── Chest — weighted bodyweight ───────────────────────────────────────
    "weighted dip":                    "weighted_dip",
    "dip":                             None,  # bodyweight → use rep standard
    # ↑ None = route to BODYWEIGHT_EXERCISE_MAP for reps-based classification

    # ── Back — barbell ────────────────────────────────────────────────────
    "deadlift":                        "deadlift",
    "barbell row":                     "barbell_row",
    "barbell bent-over row":           "barbell_row",
    "bent-over row":                   "barbell_row",
    "t-bar row":                       "t_bar_row",
    "t bar row":                       "t_bar_row",
    "romanian deadlift":               "romanian_deadlift",
    "romanian deadlift (rdl)":         "romanian_deadlift",
    "rdl":                             "romanian_deadlift",
    "back extension":                  "back_extension",
    "back extension (hyperextension)": "back_extension",
    "hyperextension":                  "back_extension",
    "chest-supported row":             "chest_supported_row",
    "chest supported row":             "chest_supported_row",

    # ── Back — machine / cable ────────────────────────────────────────────
    "lat pulldown":                    "lat_pulldown",
    "close-grip lat pulldown":         "close_lat_pulldown",
    "close grip lat pulldown":         "close_lat_pulldown",
    "seated cable row":                "seated_cable_row",
    "wide-grip cable row":             "wide_cable_row",
    "wide grip cable row":             "wide_cable_row",
    "machine row":                     "machine_row",

    # ── Back — dumbbell / unilateral ─────────────────────────────────────
    "one-arm dumbbell row":            "db_row",
    "one arm dumbbell row":            "db_row",
    "dumbbell row":                    "db_row",

    # ── Back — bodyweight ─────────────────────────────────────────────────
    "pull-up":                         None,  # bodyweight reps
    "pullup":                          None,
    "pull up":                         None,
    "chin-up":                         None,  # bodyweight reps
    "chinup":                          None,
    "chin up":                         None,

    # ── Back — weighted bodyweight ────────────────────────────────────────
    "weighted pull-up":                "weighted_pullup",
    "weighted pullup":                 "weighted_pullup",
    "weighted chin-up":                "weighted_chinup",
    "weighted chinup":                 "weighted_chinup",

    # ── Shoulders — barbell ───────────────────────────────────────────────
    "overhead press":                  "overhead_press",
    "barbell overhead press":          "overhead_press",
    "ohp":                             "overhead_press",
    "shoulder press":                  "overhead_press",
    "upright row":                     "upright_row",

    # ── Shoulders — smith ─────────────────────────────────────────────────
    "smith machine ohp":               "smith_ohp",

    # ── Shoulders — dumbbell (per hand) ───────────────────────────────────
    "dumbbell shoulder press":         "db_shoulder_press",
    "arnold press":                    "arnold_press",

    # ── Shoulders — machine ───────────────────────────────────────────────
    "machine shoulder press":          "machine_shoulder",

    # ── Shoulders — isolation ─────────────────────────────────────────────
    "lateral raise":                   "lateral_raise",
    "dumbbell lateral raise":          "lateral_raise",
    "cable lateral raise":             "cable_lateral_raise",
    "rear delt fly":                   "rear_delt_fly",
    "cable rear delt fly":             "cable_rear_delt",
    "reverse pec deck":                "reverse_pec_deck",
    "face pull":                       "face_pull",

    # ── Biceps — barbell ─────────────────────────────────────────────────
    "barbell curl":                    "barbell_curl",
    "ez bar curl":                     "ez_bar_curl",
    "ez-bar curl":                     "ez_bar_curl",
    "preacher curl":                   "preacher_curl",

    # ── Biceps — dumbbell (per hand) ─────────────────────────────────────
    "bicep curl":                      "db_curl",
    "dumbbell curl":                   "db_curl",
    "incline dumbbell curl":           "incline_db_curl",
    "concentration curl":              "concentration_curl",
    "spider curl":                     "spider_curl",
    "hammer curl":                     "hammer_curl",

    # ── Biceps — cable ────────────────────────────────────────────────────
    "cable curl":                      "cable_curl",
    "bayesian cable curl":             "bayesian_curl",
    "bayesian curl":                   "bayesian_curl",

    # ── Triceps — barbell ─────────────────────────────────────────────────
    "skull crusher":                   "skull_crusher",
    "skull crushers":                  "skull_crusher",

    # ── Triceps — cable ───────────────────────────────────────────────────
    "tricep pushdown":                 "tricep_pushdown",
    "cable pushdown":                  "tricep_pushdown",
    "cable pushdown (rope)":           "rope_pushdown",
    "rope pushdown":                   "rope_pushdown",
    "straight-bar pushdown":           "straight_bar_pushdown",
    "straight bar pushdown":           "straight_bar_pushdown",
    "overhead cable triceps extension":"overhead_cable_tri",
    "overhead cable tricep extension": "overhead_cable_tri",
    "single-arm cable pushdown":       "single_arm_pushdown",
    "single arm cable pushdown":       "single_arm_pushdown",

    # ── Triceps — dumbbell ────────────────────────────────────────────────
    "dumbbell overhead extension":     "db_overhead_tri",
    "db overhead extension":           "db_overhead_tri",

    # ── Triceps — machine ─────────────────────────────────────────────────
    "machine triceps extension":       "machine_tri",
    "machine tricep extension":        "machine_tri",

    # ── Legs — barbell ───────────────────────────────────────────────────
    "squat":                           "squat",
    "back squat":                      "squat",
    "barbell back squat":              "squat",
    "front squat":                     "front_squat",
    "hack squat":                      "hack_squat",
    "romanian deadlift (rdl)":         "romanian_dl",

    # ── Legs — smith machine ─────────────────────────────────────────────
    "smith machine squat":             "smith_squat",

    # ── Legs — machine ───────────────────────────────────────────────────
    "leg press":                       "leg_press",
    "leg extension":                   "leg_extension",
    "leg curl":                        "leg_curl",
    "lying leg curl":                  "lying_leg_curl",
    "seated leg curl":                 "seated_leg_curl",
    "adductor machine":                "adductor_machine",

    # ── Legs — dumbbell / unilateral ─────────────────────────────────────
    "bulgarian split squat":           "bulgarian_split",
    "walking lunges":                  "walking_lunges",
    "goblet squat":                    "goblet_squat",

    # ── Glutes ───────────────────────────────────────────────────────────
    "hip thrust":                      "hip_thrust",
    "cable kickback":                  "cable_kickback",

    # ── Calves ───────────────────────────────────────────────────────────
    "calf raise":                      "calf_raise",
    "standing calf raise":             "calf_raise",
    "seated calf raise":               "seated_calf_raise",

    # ── Core ──────────────────────────────────────────────────────────────
    "cable crunch":                    "cable_crunch",
    "hanging leg raise":               None,  # bodyweight reps
    "plank":                           None,  # time-based bodyweight
}


def classify_bodyweight_exercise(exercise_name: str, gender: str, reps: int) -> Optional[str]:
    """
    For bodyweight exercises (pull-up, chin-up, dip, hanging leg raise, plank).
    reps = max clean reps performed (or seconds for plank).
    Returns beginner/novice/intermediate/advanced/elite or None.
    """
    bw_key = BODYWEIGHT_EXERCISE_MAP.get(exercise_name.strip().lower())
    if not bw_key or gender not in BODYWEIGHT_REP_STANDARDS:
        return None
    table = BODYWEIGHT_REP_STANDARDS[gender].get(bw_key)
    if not table:
        return None
    level = None
    for tier in ["beginner", "novice", "intermediate", "advanced", "elite"]:
        if reps >= table[tier]:
            level = tier
    return level


def classify_strength_level(
    exercise_name: str,
    gender: str,
    bodyweight_kg: float,
    one_rm_kg: float,
) -> Optional[str]:
    """
    Returns one of: beginner/novice/intermediate/advanced/elite or None.

    For bodyweight exercises (pull-up, dip etc.), pass reps as one_rm_kg
    and this will route correctly to the reps-based classifier.
    For weighted exercises, one_rm_kg is the estimated 1RM.
    """
    name_lower = exercise_name.strip().lower()
    std_key = EXERCISE_TO_STANDARD.get(name_lower)

    # std_key is None = either bodyweight exercise or not in our list
    if std_key is None:
        # Check if it's a bodyweight exercise
        if name_lower in BODYWEIGHT_EXERCISE_MAP:
            # one_rm_kg is being used as reps here for bodyweight
            return classify_bodyweight_exercise(name_lower, gender, int(one_rm_kg))
        return None

    if gender not in STRENGTH_STANDARDS or bodyweight_kg <= 0:
        return None
    if gender == "other":
        return None

    standards = STRENGTH_STANDARDS[gender]
    if std_key not in standards:
        return None

    ratio = one_rm_kg / bodyweight_kg
    table = standards[std_key]
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
    Returns absolute kg breakpoints for frontend visual scale.
    For bodyweight exercises returns rep breakpoints instead.
    """
    name_lower = exercise_name.strip().lower()
    std_key = EXERCISE_TO_STANDARD.get(name_lower)

    if std_key is None:
        # Bodyweight exercise — return rep breakpoints
        bw_key = BODYWEIGHT_EXERCISE_MAP.get(name_lower)
        if bw_key and gender in BODYWEIGHT_REP_STANDARDS:
            table = BODYWEIGHT_REP_STANDARDS[gender].get(bw_key)
            if table:
                unit = "seconds" if "plank" in bw_key else "reps"
                return {tier: f"{val} {unit}" for tier, val in table.items()}
        return None

    if gender not in STRENGTH_STANDARDS or bodyweight_kg <= 0:
        return None

    standards = STRENGTH_STANDARDS[gender]
    if std_key not in standards:
        return None

    table = standards[std_key]
    return {
        tier: round(ratio * bodyweight_kg, 1)
        for tier, ratio in table.items()
    }