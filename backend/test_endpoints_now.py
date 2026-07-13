import sys
sys.path.append('/app')
from app.database import SessionLocal
from app.models import User
from app.security import create_access_token

db = SessionLocal()
user = db.query(User).filter(User.username == 'testuser1783880874').first()
token = create_access_token(data={"sub": user.username})
print(f"TOKEN={token}")
