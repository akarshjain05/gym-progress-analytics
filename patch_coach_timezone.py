import re

with open('backend/app/routers/coach.py', 'r') as f:
    content = f.read()

# Fix in _predict_weight_hybrid
content = content.replace(
    'def _predict_weight_hybrid(weight_logs: list, profile_goal: Optional[float], current_weight: Optional[float]) -> dict:',
    'def _predict_weight_hybrid(weight_logs: list, profile_goal: Optional[float], current_weight: Optional[float], timezone_str: str = "UTC") -> dict:'
)

content = content.replace(
    '    weight_pred = _predict_weight_hybrid(weight_logs, current_user.goal_weight_kg, current_weight)',
    '    weight_pred = _predict_weight_hybrid(weight_logs, current_user.goal_weight_kg, current_weight, current_user.timezone or "UTC")'
)

# And restore the try/except
content = content.replace(
    '    except Exception as e:\n        raise e',
    '    except Exception as e:\n        raise HTTPException(status_code=500, detail="Failed to process analysis data.")'
)

with open('backend/app/routers/coach.py', 'w') as f:
    f.write(content)
