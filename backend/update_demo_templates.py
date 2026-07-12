from app.database import SessionLocal
from app.models import User, WorkoutTemplate, TemplateExercise
from app.demo_templates import create_demo_templates

def main():
    print("Connecting to DB...")
    db = SessionLocal()
    
    users = db.query(User).all()
    print(f"Found {len(users)} users. Updating demo templates...")
    
    for user in users:
        print(f"Updating templates for {user.email}...")
        
        # Delete old demo templates
        old_templates = db.query(WorkoutTemplate).filter(
            WorkoutTemplate.user_id == user.id,
            WorkoutTemplate.name.in_(["Push Day", "Pull Day", "Leg Day"])
        ).all()
        
        for t in old_templates:
            db.delete(t)
            
        db.commit()
        
        # Create new ones
        create_demo_templates(db, user.id)
        
    print("Done!")

if __name__ == "__main__":
    main()
