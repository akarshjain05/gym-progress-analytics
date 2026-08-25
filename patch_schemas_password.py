import re

with open('backend/app/schemas.py', 'r') as f:
    content = f.read()

validator = """    @field_validator('password')
    def password_complexity(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isalpha() for char in v):
            raise ValueError('Password must contain at least one letter')
        return v
"""

if 'def password_complexity' not in content:
    content = content.replace(
        'class UserCreate(BaseModel):\n    username: str = Field(min_length=3, max_length=30)\n    email: EmailStr\n    password: str = Field(min_length=6)',
        'class UserCreate(BaseModel):\n    username: str = Field(min_length=3, max_length=30)\n    email: EmailStr\n    password: str = Field(min_length=8)\n\n' + validator
    )
    if 'from pydantic import BaseModel, Field, EmailStr' in content and 'field_validator' not in content:
        content = content.replace('from pydantic import BaseModel, Field, EmailStr', 'from pydantic import BaseModel, Field, EmailStr, field_validator')

with open('backend/app/schemas.py', 'w') as f:
    f.write(content)
