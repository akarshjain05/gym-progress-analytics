from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys

# Connect to the local SQLite DB used for testing/local
try:
    engine = create_engine("sqlite:///gym.db")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
except Exception as e:
    print(f"Error connecting to db: {e}")
    sys.exit(1)

from backend.app.models import Exercise, LiftLog

pec_deck = db.query(Exercise).filter(Exercise.name.ilike('%pec deck%')).first()
if not pec_deck:
    print("Pec Deck not found")
    sys.exit(1)
    
print(f"Pec Deck ID: {pec_deck.id}")

logs = db.query(LiftLog).filter(LiftLog.exercise_id == pec_deck.id).all()
for l in logs:
    print(f"Log: id={l.id}, w={l.weight_kg}, r={l.reps}, rpe={l.rpe}")
