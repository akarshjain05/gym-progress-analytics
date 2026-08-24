import re

with open('backend/app/routers/workout_templates.py', 'r') as f:
    content = f.read()

# Remove the _finish_workout_logic function
pattern = re.compile(r'def _finish_workout_logic\(.*?    return \{\n.*?\n    \}', re.DOTALL)
content = pattern.sub('', content)

# Add import
content = content.replace('from app import models', 'from app import models\nfrom app.services import workout_service')

# Update call
content = content.replace('_finish_workout_logic(', 'workout_service.finish_workout_logic(')

with open('backend/app/routers/workout_templates.py', 'w') as f:
    f.write(content)
