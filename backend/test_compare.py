import sys
from datetime import date, timedelta
from app.routers.analytics import _period_stats
from app.database import SessionLocal
from app import models

db = SessionLocal()
user = db.query(models.User).filter_by(email='test@example.com').first()
if not user:
    print("No user")
    sys.exit(0)

today = date.today()
current = _period_stats(user.id, today - timedelta(days=90), today, db)
past = _period_stats(user.id, today - timedelta(days=180), today - timedelta(days=90), db)

print("Current:", current)
print("Past:", past)
