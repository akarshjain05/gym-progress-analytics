"""
Fix orphaned LiftLog entries that have session_id = NULL.

For each workout_session, we find lift_logs created by the same user
on the same date and link them to the session via session_id.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app import models

def fix_orphan_logs():
    db = SessionLocal()
    try:
        # Get all workout sessions
        sessions = db.query(models.WorkoutSession).order_by(models.WorkoutSession.id).all()
        print(f"Found {len(sessions)} workout sessions")

        fixed_count = 0
        for s in sessions:
            # Check if this session already has linked logs
            linked = db.query(models.LiftLog).filter(
                models.LiftLog.session_id == s.id
            ).count()
            
            if linked > 0:
                print(f"  Session {s.id} ({s.template_name}) already has {linked} linked logs - skipping")
                continue

            # Find orphan logs: same user, same date, no session_id
            orphans = db.query(models.LiftLog).filter(
                models.LiftLog.user_id == s.user_id,
                models.LiftLog.date == s.date,
                models.LiftLog.session_id.is_(None),
            ).all()

            if orphans:
                print(f"  Session {s.id} ({s.template_name}, {s.date}): linking {len(orphans)} orphan logs")
                for log in orphans:
                    log.session_id = s.id
                    fixed_count += 1
            else:
                print(f"  Session {s.id} ({s.template_name}, {s.date}): no orphan logs found")

        if fixed_count > 0:
            db.commit()
            print(f"\nFixed {fixed_count} orphan lift_log entries!")
        else:
            print("\nNo orphan logs to fix.")

    finally:
        db.close()

if __name__ == "__main__":
    fix_orphan_logs()
