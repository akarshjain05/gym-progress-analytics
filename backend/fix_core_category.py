import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Exercise

def main():
    db = SessionLocal()
    
    # 1. Merge muscle_group = 'core' into 'abs'
    updated_muscle = db.query(Exercise).filter(Exercise.muscle_group == 'core').update({"muscle_group": "abs"})
    
    # 2. Fix category = 'core' to 'bodyweight'
    # For custom exercises that mistakenly used 'core' as a category
    updated_cat_core = db.query(Exercise).filter(Exercise.category == 'core').update({"category": "bodyweight"})
    
    # Commit changes
    db.commit()
    
    print(f"Updated {updated_muscle} exercises with muscle_group='core' to 'abs'.")
    print(f"Updated {updated_cat_core} exercises with category='core' to 'bodyweight'.")
    print("Database cleanup complete.")

if __name__ == "__main__":
    main()
