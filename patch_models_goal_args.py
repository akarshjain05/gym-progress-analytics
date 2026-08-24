import re

with open('backend/app/models.py', 'r') as f:
    content = f.read()

# Remove my added one
pattern = re.compile(r'    __table_args__ = \(\n        CheckConstraint\(\n            "\(goal_type = \'lift\'.*?name="check_goal_polymorphic"\n        \),\n    \)\n', re.DOTALL)
content = pattern.sub('', content)

# Add to the existing one
existing = """    __table_args__ = (
        CheckConstraint("target_weight_kg > 0", name="chk_goal_weight_positive"),"""
replacement = """    __table_args__ = (
        CheckConstraint(
            "(goal_type = 'lift' AND exercise_id IS NOT NULL AND (target_weight_kg IS NOT NULL OR target_reps IS NOT NULL)) OR "
            "(goal_type = 'weight' AND target_body_weight_kg IS NOT NULL) OR "
            "(goal_type = 'nutrition' AND (target_calories IS NOT NULL OR target_protein_g IS NOT NULL)) OR "
            "(goal_type = 'frequency' AND target_workouts_per_week IS NOT NULL)",
            name="check_goal_polymorphic"
        ),
        CheckConstraint("target_weight_kg > 0", name="chk_goal_weight_positive"),"""

content = content.replace(existing, replacement)

with open('backend/app/models.py', 'w') as f:
    f.write(content)
