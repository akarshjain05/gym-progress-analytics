"""
coach.py — IRONLOG AI Coach Router

HYBRID ML APPROACH:
==================
Phase 1 (< 14 days personal data):
  Uses science-based population baselines from peer-reviewed fitness research.
  Gives reasonable predictions for new users with no history.
  Example: average natural strength gain for novice lifters = ~2-3% per week.

Phase 2 (>= 14 days personal data):
  Switches to user's own linear regression on their actual logs.
  Personal history becomes the primary predictor — just like real fitness apps.

AI ADVICE: Google Gemini API (free tier)
  - 15 requests/minute, 1M tokens/day, completely free
  - Set GEMINI_API_KEY in Render environment variables
  - Without key: rule-based advice still generated automatically
"""

from collections import defaultdict
from datetime import date as date_type, datetime, timedelta, timezone
from typing import Optional
import json
import os
import math

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models, calculations as calc
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/coach", tags=["coach"])

IST = timezone(timedelta(hours=5, minutes=30))


def ist_today() -> date_type:
    return datetime.now(IST).date()


# ---------------------------------------------------------------------------
# Population Baselines (Phase 1 — science-based defaults)
# Sources: NSCA, ACSM, Lyle McDonald's research, Starting Strength data
# ---------------------------------------------------------------------------

# Average weekly 1RM gain % for untrained/novice lifters by exercise type
BASELINE_WEEKLY_GAIN_PCT = {
    "compound": 2.5,   # novice compound: ~2-3% per week (NSCA)
    "isolation": 1.5,  # isolation movements gain slower
    "default": 2.0,
}

# Average body weight change rate for different goals (kg/week)
BASELINE_WEIGHT_RATE = {
    "bulk": 0.25,    # clean bulk: 0.2-0.3 kg/week
    "cut": -0.5,     # cut: 0.5-1% bodyweight/week
    "maintain": 0.0,
}

# Newbie gains decay: strength gains slow down over time
# Week 1-8: full rate, Week 9-16: 70%, Week 17-24: 50%, 24+: 30%
def _decay_factor(weeks_training: int) -> float:
    if weeks_training <= 8:
        return 1.0
    elif weeks_training <= 16:
        return 0.7
    elif weeks_training <= 24:
        return 0.5
    return 0.3


# ---------------------------------------------------------------------------
# Math helpers
# ---------------------------------------------------------------------------

def _linear_regression(x: list[float], y: list[float]) -> Optional[tuple[float, float]]:
    """Returns (slope, intercept) or None."""
    n = len(x)
    if n < 2:
        return None
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    denom = sum((xi - mean_x) ** 2 for xi in x)
    if denom == 0:
        return None
    slope = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y)) / denom
    intercept = mean_y - slope * mean_x
    return slope, intercept


def _r_squared(x: list[float], y: list[float], slope: float, intercept: float) -> float:
    mean_y = sum(y) / len(y)
    ss_tot = sum((yi - mean_y) ** 2 for yi in y)
    ss_res = sum((yi - (slope * xi + intercept)) ** 2 for xi, yi in zip(x, y))
    if ss_tot == 0:
        return 1.0
    return max(0.0, round(1.0 - ss_res / ss_tot, 2))


def _days_of_data(logs: list) -> int:
    if not logs:
        return 0
    dates = {l.date for l in logs}
    if not dates:
        return 0
    return (max(dates) - min(dates)).days + 1


# ---------------------------------------------------------------------------
# HYBRID Strength Predictions
# ---------------------------------------------------------------------------

def _eta_for_exercise(latest_1rm: float, target_1rm: float, trend: str, phase: int, slope: float, intercept: float, effective_gain: float, r_squared: float, base_date, today_offset: int):
    if latest_1rm <= 0 or target_1rm <= latest_1rm:
        return None
    
    if trend in ("declining", "plateau") or (phase == 2 and slope <= 0):
        return None

    if phase == 2 and r_squared is not None and r_squared < 0.3:
        return None
        
    days_away = 0
    if phase == 2:
        future_offset = (target_1rm - intercept) / slope
        days_away = int(future_offset - today_offset)
    else:
        if effective_gain <= 0:
            return None
        weeks = math.log(target_1rm / latest_1rm) / math.log(1 + effective_gain)
        days_away = int(weeks * 7)

    if days_away > 365 or days_away < 0:
        return None

    target_date = ist_today() + timedelta(days=days_away)
    return {
        "target_kg": target_1rm,
        "date": target_date.isoformat(),
        "days_away": days_away
    }

def _predict_strength_hybrid(lift_logs: list, db: Session) -> list[dict]:
    today = ist_today()
    if not lift_logs:
        return []
    user_id = lift_logs[0].user_id
    goals = db.query(models.Goal).filter(models.Goal.user_id == user_id, models.Goal.goal_type == "lift", models.Goal.is_completed == False).all()
    goals_by_ex = {g.exercise_id: g for g in goals}
    by_exercise: dict[int, list] = defaultdict(list)
    for log in lift_logs:
        by_exercise[log.exercise_id].append(log)

    results = []
    for eid, logs in by_exercise.items():
        ex = db.get(models.Exercise, eid)
        if not ex:
            continue

        sessions: dict = defaultdict(list)
        for log in logs:
            sessions[log.date].append((log.weight_kg, log.reps))
        dates = sorted(sessions.keys())
        session_count = len(dates)

        latest_1rm = calc.best_estimated_1rm(sessions[dates[-1]])
        first_date = dates[0]
        weeks_training = max(1, (today - first_date).days // 7)

        if session_count < 3:
            # ── PHASE 1: Population baseline ──────────────────────────────
            ex_type = ex.category or "default"
            weekly_gain_pct = BASELINE_WEEKLY_GAIN_PCT.get(ex_type, BASELINE_WEEKLY_GAIN_PCT["default"])
            decay = _decay_factor(weeks_training)
            effective_gain = (weekly_gain_pct / 100) * decay

            preds = {}
            for weeks, label in [(4, "4_weeks"), (8, "8_weeks"), (12, "12_weeks")]:
                # Compound interest model for strength gain
                predicted = latest_1rm * ((1 + effective_gain) ** weeks)
                preds[label] = round(predicted, 1)

            eta = None
            target_1rm = None
            source = "goal"
            if eid in goals_by_ex and goals_by_ex[eid].target_weight_kg:
                target_1rm = goals_by_ex[eid].target_weight_kg
            else:
                target_1rm = math.ceil(latest_1rm / 10.0) * 10
                if target_1rm <= latest_1rm:
                    target_1rm += 10
                source = "next_milestone"

            if target_1rm:
                eta = _eta_for_exercise(latest_1rm, target_1rm, "improving", 1, 0, 0, effective_gain, None, dates[0], 0)
                if eta:
                    eta["source"] = source

            results.append({
                "exercise_id": eid,
                "exercise_name": ex.name,
                "muscle_group": ex.muscle_group,
                "category": ex.category,
                "current_1rm_kg": round(latest_1rm, 1),
                "weekly_gain_kg": round(latest_1rm * effective_gain, 2),
                "trend": "improving",
                "r_squared": None,
                "predictions_kg": preds,
                "sessions_count": session_count,
                "phase": 1,
                "phase_label": "Population baseline (log more sessions for personal predictions)",
                "first_date": dates[0].isoformat(),
                "latest_date": dates[-1].isoformat(),
                "eta": eta
            })

        else:
            # ── PHASE 2: Personal linear regression ───────────────────────
            base = dates[0]
            x = [(d - base).days for d in dates]
            y = [calc.best_estimated_1rm(sessions[d]) for d in dates]

            reg = _linear_regression(x, y)
            if reg is None:
                continue
            slope, intercept = reg
            r2 = _r_squared(x, y, slope, intercept)

            today_offset = (today - base).days
            preds = {}
            for weeks, label in [(4, "4_weeks"), (8, "8_weeks"), (12, "12_weeks")]:
                future = today_offset + weeks * 7
                pred = slope * future + intercept
                preds[label] = round(max(pred, latest_1rm * 0.5), 1)

            weekly_gain = round(slope * 7, 2)
            trend = "improving" if slope > 0.05 else ("declining" if slope < -0.05 else "plateau")

            eta = None
            target_1rm = None
            source = "goal"
            if eid in goals_by_ex and goals_by_ex[eid].target_weight_kg:
                target_1rm = goals_by_ex[eid].target_weight_kg
            else:
                target_1rm = math.ceil(latest_1rm / 10.0) * 10
                if target_1rm <= latest_1rm:
                    target_1rm += 10
                source = "next_milestone"

            if target_1rm:
                eta = _eta_for_exercise(latest_1rm, target_1rm, trend, 2, slope, intercept, 0, r2, base, today_offset)
                if eta:
                    eta["source"] = source

            results.append({
                "exercise_id": eid,
                "exercise_name": ex.name,
                "muscle_group": ex.muscle_group,
                "category": ex.category,
                "current_1rm_kg": round(latest_1rm, 1),
                "weekly_gain_kg": weekly_gain,
                "trend": trend,
                "r_squared": r2,
                "predictions_kg": preds,
                "sessions_count": session_count,
                "phase": 2,
                "phase_label": "Personal regression (based on your own history)",
                "first_date": dates[0].isoformat(),
                "latest_date": dates[-1].isoformat(),
                "eta": eta
            })

    return sorted(results, key=lambda r: r["sessions_count"], reverse=True)


# ---------------------------------------------------------------------------
# HYBRID Weight Predictions
# ---------------------------------------------------------------------------

def _predict_weight_hybrid(weight_logs: list, profile_goal: Optional[float], current_weight: Optional[float]) -> dict:
    """
    Phase 1 (< 5 logs): baseline rate from goal direction.
    Phase 2 (>= 5 logs): personal regression.
    """
    today = ist_today()

    if len(weight_logs) < 5:
        # ── PHASE 1: Baseline ──────────────────────────────────────────────
        cw = current_weight or (weight_logs[-1].weight_kg if weight_logs else 70.0)

        # Infer goal direction
        if profile_goal and cw:
            if profile_goal > cw + 1:
                rate = BASELINE_WEIGHT_RATE["bulk"]
                goal_type = "gaining"
            elif profile_goal < cw - 1:
                rate = BASELINE_WEIGHT_RATE["cut"]
                goal_type = "losing"
            else:
                rate = BASELINE_WEIGHT_RATE["maintain"]
                goal_type = "maintaining"
        else:
            rate = 0.0
            goal_type = "stable"

        preds = {}
        for days, label in [(30, "30_days"), (60, "60_days"), (90, "90_days")]:
            preds[label] = round(cw + rate * (days / 7), 1)

        return {
            "current_weight_kg": round(cw, 1),
            "weekly_rate_kg": rate,
            "trend": goal_type,
            "r_squared": None,
            "predictions_kg": preds,
            "data_points": len(weight_logs),
            "phase": 1,
            "phase_label": "Baseline estimate (log more weigh-ins for personal predictions)",
        }

    else:
        # ── PHASE 2: Personal regression ──────────────────────────────────
        base = weight_logs[0].date
        x = [(w.date - base).days for w in weight_logs]
        y = [w.weight_kg for w in weight_logs]

        reg = _linear_regression(x, y)
        if reg is None:
            cw = y[-1]
            return {
                "current_weight_kg": round(cw, 1),
                "weekly_rate_kg": 0.0,
                "trend": "stable",
                "r_squared": None,
                "predictions_kg": {"30_days": round(cw, 1), "60_days": round(cw, 1), "90_days": round(cw, 1)},
                "data_points": len(weight_logs),
                "phase": 2,
                "phase_label": "Personal regression",
            }

        slope, intercept = reg
        r2 = _r_squared(x, y, slope, intercept)
        today_offset = (today - base).days
        weekly_rate = round(slope * 7, 3)

        preds = {}
        for days, label in [(30, "30_days"), (60, "60_days"), (90, "90_days")]:
            future = today_offset + days
            preds[label] = round(slope * future + intercept, 1)

        return {
            "current_weight_kg": round(y[-1], 1),
            "weekly_rate_kg": weekly_rate,
            "trend": "gaining" if weekly_rate > 0.05 else ("losing" if weekly_rate < -0.05 else "stable"),
            "r_squared": r2,
            "predictions_kg": preds,
            "data_points": len(weight_logs),
            "phase": 2,
            "phase_label": "Personal regression (based on your actual data)",
        }


# ---------------------------------------------------------------------------
# Muscle Group Volume
# ---------------------------------------------------------------------------

def _muscle_group_volume(lift_logs: list, db: Session) -> dict:
    today = ist_today()
    cutoff_recent = today - timedelta(days=28)
    cutoff_prev = today - timedelta(days=56)
    exercise_cache: dict[int, models.Exercise] = {}
    recent_vol: dict[str, float] = defaultdict(float)
    prev_vol: dict[str, float] = defaultdict(float)

    for log in lift_logs:
        if log.exercise_id not in exercise_cache:
            exercise_cache[log.exercise_id] = db.get(models.Exercise, log.exercise_id)
        ex = exercise_cache[log.exercise_id]
        if not ex or not ex.muscle_group:
            continue
        vol = log.weight_kg * log.reps
        if log.date >= cutoff_recent:
            recent_vol[ex.muscle_group] += vol
        elif log.date >= cutoff_prev:
            prev_vol[ex.muscle_group] += vol

    result = {}
    for group in set(list(recent_vol.keys()) + list(prev_vol.keys())):
        r = recent_vol.get(group, 0)
        p = prev_vol.get(group, 0)
        change_pct = round(((r - p) / p * 100) if p > 0 else 0, 1)
        result[group] = {
            "recent_4w_volume": round(r, 0),
            "prev_4w_volume": round(p, 0),
            "change_pct": change_pct,
            "trend": "increasing" if change_pct > 5 else ("decreasing" if change_pct < -5 else "stable"),
        }
    return result


# ---------------------------------------------------------------------------
# Consistency Score
# ---------------------------------------------------------------------------

def _consistency_score(lift_logs: list, weight_logs: list, calorie_logs: list) -> dict:
    today = ist_today()
    last_28 = today - timedelta(days=28)
    lift_days = {l.date for l in lift_logs if l.date >= last_28}
    weight_days = {w.date for w in weight_logs if w.date >= last_28}
    cal_days = {c.date for c in calorie_logs if c.date >= last_28}

    sessions_per_week = len(lift_days) / 4
    freq_score = min(100, (sessions_per_week / 4) * 100) if sessions_per_week <= 4 else 100
    weight_score = min(100, len(weight_days) / 28 * 100)
    cal_score = min(100, len(cal_days) / 28 * 100)

    # Penalize 5+ consecutive training days
    consecutive_penalty = 0
    if lift_days:
        sorted_days = sorted(lift_days)
        run = 1
        for i in range(1, len(sorted_days)):
            if (sorted_days[i] - sorted_days[i-1]).days == 1:
                run += 1
                if run >= 5:
                    consecutive_penalty = 15
                    break
            else:
                run = 1

    overall = max(0, min(100, round(freq_score * 0.5 + weight_score * 0.25 + cal_score * 0.25 - consecutive_penalty, 1)))

    return {
        "overall_score": overall,
        "workout_frequency_per_week": round(sessions_per_week, 1),
        "weight_logging_pct": round(weight_score, 1),
        "calorie_logging_pct": round(cal_score, 1),
        "overtraining_flag": consecutive_penalty > 0,
        "lift_days_last_28": len(lift_days),
    }


# ---------------------------------------------------------------------------
# Nutrition-Performance Correlation
# ---------------------------------------------------------------------------

def _nutrition_correlation(lift_logs: list, calorie_logs: list) -> Optional[dict]:
    if len(calorie_logs) < 7 or len(lift_logs) < 3:
        return None

    cal_by_week: dict[int, list[float]] = defaultdict(list)
    base_date = min(c.date for c in calorie_logs)
    for c in calorie_logs:
        week = (c.date - base_date).days // 7
        cal_by_week[week].append(c.calories)

    rm_by_week: dict[int, list[float]] = defaultdict(list)
    for log in lift_logs:
        week = (log.date - base_date).days // 7
        rm_by_week[week].append(calc.estimate_1rm_epley(log.weight_kg, log.reps))

    common_weeks = sorted(set(cal_by_week.keys()) & set(rm_by_week.keys()))
    if len(common_weeks) < 3:
        return None

    x = [sum(cal_by_week[w]) / len(cal_by_week[w]) for w in common_weeks]
    y = [max(rm_by_week[w]) for w in common_weeks]
    avg_cal = round(sum(x) / len(x), 0)

    reg = _linear_regression(x, y)
    r2 = _r_squared(x, y, reg[0], reg[1]) if reg else 0

    return {
        "avg_weekly_calories": avg_cal,
        "correlation_r2": round(r2, 2),
        "weeks_analysed": len(common_weeks),
        "insight": (
            "Higher calorie weeks correlate with better strength performance"
            if reg and reg[0] > 0 and r2 > 0.2
            else "No strong calorie-performance correlation yet — keep logging for better analysis"
        ),
    }


# ---------------------------------------------------------------------------
# Rule-based advice (fallback when no Gemini key)
# ---------------------------------------------------------------------------

def _rule_based_advice(analysis: dict) -> str:
    lines = []
    c = analysis.get("consistency", {})
    wp = analysis.get("weight_prediction", {})
    strength = analysis.get("strength_predictions", [])
    vol = analysis.get("muscle_group_volume", {})
    nc = analysis.get("nutrition_correlation")

    score = c.get("overall_score", 0)
    freq = c.get("workout_frequency_per_week", 0)

    lines.append("**Overall Assessment**")
    if score >= 75:
        lines.append(f"Your consistency score is {score}/100 — excellent work! You're building strong habits.")
    elif score >= 50:
        lines.append(f"Your consistency score is {score}/100 — decent, but there's room to improve.")
    else:
        lines.append(f"Your consistency score is {score}/100 — focus on showing up more regularly.")

    if c.get("overtraining_flag"):
        lines.append("⚠️ Warning: You've trained 5+ days in a row recently. Make sure you're taking rest days.")

    if freq < 2:
        lines.append(f"You're averaging {freq} sessions/week. Aim for at least 3 sessions/week for consistent progress.")
    elif freq >= 3:
        lines.append(f"Great frequency at {freq} sessions/week. Keep it up!")

    if strength:
        lines.append("\n**Strength Progress**")
        improving = [s for s in strength if s["trend"] == "improving"]
        plateauing = [s for s in strength if s["trend"] == "plateau"]
        declining = [s for s in strength if s["trend"] == "declining"]

        if improving:
            top = improving[0]
            lines.append(f"📈 {top['exercise_name']} is your strongest lift — currently {top['current_1rm_kg']}kg est. 1RM, predicted to reach {top['predictions_kg']['4_weeks']}kg in 4 weeks.")
        if plateauing:
            names = ', '.join(s['exercise_name'] for s in plateauing[:2])
            lines.append(f"➡️ {names} appear to be plateauing. Consider changing rep ranges, adding volume, or deloading.")
        if declining:
            names = ', '.join(s['exercise_name'] for s in declining[:2])
            lines.append(f"📉 {names} are declining. Check if you're recovering properly and eating enough.")

    if wp:
        lines.append("\n**Body Composition**")
        trend = wp.get("trend", "stable")
        cw = wp.get("current_weight_kg", 0)
        rate = abs(wp.get("weekly_rate_kg", 0))
        p30 = wp.get("predictions_kg", {}).get("30_days", cw)
        lines.append(f"Current weight: {cw}kg. You're {trend} at {rate}kg/week. In 30 days: ~{p30}kg.")

    if vol:
        lines.append("\n**Muscle Balance**")
        neglected = [g for g, d in vol.items() if d["trend"] == "decreasing"]
        dominant = [g for g, d in vol.items() if d["trend"] == "increasing"]
        if dominant:
            lines.append(f"✓ Strong volume in: {', '.join(dominant[:2])}")
        if neglected:
            lines.append(f"⚠️ Decreasing volume in: {', '.join(neglected[:2])}. Consider adding more work here.")

    if nc:
        lines.append("\n**Nutrition**")
        lines.append(f"Averaging {int(nc['avg_weekly_calories'])} kcal/day. {nc['insight']}")

    lines.append("\n**Next 4 Weeks — Focus On:**")
    lines.append("1. Log your weight every day for accurate trend analysis.")
    lines.append("2. Aim for progressive overload: add 2.5kg when you can complete all reps cleanly.")
    lines.append("3. Log your calories consistently to understand your energy balance.")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main analysis endpoint
# ---------------------------------------------------------------------------

@router.get("/analysis")
def get_analysis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lift_logs = (
        db.query(models.LiftLog)
        .filter(models.LiftLog.user_id == current_user.id)
        .order_by(models.LiftLog.date.asc())
        .all()
    )
    weight_logs = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id)
        .order_by(models.BodyWeightLog.date.asc())
        .all()
    )
    calorie_logs = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.user_id == current_user.id)
        .order_by(models.CalorieLog.date.asc())
        .all()
    )

    current_weight = weight_logs[-1].weight_kg if weight_logs else None
    strength = _predict_strength_hybrid(lift_logs, db)
    weight_pred = _predict_weight_hybrid(weight_logs, current_user.goal_weight_kg, current_weight)
    muscle_vol = _muscle_group_volume(lift_logs, db)
    consistency = _consistency_score(lift_logs, weight_logs, calorie_logs)
    nutrition_corr = _nutrition_correlation(lift_logs, calorie_logs)

    # Data phase summary
    lift_days = len({l.date for l in lift_logs})
    total_days = _days_of_data(lift_logs)
    using_personal_data = total_days >= 14

    return {
        "has_enough_data": len(lift_logs) >= 1,
        "username": current_user.username,
        "using_personal_data": using_personal_data,
        "data_phase": 2 if using_personal_data else 1,
        "days_of_data": total_days,
        "lift_sessions_total": lift_days,
        "strength_predictions": strength,
        "weight_prediction": weight_pred,
        "muscle_group_volume": muscle_vol,
        "consistency": consistency,
        "nutrition_correlation": nutrition_corr,
        "profile": {
            "goal_weight_kg": current_user.goal_weight_kg,
            "gender": current_user.gender,
            "age": current_user.age,
            "activity_level": current_user.activity_level,
        },
    }


# ---------------------------------------------------------------------------
# Gemini AI advice endpoint
# ---------------------------------------------------------------------------

@router.get("/advice")
async def get_advice(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Calls Google Gemini API with all ML analysis as context.
    Falls back to rule-based advice if no GEMINI_API_KEY configured.
    """
    # Gather data
    lift_logs = (
        db.query(models.LiftLog)
        .filter(models.LiftLog.user_id == current_user.id)
        .order_by(models.LiftLog.date.asc())
        .all()
    )
    weight_logs = (
        db.query(models.BodyWeightLog)
        .filter(models.BodyWeightLog.user_id == current_user.id)
        .order_by(models.BodyWeightLog.date.asc())
        .all()
    )
    calorie_logs = (
        db.query(models.CalorieLog)
        .filter(models.CalorieLog.user_id == current_user.id)
        .order_by(models.CalorieLog.date.asc())
        .all()
    )

    if not lift_logs:
        async def no_data():
            msg = "Start logging your workouts to get personalized AI coaching advice!"
            yield f"data: {json.dumps({'text': msg})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(no_data(), media_type="text/event-stream")

    current_weight = weight_logs[-1].weight_kg if weight_logs else None
    strength = _predict_strength_hybrid(lift_logs, db)
    weight_pred = _predict_weight_hybrid(weight_logs, current_user.goal_weight_kg, current_weight)
    muscle_vol = _muscle_group_volume(lift_logs, db)
    consistency = _consistency_score(lift_logs, weight_logs, calorie_logs)
    nutrition_corr = _nutrition_correlation(lift_logs, calorie_logs)

    analysis = {
        "consistency": consistency,
        "weight_prediction": weight_pred,
        "strength_predictions": strength,
        "muscle_group_volume": muscle_vol,
        "nutrition_correlation": nutrition_corr,
    }

    api_key = os.environ.get("GEMINI_API_KEY", "")

    # Build context string for AI
    ctx = [
        f"User: {current_user.username}",
        f"Training data: {_days_of_data(lift_logs)} days, {len({l.date for l in lift_logs})} sessions",
        f"Prediction mode: {'Personal regression (Phase 2)' if _days_of_data(lift_logs) >= 14 else 'Population baseline (Phase 1 — new user)'}",
        f"Goal weight: {current_user.goal_weight_kg or 'not set'} kg",
        f"Gender: {current_user.gender or 'not set'}, Age: {current_user.age or 'not set'}",
        "",
        f"CONSISTENCY: {consistency['overall_score']}/100 | {consistency['workout_frequency_per_week']} sessions/week | Overtraining: {consistency['overtraining_flag']}",
        "",
    ]

    if weight_pred:
        ctx += [
            f"BODY WEIGHT: {weight_pred['current_weight_kg']}kg | {weight_pred['trend']} at {weight_pred['weekly_rate_kg']}kg/week",
            f"  Predictions: 30d={weight_pred['predictions_kg']['30_days']}kg | 60d={weight_pred['predictions_kg']['60_days']}kg | 90d={weight_pred['predictions_kg']['90_days']}kg",
            f"  Mode: {weight_pred['phase_label']}",
            "",
        ]

    if strength:
        ctx.append("STRENGTH (top exercises):")
        for s in strength[:5]:
            ctx.append(
                f"  {s['exercise_name']}: {s['current_1rm_kg']}kg now → 4w:{s['predictions_kg']['4_weeks']}kg | 8w:{s['predictions_kg']['8_weeks']}kg | trend:{s['trend']} | {s['phase_label']}"
            )
        ctx.append("")

    if muscle_vol:
        ctx.append("MUSCLE VOLUME (4w vs prev 4w):")
        for g, d in muscle_vol.items():
            ctx.append(f"  {g}: {d['recent_4w_volume']}kg ({d['trend']}, {d['change_pct']:+.1f}%)")
        ctx.append("")

    if nutrition_corr:
        ctx.append(f"NUTRITION: avg {nutrition_corr['avg_weekly_calories']} kcal/day | {nutrition_corr['insight']}")

    context_str = "\n".join(ctx)

    prompt = f"""You are an expert personal trainer and sports nutritionist AI coach for IRONLOG, a gym tracking app.

User training analysis:
{context_str}

Write a personalised coaching report covering:
1. **Overall Assessment** — specific numbers, direct feedback
2. **Strength Progress** — which lifts are doing well, which need work, what weight to target next session
3. **Body Composition** — weight trend vs goal, is it on track
4. **Training Consistency** — frequency, recovery, any red flags
5. **Nutrition** — eating enough for their training load
6. **Muscle Balance** — any groups being neglected
7. **Action Plan** — 3 specific things to do in the next 4 weeks

Be direct and specific. Use their actual numbers. Sound like a real coach. Max 350 words."""

    if not api_key:
        # Rule-based fallback — no API key needed
        advice = _rule_based_advice(analysis)
        async def rule_stream():
            for word in advice.split(" "):
                yield f"data: {json.dumps({'text': word + ' '})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(rule_stream(), media_type="text/event-stream")

    # Gemini API call
    async def gemini_stream():
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 800,
            }
        }
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        # Fall back to rule-based
                        advice = _rule_based_advice(analysis)
                        for word in advice.split(" "):
                            yield f"data: {json.dumps({'text': word + ' '})}\n\n"
                        yield "data: [DONE]\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        raw = line[5:].strip()
                        if not raw or raw == "[DONE]":
                            continue
                        try:
                            event = json.loads(raw)
                            candidates = event.get("candidates", [])
                            for candidate in candidates:
                                parts = candidate.get("content", {}).get("parts", [])
                                for part in parts:
                                    text = part.get("text", "")
                                    if text:
                                        yield f"data: {json.dumps({'text': text})}\n\n"
                        except json.JSONDecodeError:
                            continue

        except Exception:
            advice = _rule_based_advice(analysis)
            for word in advice.split(" "):
                yield f"data: {json.dumps({'text': word + ' '})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        gemini_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@router.get("/next-eta")
def get_next_eta(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Returns the single most imminent, highest-confidence ETA across all lifts for the dashboard.
    """
    lift_logs = db.query(models.LiftLog).filter(models.LiftLog.user_id == current_user.id).all()
    if not lift_logs:
        return None
        
    strength_results = _predict_strength_hybrid(lift_logs, db)
    
    valid_etas = []
    for res in strength_results:
        if res.get("eta"):
            valid_etas.append(res["eta"])
            
    if not valid_etas:
        return None
        
    # Sort by nearest ETA first
    valid_etas.sort(key=lambda e: e["days_away"])
    
    # Return the closest ETA
    best_eta = valid_etas[0]
    
    # Need to enrich with exercise name
    # Wait, the ETA returned by _predict_strength_hybrid already has the ETA object.
    # We can inject exercise_name from the result directly!
    # Let's find the result that matched the best ETA
    best_result = next(r for r in strength_results if r.get("eta") is best_eta)
    best_eta["exercise_name"] = best_result["exercise_name"]
    
    return best_eta
