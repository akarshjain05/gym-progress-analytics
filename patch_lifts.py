import re

with open('backend/app/routers/lifts.py', 'r') as f:
    content = f.read()

# Remove BODYWEIGHT_EXERCISE_NAMES
content = re.sub(r'BODYWEIGHT_EXERCISE_NAMES = \{.*?\}\n+', '', content, flags=re.DOTALL)

# Replace _is_bodyweight_exercise(exercise_name) with calc.is_bodyweight_exercise(exercise_name)
content = re.sub(
    r'def _is_bodyweight_exercise\(exercise_name: str\) -> bool:.*?return exercise_name\.strip\(\)\.lower\(\) in BODYWEIGHT_EXERCISE_NAMES',
    '',
    content,
    flags=re.DOTALL
)

# And replace calls
content = content.replace('_is_bodyweight_exercise(', 'calc.is_bodyweight_exercise(')

with open('backend/app/routers/lifts.py', 'w') as f:
    f.write(content)
