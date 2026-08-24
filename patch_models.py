import re

with open('backend/app/models.py', 'r') as f:
    content = f.read()

# Add timezone to User model
replacement = """    unit_preference = Column(String, default="kg")
    timezone = Column(String, default="UTC")"""

content = re.sub(r'    unit_preference = Column\(String, default="kg"\)', replacement, content)

with open('backend/app/models.py', 'w') as f:
    f.write(content)
