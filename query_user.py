import sys
import os
sys.path.append(os.path.abspath('backend/app'))
from database import SessionLocal
from models import User, BodyWeightLog
db = SessionLocal()
user = db.query(User).filter(User.username == 'akarsh').first()
if user:
    logs = db.query(BodyWeightLog).filter(BodyWeightLog.user_id == user.id).all()
    print('User akarsh has', len(logs), 'weight logs.')
    for log in logs:
        print(log.date, log.weight_kg)
else:
    print('User akarsh not found.')
