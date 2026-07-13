import asyncio
import httpx
from app.database import SessionLocal
from app.models import User
from app.security import create_access_token

async def main():
    db = SessionLocal()
    user = db.query(User).filter(User.username == 'testlock').first()
    token = create_access_token(data={"sub": user.username})
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        r1 = await client.get("http://localhost:8000/weight/summary", headers=headers)
        print("weight/summary:", r1.status_code, r1.text[:100])
        
        r2 = await client.get("http://localhost:8000/analytics/dashboard", headers=headers)
        print("analytics/dashboard:", r2.status_code, r2.text[:100])

asyncio.run(main())
