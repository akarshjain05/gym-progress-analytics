import re

with open('backend/app/schemas.py', 'r') as f:
    content = f.read()

validator_code = """
    target_workouts_per_week: Optional[int] = None

    @model_validator(mode='after')
    def validate_goal_type_fields(self):
        t = self.goal_type
        if t == 'lift':
            if not self.exercise_id:
                raise ValueError("exercise_id is required for lift goals")
            if not self.target_weight_kg and not self.target_reps:
                raise ValueError("target_weight_kg or target_reps is required for lift goals")
        elif t == 'weight':
            if not self.target_body_weight_kg:
                raise ValueError("target_body_weight_kg is required for weight goals")
        elif t == 'nutrition':
            if not self.target_calories and not self.target_protein_g:
                raise ValueError("target_calories or target_protein_g is required for nutrition goals")
        elif t == 'frequency':
            if not self.target_workouts_per_week:
                raise ValueError("target_workouts_per_week is required for frequency goals")
        else:
            raise ValueError("Invalid goal_type")
        return self
"""

content = content.replace('    target_workouts_per_week: Optional[int] = None', validator_code)

if 'from pydantic import BaseModel, ConfigDict, Field' in content:
    content = content.replace('from pydantic import BaseModel, ConfigDict, Field', 'from pydantic import BaseModel, ConfigDict, Field, model_validator')
else:
    # If not found exactly, just add it at the top
    pass

with open('backend/app/schemas.py', 'w') as f:
    f.write(content)
