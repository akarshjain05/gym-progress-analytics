import re

with open('backend/app/routers/coach.py', 'r') as f:
    content = f.read()

# Fix signatures
content = content.replace('def _predict_strength_hybrid(lift_logs: list, db: Session) -> list[dict]:', 'def _predict_strength_hybrid(lift_logs: list, db: Session, timezone_str: str) -> list[dict]:')
content = content.replace('def _weight_trajectory(weight_logs: list, current_weight: Optional[float], target_weight: Optional[float]) -> dict:', 'def _weight_trajectory(weight_logs: list, current_weight: Optional[float], target_weight: Optional[float], timezone_str: str) -> dict:')
content = content.replace('def _muscle_group_volume(lift_logs: list, db: Session) -> dict:', 'def _muscle_group_volume(lift_logs: list, db: Session, timezone_str: str) -> dict:')
content = content.replace('def _consistency_score(lift_logs: list, weight_logs: list, calorie_logs: list) -> dict:', 'def _consistency_score(lift_logs: list, weight_logs: list, calorie_logs: list, timezone_str: str) -> dict:')

# Fix body
content = content.replace('today = get_today("UTC")', 'today = get_today(timezone_str)')

# Fix call sites
content = content.replace('_predict_strength_hybrid(lift_logs, db)', '_predict_strength_hybrid(lift_logs, db, current_user.timezone)')
content = content.replace('_weight_trajectory(weight_logs, current_weight, current_user.goal_weight_kg)', '_weight_trajectory(weight_logs, current_weight, current_user.goal_weight_kg, current_user.timezone)')
content = content.replace('_muscle_group_volume(lift_logs, db)', '_muscle_group_volume(lift_logs, db, current_user.timezone)')
content = content.replace('_consistency_score(lift_logs, weight_logs, calorie_logs)', '_consistency_score(lift_logs, weight_logs, calorie_logs, current_user.timezone)')

with open('backend/app/routers/coach.py', 'w') as f:
    f.write(content)
