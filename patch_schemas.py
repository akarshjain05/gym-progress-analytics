import re

with open('backend/app/schemas.py', 'r') as f:
    content = f.read()

content = content.replace(
    'unit_preference: Optional[UnitPref] = None',
    'unit_preference: Optional[UnitPref] = None\n    timezone: Optional[str] = None'
)

content = content.replace(
    'unit_preference: str',
    'unit_preference: str\n    timezone: str'
)

with open('backend/app/schemas.py', 'w') as f:
    f.write(content)
