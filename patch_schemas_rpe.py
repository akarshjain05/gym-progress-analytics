import re
with open('backend/app/schemas.py', 'r') as f:
    content = f.read()

content = content.replace('rpe: Optional[float] = Field(default=None, ge=1, le=10)', 'rpe: Optional[float] = Field(default=None, ge=0, le=10)')

with open('backend/app/schemas.py', 'w') as f:
    f.write(content)
