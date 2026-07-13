import sys
sys.path.append('backend/app')
from database import SessionLocal
from models import User, BodyWeightLog
db = SessionLocal()
user = db.query(User).filter(User.username == 'testlock').first()
if user:
    logs = db.query(BodyWeightLog).filter(BodyWeightLog.user_id == user.id).all()
    print("User testlock has", len(logs), "weight logs.")
else:
    print("User testlock not found.")
