import re

with open('backend/app/calculations.py', 'r') as f:
    content = f.read()

helper = """
def is_bodyweight_exercise(exercise_name: str) -> bool:
    \"\"\"Return True if the exercise relies on bodyweight reps/time standards.\"\"\"
    return exercise_name.strip().lower() in BODYWEIGHT_EXERCISE_MAP
"""
content = content.replace("BODYWEIGHT_EXERCISE_MAP = {", helper + "\nBODYWEIGHT_EXERCISE_MAP = {")

with open('backend/app/calculations.py', 'w') as f:
    f.write(content)
