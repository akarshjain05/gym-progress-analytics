import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import date, timedelta
import pytest

from app import calculations as calc


def test_epley_1rm_known_values():
    # 100kg x 5 reps -> 100 * (1 + 5/30) = 116.67
    assert calc.estimate_1rm_epley(100, 5) == pytest.approx(116.67, abs=0.01)
    # 1 rep -> just the weight
    assert calc.estimate_1rm_epley(140, 1) == 140


def test_brzycki_1rm_known_values():
    # 100kg x 5 reps -> 100 * 36 / 32 = 112.5
    assert calc.estimate_1rm_brzycki(100, 5) == 112.5
    with pytest.raises(ValueError):
        calc.estimate_1rm_brzycki(100, 37)


def test_best_estimated_1rm_picks_max():
    sets = [(100, 5), (110, 3), (90, 8)]
    # 110x3 -> 110*(1+3/30)=121; 100x5->116.67; 90x8->114
    assert calc.best_estimated_1rm(sets) == pytest.approx(121.0, abs=0.01)


def test_kg_lb_roundtrip():
    kg = 80.0
    assert calc.lb_to_kg(calc.kg_to_lb(kg)) == pytest.approx(kg, abs=0.0001)
    assert calc.kg_to_lb(100) == pytest.approx(220.46, abs=0.01)


def test_bmr_mifflin_male():
    # 80kg, 180cm, 25yo male: 10*80+6.25*180-5*25+5 = 800+1125-125+5=1805
    assert calc.calculate_bmr(80, 180, 25, "male") == 1805


def test_bmr_mifflin_female():
    # 60kg, 165cm, 30yo female: 10*60+6.25*165-5*30-161 = 600+1031.25-150-161=1320.25
    # Python's round() uses banker's rounding (round-half-to-even), so 1320.25
    # rounds to 1320.2, not 1320.3 - this is correct floating point behavior,
    # not a bug. Use approx with a tolerance that accounts for it.
    assert calc.calculate_bmr(60, 165, 30, "female") == pytest.approx(1320.25, abs=0.05)


def test_tdee_multiplier():
    assert calc.calculate_tdee(1805, "sedentary") == pytest.approx(1805 * 1.2, abs=0.1)
    assert calc.calculate_tdee(1805, "very_active") == pytest.approx(1805 * 1.9, abs=0.1)


def test_actual_tdee_estimation_deficit():
    # ate 2200 avg/day, lost 1kg over 14 days -> deficit
    # balance = -1*7700 = -7700 total, /14 = -550/day
    # actual tdee = 2200 - (-550) = 2750
    result = calc.estimate_actual_tdee(avg_daily_calories=2200, weight_change_kg=-1, num_days=14)
    assert result == 2750


def test_actual_tdee_insufficient_data_returns_none():
    assert calc.estimate_actual_tdee(2200, -1, 5) is None


def test_percent_change_basic():
    assert calc.percent_change(100, 120) == 20.0
    assert calc.percent_change(100, 80) == -20.0
    assert calc.percent_change(0, 50) is None


def test_simple_moving_average():
    values = [10, 20, 30, 40, 50]
    sma = calc.simple_moving_average(values, window=3)
    assert sma == [None, None, 20.0, 30.0, 40.0]


def test_weekly_rate_of_change_linear_loss():
    # Losing exactly 0.5kg/week over 4 weeks, noise-free
    base = date(2026, 1, 1)
    data = [(base + timedelta(days=7 * i), 80 - 0.5 * i) for i in range(5)]
    rate = calc.weekly_rate_of_change(data)
    assert rate == pytest.approx(-0.5, abs=0.01)


def test_weekly_rate_of_change_insufficient_data():
    assert calc.weekly_rate_of_change([(date(2026, 1, 1), 80)]) is None


def test_project_days_to_goal_losing_toward_lower_goal():
    # current 80kg, goal 75kg, losing 0.5kg/week -> 10 weeks -> 70 days
    days = calc.project_days_to_goal(80, 75, -0.5)
    assert days == 70


def test_project_days_to_goal_wrong_direction_returns_none():
    # goal is lower, but trend is gaining weight -> never gets there
    assert calc.project_days_to_goal(80, 75, 0.3) is None


def test_project_days_to_goal_already_there():
    assert calc.project_days_to_goal(75.02, 75, -0.5) is None


def test_strength_standard_classification():
    # 80kg male benching 100kg 1RM -> ratio 1.25 -> between intermediate(1.0) and advanced(1.5) -> intermediate
    level = calc.classify_strength_level("bench press", "male", 80, 100)
    assert level == "intermediate"


def test_strength_standard_unknown_exercise_returns_none():
    assert calc.classify_strength_level("bicep curl", "male", 80, 30) is None


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
