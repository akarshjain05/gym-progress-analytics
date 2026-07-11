from backend.app.database import SessionLocal
from backend.app.models import User
from backend.app.demo_templates import create_demo_templates

def main():
    print("Connecting to DB...")
    db = SessionLocal()
    
    users = db.query(User).all()
    print(f"Found {len(users)} users. Adding demo templates...")
    
    for user in users:
        print(f"Adding to {user.email}...")
        create_demo_templates(db, user.id)
        
    print("Done!")

if __name__ == "__main__":
    main()
