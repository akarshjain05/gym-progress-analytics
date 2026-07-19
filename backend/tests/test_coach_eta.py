import pytest
from datetime import date, timedelta
import math
from app.routers.coach import _eta_for_exercise, ist_today

def test_eta_phase2_success():
    # current_1rm = 90, target = 100, slope = 0.5 kg/day (3.5 kg/week)
    base_date = ist_today() - timedelta(days=20)
    # pred = slope * future + intercept
    # intercept = 90 - slope * 20 = 90 - 10 = 80
    slope = 0.5
    intercept = 80.0
    latest_1rm = 90.0
    target_1rm = 100.0
    
    eta = _eta_for_exercise(latest_1rm, target_1rm, "improving", 2, slope, intercept, 0, 0.9, base_date, 20)
    
    assert eta is not None
    assert eta["target_kg"] == 100.0
    # future_offset = (100 - 80) / 0.5 = 40 days from base_date
    # days_away = 40 - 20 = 20 days away
    assert eta["days_away"] == 20

def test_eta_goal_already_met():
    eta = _eta_for_exercise(100.0, 100.0, "improving", 2, 0.5, 80.0, 0, 0.9, ist_today(), 20)
    assert eta is None

def test_eta_declining_trend():
    eta = _eta_for_exercise(90.0, 100.0, "declining", 2, -0.1, 92.0, 0, 0.9, ist_today(), 20)
    assert eta is None

def test_eta_low_r2():
    eta = _eta_for_exercise(90.0, 100.0, "improving", 2, 0.5, 80.0, 0, 0.2, ist_today(), 20)
    assert eta is None

def test_eta_far_future():
    # slope = 0.01 kg/day -> target (100) - current (90) = 10 kg -> 1000 days
    eta = _eta_for_exercise(90.0, 100.0, "improving", 2, 0.01, 89.8, 0, 0.9, ist_today(), 20)
    assert eta is None

def test_eta_phase1_success():
    # phase 1, effective_gain = 0.02 (2% per week)
    # latest_1rm = 90.0, target = 100.0
    # weeks = log(100/90) / log(1.02) = approx 5.32 weeks -> 37 days
    eta = _eta_for_exercise(90.0, 100.0, "improving", 1, 0, 0, 0.02, None, ist_today(), 0)
    assert eta is not None
    assert eta["target_kg"] == 100.0
    assert 36 <= eta["days_away"] <= 38
