"""Add secondary_muscle, equipment, difficulty, instructions to exercises

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-07-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('exercises', sa.Column('secondary_muscle', sa.String(), nullable=True))
    op.add_column('exercises', sa.Column('equipment', sa.String(), nullable=True))
    op.add_column('exercises', sa.Column('difficulty', sa.String(), nullable=True))
    op.add_column('exercises', sa.Column('instructions', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('exercises', 'instructions')
    op.drop_column('exercises', 'difficulty')
    op.drop_column('exercises', 'equipment')
    op.drop_column('exercises', 'secondary_muscle')
