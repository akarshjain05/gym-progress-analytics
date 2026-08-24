import re

with open('backend/app/models.py', 'r') as f:
    content = f.read()

content = content.replace(
    'unit_preference = Column(String, nullable=False, default="kg")',
    'unit_preference = Column(String, nullable=False, default="kg")\n    timezone = Column(String, default="UTC", server_default="UTC")'
)

with open('backend/app/models.py', 'w') as f:
    f.write(content)
