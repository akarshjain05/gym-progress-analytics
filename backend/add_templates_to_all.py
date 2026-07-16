import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User
from app.demo_templates import create_demo_templates

def main():
    db = SessionLocal()
    users = db.query(User).all()
    print(f"Found {len(users)} users.")
    for user in users:
        print(f"Adding templates for user {user.id} ({user.email})...")
        create_demo_templates(db, user.id)
    print("Done.")

if __name__ == "__main__":
    main()
