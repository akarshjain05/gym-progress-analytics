import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User

def promote_admin(username: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"Error: User '{username}' not found.")
            sys.exit(1)
        
        user.role = "admin"
        db.commit()
        print(f"Success: User '{username}' promoted to admin.")
    except Exception as e:
        print(f"Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python make_admin.py <username>")
        sys.exit(1)
    promote_admin(sys.argv[1])
