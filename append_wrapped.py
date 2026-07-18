import re

with open('backend/app/routers/analytics.py', 'r') as f:
    content = f.read()

if "def wrapped(" not in content:
    new_endpoint = """
@router.get("/wrapped")
def wrapped(
    year: int = None,
    month: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = ist_today()
    target_year = year or today.year
    target_month = month or today.month

    # Get all logs for this month/year
    lift_logs = (
        db.query(models.LiftLog)
        .join(models.Exercise)
        .filter(
            models.LiftLog.user_id == current_user.id,
            db.func.extract('year', models.LiftLog.date) == target_year,
            db.func.extract('month', models.LiftLog.date) == target_month
        )
        .all()
    )

    weight_logs = (
        db.query(models.BodyWeightLog)
        .filter(
            models.BodyWeightLog.user_id == current_user.id,
            db.func.extract('year', models.BodyWeightLog.date) == target_year,
            db.func.extract('month', models.BodyWeightLog.date) == target_month
        )
        .all()
    )

    calorie_logs = (
        db.query(models.CalorieLog)
        .filter(
            models.CalorieLog.user_id == current_user.id,
            db.func.extract('year', models.CalorieLog.date) == target_year,
            db.func.extract('month', models.CalorieLog.date) == target_month
        )
        .all()
    )

    active_days = {l.date for l in weight_logs} | {l.date for l in lift_logs} | {l.date for l in calorie_logs}
    
    # Calculate streak just for this month's active days
    # (Simplified streak logic just for the month)
    longest_streak = 0
    current_run = 0
    prev_date = None
    for d in sorted(active_days):
        if prev_date is not None and (d - prev_date).days == 1:
            current_run += 1
        else:
            current_run = 1
        longest_streak = max(longest_streak, current_run)
        prev_date = d

    total_volume_kg = sum((l.weight_kg * l.reps) for l in lift_logs if l.weight_kg and l.reps)
    elephants = round(total_volume_kg / 4000, 2)
    
    # Muscle group tracking
    muscle_volume = defaultdict(float)
    biggest_pr_weight = 0
    biggest_pr_exercise = "Nothing yet"
    
    for l in lift_logs:
        vol = (l.weight_kg * l.reps) if l.weight_kg and l.reps else 0
        group = l.exercise.muscle_group or "other"
        muscle_volume[group] += vol
        
        # Max weight lifted (simple PR for narrative)
        if l.weight_kg and l.weight_kg > biggest_pr_weight:
            biggest_pr_weight = l.weight_kg
            biggest_pr_exercise = l.exercise.name

    most_trained_muscle = "Nothing yet"
    if muscle_volume:
        most_trained_muscle = max(muscle_volume, key=muscle_volume.get)

    month_name = date_type(target_year, target_month, 1).strftime('%B')

    return {
        "period": f"{month_name} {target_year}",
        "total_volume_kg": total_volume_kg,
        "elephants": elephants,
        "most_trained_muscle": most_trained_muscle.capitalize(),
        "biggest_pr_weight": biggest_pr_weight,
        "biggest_pr_exercise": biggest_pr_exercise,
        "longest_streak": longest_streak,
        "active_days": len(active_days)
    }
"""
    with open('backend/app/routers/analytics.py', 'a') as f:
        f.write(new_endpoint)
