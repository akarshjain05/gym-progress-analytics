"""
export.py — User Data Export Router

Endpoints:
  GET /export/json   — full data dump as JSON
  GET /export/csv    — multi-section CSV file

GDPR compliance: users can download everything we store about them.
"""

import csv
import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session

from .database import get_db
from .security import get_current_user
from . import models

router = APIRouter(prefix="/export", tags=["export"])


def _get_all_user_data(db: Session, user: models.User) -> dict:
    """Fetch all data for a user and return as a structured dict."""

    # Profile
    profile = {
        "username": user.username,
        "email": user.email,
        "gender": user.gender,
        "age": user.age,
        "height_cm": user.height_cm,
        "activity_level": user.activity_level,
        "goal_weight_kg": user.goal_weight_kg,
        "unit_preference": user.unit_preference,
    }

    # Body weight logs
    weight_logs = db.query(models.BodyWeightLog).filter(
        models.BodyWeightLog.user_id == user.id
    ).order_by(models.BodyWeightLog.date.asc()).all()

    weights = [
        {
            "date": str(w.date),
            "weight_kg": w.weight_kg,
            "body_fat_pct": w.body_fat_pct,
            "notes": w.notes,
        }
        for w in weight_logs
    ]

    # Lift logs
    lift_logs = db.query(models.LiftLog).filter(
        models.LiftLog.user_id == user.id
    ).order_by(models.LiftLog.date.asc(), models.LiftLog.exercise_id.asc()).all()

    # Get exercise names
    exercise_ids = list({l.exercise_id for l in lift_logs})
    exercises_map = {}
    if exercise_ids:
        exs = db.query(models.Exercise).filter(models.Exercise.id.in_(exercise_ids)).all()
        exercises_map = {e.id: e for e in exs}

    lifts = [
        {
            "date": str(l.date),
            "exercise": exercises_map.get(l.exercise_id, models.Exercise()).name or f"Exercise {l.exercise_id}",
            "muscle_group": (exercises_map.get(l.exercise_id) or models.Exercise()).muscle_group,
            "set_number": l.set_number,
            "weight_kg": l.weight_kg,
            "reps": l.reps,
            "rpe": l.rpe,
            "notes": l.notes,
        }
        for l in lift_logs
    ]

    # Nutrition logs
    nutrition_logs = db.query(models.CalorieLog).filter(
        models.CalorieLog.user_id == user.id
    ).order_by(models.CalorieLog.date.asc()).all()

    nutrition = [
        {
            "date": str(n.date),
            "calories": n.calories,
            "protein_g": n.protein_g,
            "carbs_g": n.carbs_g,
            "fats_g": n.fats_g,
            "notes": n.notes,
        }
        for n in nutrition_logs
    ]

    # Workout sessions (history)
    workout_sessions = []
    try:
        from . import models as m
        if hasattr(m, 'WorkoutSession'):
            sessions = db.query(m.WorkoutSession).filter(
                m.WorkoutSession.user_id == user.id
            ).order_by(m.WorkoutSession.date.desc()).all()
            workout_sessions = [
                {
                    "date": str(s.date),
                    "template_name": s.template_name,
                    "duration_seconds": s.duration_seconds,
                    "exercises_count": s.exercises_count,
                    "sets_count": s.sets_count,
                    "notes": s.notes,
                }
                for s in sessions
            ]
    except Exception:
        pass

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "profile": profile,
        "body_weight_logs": weights,
        "lift_logs": lifts,
        "nutrition_logs": nutrition,
        "workout_sessions": workout_sessions,
    }


@router.get("/json")
def export_json(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Download all user data as a JSON file."""
    data = _get_all_user_data(db, current_user)
    filename = f"ironlog_export_{current_user.username}_{data['exported_at'][:10]}.json"
    json_bytes = json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")

    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/csv")
def export_csv(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Download all user data as a multi-section CSV file."""
    data = _get_all_user_data(db, current_user)
    output = io.StringIO()
    writer = csv.writer(output)

    def write_section(title: str, rows: list[dict]):
        if not rows:
            writer.writerow([f"# {title} — no data"])
            writer.writerow([])
            return
        writer.writerow([f"# {title}"])
        writer.writerow(list(rows[0].keys()))
        for row in rows:
            writer.writerow(list(row.values()))
        writer.writerow([])

    # Header
    writer.writerow(["# IRONLOG Data Export"])
    writer.writerow([f"# User: {current_user.username}"])
    writer.writerow([f"# Exported: {data['exported_at']}"])
    writer.writerow([])

    # Profile section
    writer.writerow(["# PROFILE"])
    for k, v in data["profile"].items():
        writer.writerow([k, v])
    writer.writerow([])

    # Data sections
    write_section("BODY WEIGHT LOGS", data["body_weight_logs"])
    write_section("LIFT LOGS", data["lift_logs"])
    write_section("NUTRITION LOGS", data["nutrition_logs"])
    write_section("WORKOUT SESSIONS", data["workout_sessions"])

    csv_bytes = output.getvalue().encode("utf-8-sig")  # BOM for Excel compatibility
    filename = f"ironlog_export_{current_user.username}_{data['exported_at'][:10]}.csv"

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
