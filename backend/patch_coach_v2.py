import re

with open('backend/app/routers/coach.py', 'r') as f:
    text = f.read()

eta_helper = """
def _eta_for_exercise(latest_1rm: float, target_1rm: float, trend: str, phase: int, slope: float, intercept: float, effective_gain: float, r_squared: float, base_date, today_offset: int):
    if target_1rm <= latest_1rm:
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
"""

text = text.replace("def _predict_strength_hybrid(lift_logs: list, db: Session) -> list[dict]:\n    \"\"\"\n    Per exercise: decide Phase 1 or Phase 2 based on sessions count.\n    Phase 1 (< 3 sessions): population baseline prediction.\n    Phase 2 (>= 3 sessions): personal linear regression.\n    \"\"\"\n    today = ist_today()", eta_helper.strip())

phase1_search = """            results.append({
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
            })"""

phase1_replace = """            eta = None
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
            })"""

text = text.replace(phase1_search, phase1_replace)

phase2_search = """            results.append({
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
            })"""

phase2_replace = """            eta = None
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
            })"""

text = text.replace(phase2_search, phase2_replace)

with open('backend/app/routers/coach.py', 'w') as f:
    f.write(text)
