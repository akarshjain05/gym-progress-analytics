import re

with open('backend/tests/conftest.py', 'r') as f:
    content = f.read()

# Replace Base.metadata.create_all with alembic upgrade head
old_alembic = """    Base.metadata.create_all(bind=engine)"""
new_alembic = """    from alembic.config import Config
    from alembic import command
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_file}")
    command.upgrade(alembic_cfg, "head")"""

content = content.replace(old_alembic, new_alembic)

with open('backend/tests/conftest.py', 'w') as f:
    f.write(content)
