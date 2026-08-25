import re

with open('docker-compose.yml', 'r') as f:
    content = f.read()

content = content.replace('    ports:\n      - "5432:5432"\n', '')
content = content.replace('    ports:\n      - "6379:6379"\n', '')

with open('docker-compose.yml', 'w') as f:
    f.write(content)
