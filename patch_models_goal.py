import re

with open('backend/app/models.py', 'r') as f:
    content = f.read()

constraint = """
    __table_args__ = (
        CheckConstraint(
            "(goal_type = 'lift' AND exercise_id IS NOT NULL AND (target_weight_kg IS NOT NULL OR target_reps IS NOT NULL)) OR "
            "(goal_type = 'weight' AND target_body_weight_kg IS NOT NULL) OR "
            "(goal_type = 'nutrition' AND (target_calories IS NOT NULL OR target_protein_g IS NOT NULL)) OR "
            "(goal_type = 'frequency' AND target_workouts_per_week IS NOT NULL)",
            name="check_goal_polymorphic"
        ),
    )
"""

content = content.replace(
    '    id = Column(Integer, primary_key=True, index=True)',
    constraint + '\n    id = Column(Integer, primary_key=True, index=True)'
)

with open('backend/app/models.py', 'w') as f:
    f.write(content)
