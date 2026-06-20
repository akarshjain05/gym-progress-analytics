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
    """Epley formula. Most accurate for reps <= ~10-12; degrades beyond that.
    For reps == 1 this just returns the lifted weight."""
    if reps <= 0 or weight_kg < 0:
        raise ValueError("weight must be >= 0 and reps must be > 0")
    if reps == 1:
        return round(weight_kg, 2)
    return round(weight_kg * (1 + reps / 30), 2)


def estimate_1rm_brzycki(weight_kg: float, reps: int) -> float:
    """Brzycki formula. Undefined/unreliable for reps >= 37; we cap input use
    to reps <= 12 in practice (same recommendation as Epley)."""
    if reps <= 0 or weight_kg < 0:
        raise ValueError("weight must be >= 0 and reps must be > 0")
    if reps == 1:
        return round(weight_kg, 2)
    if reps >= 37:
        raise ValueError("Brzycki formula is unreliable for reps >= 37")
    return round(weight_kg * 36 / (37 - reps), 2)


def best_estimated_1rm(sets: list[tuple[float, int]]) -> float:
    """Given a list of (weight_kg, reps) tuples, return the highest estimated 1RM."""
    if not sets:
        return 0.0
    return max(estimate_1rm_epley(w, r) for w, r in sets)


# ---------------------------------------------------------------------------
# BMR / TDEE
# ---------------------------------------------------------------------------

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,       # little/no exercise
    "light": 1.375,         # light exercise 1-3 days/week
    "moderate": 1.55,       # moderate exercise 3-5 days/week
    "active": 1.725,        # hard exercise 6-7 days/week
    "very_active": 1.9,     # very hard exercise + physical job
}

# kcal stored per kg of body mass change. The commonly cited "3500 kcal per lb"
# figure converts to ~7716 kcal/kg; we use 7700 kcal/kg, the figure most
# fitness literature rounds to. This is an approximation - actual energy
# density of gained/lost mass varies by body composition.
KCAL_PER_KG_BODY_MASS = 7700


def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """Mifflin-St Jeor equation, the most accurate widely-used BMR formula
    for the general population (more accurate than the older Harris-Benedict
    equation in most validation studies)."""
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    if gender == "male":
        return round(base + 5, 1)
    elif gender == "female":
        return round(base - 161, 1)
    else:
        # No neutral term in the original formula - average the two offsets.
        return round(base + (5 - 161) / 2, 1)


def calculate_tdee(bmr: float, activity_level: str) -> float:
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, ACTIVITY_MULTIPLIERS["moderate"])
    return round(bmr * multiplier, 1)


def estimate_actual_tdee(avg_daily_calories: float, weight_change_kg: float, num_days: int) -> Optional[float]:
    """
    Back-calculates a person's REAL maintenance calories from logged data,
    rather than relying on a population-average formula:

        total energy balance (kcal) = weight_change_kg * KCAL_PER_KG_BODY_MASS
        avg daily balance (kcal)    = total energy balance / num_days
        actual TDEE                 = avg_daily_calories - avg daily balance

    Returns None if there isn't enough data to make this meaningful
    (less than 10 days), since day-to-day weight noise (water, food
    volume, etc.) dominates over shorter windows.
    """
    if num_days < 10:
        return None
    total_balance_kcal = weight_change_kg * KCAL_PER_KG_BODY_MASS
    avg_daily_balance = total_balance_kcal / num_days
    return round(avg_daily_calories - avg_daily_balance, 0)


# ---------------------------------------------------------------------------
# Trend / change calculations
# ---------------------------------------------------------------------------

def percent_change(old_value: float, new_value: float) -> Optional[float]:
    """Returns percent change from old to new. None if old_value is 0
    (percent change is undefined when starting from zero)."""
    if old_value == 0:
        return None
    return round(((new_value - old_value) / abs(old_value)) * 100, 2)


def simple_moving_average(values: list[float], window: int) -> list[Optional[float]]:
    """Trailing simple moving average. values must be in chronological order.
    Returns None for indices before a full window is available."""
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
    """
    Ordinary least squares slope (y per unit x). Used to compute weekly
    rate of weight change from a noisy series of daily logs - more robust
    than just comparing first/last point, since it uses every data point.
    Returns None if fewer than 2 distinct x values are present.
    """
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
    """Takes [(date, weight_kg), ...] (any order, may have gaps/duplicated
    dates not allowed upstream) and returns kg/week trend via linear
    regression on day-offsets. Positive = gaining, negative = losing."""
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
    """
    Projects days until goal weight is reached at the current trend rate.
    Returns None if:
      - already at goal
      - no usable rate (not enough data)
      - rate is ~0 (no measurable progress)
      - rate is moving in the WRONG direction relative to the goal
    """
    diff = goal_weight_kg - current_weight_kg
    if abs(diff) < 0.05:
        return None
    if weekly_rate_kg is None or abs(weekly_rate_kg) < 0.01:
        return None
    # diff and weekly_rate_kg must have the same sign to be heading toward goal
    if (diff > 0) != (weekly_rate_kg > 0):
        return None
    weeks_needed = diff / weekly_rate_kg
    return round(weeks_needed * 7)


# ---------------------------------------------------------------------------
# Strength standards (approximate, bodyweight-ratio based)
# ---------------------------------------------------------------------------

# Rough, widely-used community heuristics (e.g. popularized by strength
# standards sites/calculators) expressing 1RM as a multiple of bodyweight.
# These are APPROXIMATE classifications for motivation, not authoritative
# or sex/age normalized beyond the male/female split commonly used.
STRENGTH_STANDARDS = {
    "male": {
        "bench": {"beginner": 0.5, "novice": 0.75, "intermediate": 1.0, "advanced": 1.5, "elite": 2.0},
        "squat": {"beginner": 0.75, "novice": 1.0, "intermediate": 1.5, "advanced": 2.0, "elite": 2.5},
        "deadlift": {"beginner": 1.0, "novice": 1.25, "intermediate": 1.75, "advanced": 2.25, "elite": 2.75},
        "overhead_press": {"beginner": 0.35, "novice": 0.5, "intermediate": 0.7, "advanced": 1.0, "elite": 1.3},
    },
    "female": {
        "bench": {"beginner": 0.3, "novice": 0.5, "intermediate": 0.65, "advanced": 1.0, "elite": 1.3},
        "squat": {"beginner": 0.5, "novice": 0.75, "intermediate": 1.0, "advanced": 1.5, "elite": 1.9},
        "deadlift": {"beginner": 0.65, "novice": 0.9, "intermediate": 1.25, "advanced": 1.75, "elite": 2.2},
        "overhead_press": {"beginner": 0.2, "novice": 0.3, "intermediate": 0.45, "advanced": 0.65, "elite": 0.85},
    },
}

STANDARD_LIFT_KEYS = {
    "bench press": "bench", "bench": "bench",
    "squat": "squat", "back squat": "squat",
    "deadlift": "deadlift",
    "overhead press": "overhead_press", "ohp": "overhead_press", "shoulder press": "overhead_press",
}


def classify_strength_level(exercise_name: str, gender: str, bodyweight_kg: float, one_rm_kg: float) -> Optional[str]:
    """Returns one of beginner/novice/intermediate/advanced/elite, or None if
    this exercise isn't in our standards table or gender is 'other'
    (standards tables don't have a population-validated neutral category)."""
    key = STANDARD_LIFT_KEYS.get(exercise_name.strip().lower())
    if key is None or gender not in STRENGTH_STANDARDS or bodyweight_kg <= 0:
        return None
    ratio = one_rm_kg / bodyweight_kg
    table = STRENGTH_STANDARDS[gender][key]
    level = None
    for tier in ["beginner", "novice", "intermediate", "advanced", "elite"]:
        if ratio >= table[tier]:
            level = tier
    return level
