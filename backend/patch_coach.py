import sys

def patch():
    with open('backend/app/routers/coach.py', 'r') as f:
        content = f.read()

    # Define the eta calculation helper
    eta_helper = """
def _eta_for_exercise(latest_1rm: float, target_1rm: float, trend: str, phase: int, slope: float, intercept: float, effective_gain: float, r_squared: float, base_date: date_type, today_offset: int) -> dict | None:
    if target_1rm <= latest_1rm:
        return None # "Goal already hit!" - handled by frontend or suppressed
    
    if trend in ("declining", "plateau") or (phase == 2 and slope <= 0):
        return None

    if phase == 2 and r_squared is not None and r_squared < 0.3:
        return None
        
    days_away = 0
    if phase == 2:
        # pred = slope * future + intercept => future = (pred - intercept) / slope
        future_offset = (target_1rm - intercept) / slope
        days_away = int(future_offset - today_offset)
    else:
        # Phase 1: target_1rm = latest_1rm * ((1 + effective_gain) ** weeks)
        # weeks = log(target_1rm / latest_1rm) / log(1 + effective_gain)
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
    # Fetch user lift goals
    goals = db.query(models.Goal).filter(models.Goal.user_id == user_id, models.Goal.goal_type == "lift", models.Goal.is_completed == False).all()
    goals_by_ex = {g.exercise_id: g for g in goals}
"""
    content = content.replace("def _predict_strength_hybrid(lift_logs: list, db: Session) -> list[dict]:\n    \"\"\"\n    Per exercise: decide Phase 1 or Phase 2 based on sessions count.\n    Phase 1 (< 3 sessions): population baseline prediction.\n    Phase 2 (>= 3 sessions): personal linear regression.\n    \"\"\"\n    today = ist_today()", eta_helper)

    
    # Now for phase 1 block
    phase1_replace = """
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
                "eta": None
            })
"""
    content = content.replace("                \"latest_date\": dates[-1].isoformat(),\n            })", phase1_replace.strip())

    # Now for phase 2 block
    phase2_replace = """
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
                "eta": None
            })
"""
    content = content.replace("                \"latest_date\": dates[-1].isoformat(),\n            })\n\n    return sorted", phase2_replace.strip() + "\n\n    return sorted")
    
    # We will do a second pass to add the ETA calculation right before appending to results
    with open('backend/app/routers/coach.py', 'w') as f:
        f.write(content)

patch()
