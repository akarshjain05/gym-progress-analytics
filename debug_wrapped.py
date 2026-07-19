import os
import sys
import logging

# Ensure the backend directory is in the Python path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import User
from app.routers.analytics import wrapped

db = SessionLocal()
user = db.query(User).first()

try:
    print(wrapped(year=2026, month=7, db=db, current_user=user))
except Exception as e:
    logging.exception("Error during wrapped generation")
