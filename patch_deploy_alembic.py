import re

with open('.github/workflows/ci.yml', 'r') as f:
    content = f.read()

content = content.replace(
    '            git pull\n            docker compose up -d --build\n',
    '            git pull\n            docker compose up -d --build\n            docker compose exec -T backend alembic upgrade head\n'
)

with open('.github/workflows/ci.yml', 'w') as f:
    f.write(content)
