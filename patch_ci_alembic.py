import re

with open('.github/workflows/ci.yml', 'r') as f:
    content = f.read()

content = content.replace(
    '    - name: Run tests',
    '    - name: Test Alembic Migrations\n      run: |\n        cd backend\n        export DATABASE_URL="sqlite:///test_migrations.db"\n        alembic upgrade head\n    - name: Run tests'
)

with open('.github/workflows/ci.yml', 'w') as f:
    f.write(content)

with open('backend/tests/conftest.py', 'r') as f:
    conftest = f.read()

# Revert conftest.py
old_alembic = """    from alembic.config import Config
    from alembic import command
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_file}")
    command.upgrade(alembic_cfg, "head")"""

new_alembic = """    Base.metadata.create_all(bind=engine)"""
conftest = conftest.replace(old_alembic, new_alembic)

with open('backend/tests/conftest.py', 'w') as f:
    f.write(conftest)
