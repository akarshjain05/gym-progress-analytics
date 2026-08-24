import re

with open('backend/app/schemas.py', 'r') as f:
    content = f.read()

content = content.replace(
    'class TemplateUpdate(BaseModel):\n    name: Optional[str] = Field(default=None, min_length=1, max_length=60)\n    description: Optional[str] = None',
    'class TemplateUpdate(BaseModel):\n    name: Optional[str] = Field(default=None, min_length=1, max_length=60)\n    description: Optional[str] = None\n    exercises: Optional[list[TemplateExerciseIn]] = None'
)

with open('backend/app/schemas.py', 'w') as f:
    f.write(content)
