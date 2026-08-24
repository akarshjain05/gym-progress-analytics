import re

with open('backend/app/schemas.py', 'r') as f:
    content = f.read()

content = content.replace('timezone: str\n', 'timezone: str = "UTC"\n')

with open('backend/app/schemas.py', 'w') as f:
    f.write(content)
