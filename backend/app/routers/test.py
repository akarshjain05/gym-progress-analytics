from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class Out(BaseModel):
    name: int

@router.get("/test-500", response_model=Out)
def test_500():
    return {"name": "not an int"}
