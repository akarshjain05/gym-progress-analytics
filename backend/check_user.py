import sys
sys.path.append('/app')
from app.database import SessionLocal
from app.models import User
from app.security import create_access_token

db = SessionLocal()
user = db.query(User).filter(User.username == 'akarsh').first()
if user:
    print(f"User found: {user.username}, ID: {user.id}")
    token = create_access_token(data={"sub": user.username})
    print(f"TOKEN={token}")
else:
    print("User akarsh not found.")

