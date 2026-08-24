import re

with open('backend/app/main.py', 'r') as f:
    content = f.read()

pattern = re.compile(r'    if not os\.getenv\("TESTING"\):\n        # Automatically run alembic upgrade head on startup\n        try:\n            subprocess\.run\(\n                \["alembic", "upgrade", "head"\],\n                cwd=os\.path\.dirname\(os\.path\.dirname\(__file__\)\),\n                check=True\n            \)\n        except Exception as e:\n            print\(f"Warning: Alembic migration failed to run automatically: \{e\}"\)\n', re.DOTALL)

content = pattern.sub('    if not os.getenv("TESTING"):\n', content)

with open('backend/app/main.py', 'w') as f:
    f.write(content)
