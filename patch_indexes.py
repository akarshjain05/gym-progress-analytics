import re

with open('backend/app/models.py', 'r') as f:
    content = f.read()

# Add Index to imports if missing
if 'Index,' not in content and ' Index ' not in content:
    content = content.replace('UniqueConstraint, Text, JSON, CheckConstraint', 'UniqueConstraint, Text, JSON, CheckConstraint, Index')

# 1. BodyWeightLog
content = content.replace(
    '    __table_args__ = (\n        CheckConstraint("weight_kg > 0", name="chk_bodyweight_positive"),\n        CheckConstraint("body_fat_pct >= 0 AND body_fat_pct <= 100", name="chk_bodyfat_range"),\n        UniqueConstraint("user_id", "date", name="uix_user_date")\n    )',
    '    __table_args__ = (\n        CheckConstraint("weight_kg > 0", name="chk_bodyweight_positive"),\n        CheckConstraint("body_fat_pct >= 0 AND body_fat_pct <= 100", name="chk_bodyfat_range"),\n        UniqueConstraint("user_id", "date", name="uix_user_date"),\n        Index("idx_bwlog_user_date", "user_id", "date")\n    )'
)

# 2. LiftLog
content = content.replace(
    '    __table_args__ = (\n        CheckConstraint("weight_kg >= 0", name="chk_lift_weight_nonnegative"),\n        CheckConstraint("reps > 0", name="chk_lift_reps_positive"),\n        CheckConstraint("rpe >= 0 AND rpe <= 10", name="chk_lift_rpe_range"),\n    )',
    '    __table_args__ = (\n        CheckConstraint("weight_kg >= 0", name="chk_lift_weight_nonnegative"),\n        CheckConstraint("reps > 0", name="chk_lift_reps_positive"),\n        CheckConstraint("rpe >= 0 AND rpe <= 10", name="chk_lift_rpe_range"),\n        Index("idx_liftlog_user_date", "user_id", "date")\n    )'
)

# 3. CalorieLog
content = content.replace(
    '    __table_args__ = (\n        CheckConstraint("calories >= 0", name="chk_calories_nonnegative"),\n        CheckConstraint("protein_g >= 0", name="chk_protein_nonnegative"),\n        CheckConstraint("carbs_g >= 0", name="chk_carbs_nonnegative"),\n        CheckConstraint("fats_g >= 0", name="chk_fats_nonnegative"),\n        UniqueConstraint("user_id", "date", name="uix_user_cal_date")\n    )',
    '    __table_args__ = (\n        CheckConstraint("calories >= 0", name="chk_calories_nonnegative"),\n        CheckConstraint("protein_g >= 0", name="chk_protein_nonnegative"),\n        CheckConstraint("carbs_g >= 0", name="chk_carbs_nonnegative"),\n        CheckConstraint("fats_g >= 0", name="chk_fats_nonnegative"),\n        UniqueConstraint("user_id", "date", name="uix_user_cal_date"),\n        Index("idx_callog_user_date", "user_id", "date")\n    )'
)

with open('backend/app/models.py', 'w') as f:
    f.write(content)
