import re

with open('backend/app/schemas.py', 'r') as f:
    content = f.read()

# Add Literal import
if 'from typing import ' in content and 'Literal' not in content:
    content = content.replace('from typing import Optional, List', 'from typing import Optional, List, Literal')
if 'Literal' not in content:
    content = content.replace('from typing import Optional', 'from typing import Optional, Literal')

content = content.replace(
    'class MacrosIn(BaseModel):\n    calories: float = Field(gt=0)\n    goal: str  # \'cut\', \'maintain\', \'bulk\'',
    'class MacrosIn(BaseModel):\n    calories: float = Field(gt=0)\n    goal: Literal["cut", "maintain", "bulk"]'
)

with open('backend/app/schemas.py', 'w') as f:
    f.write(content)

with open('backend/tests/test_calculators.py', 'r') as f:
    test_content = f.read()

test_content = test_content.replace('"goal": "maintenance"', '"goal": "maintain"')

with open('backend/tests/test_calculators.py', 'w') as f:
    f.write(test_content)
