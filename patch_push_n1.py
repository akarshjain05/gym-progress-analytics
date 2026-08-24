import re

with open('backend/app/push_notifications.py', 'r') as f:
    content = f.read()

new_func = """def notify_inactivity_check(db: Session):
    \"\"\"
    Check all users. If they haven't logged a workout in 3+ days, send a reminder.
    Call this from a daily cron/scheduler endpoint.
    \"\"\"
    from sqlalchemy import func
    
    three_days_ago = date.today() - timedelta(days=3)
    subs = db.query(models.PushSubscription).all()
    
    if not subs:
        return
        
    user_ids = list({sub.user_id for sub in subs})
    
    # Get max date per user_id in one query
    latest_logs = (
        db.query(models.LiftLog.user_id, func.max(models.LiftLog.date).label('max_date'))
        .filter(models.LiftLog.user_id.in_(user_ids))
        .group_by(models.LiftLog.user_id)
        .all()
    )
    
    last_log_dates = {row.user_id: row.max_date for row in latest_logs}
    
    subs_to_delete = []

    for sub in subs:
        last_date = last_log_dates.get(sub.user_id)
        if last_date is None or last_date <= three_days_ago:
            days_ago = (date.today() - last_date).days if last_date else "a while"
            ok, reason = _send_push(
                sub,
                title="Time to train!",
                body=f"It has been {days_ago} days since your last workout. Get back on track!",
                url="/workout.html",
            )
            if not ok and reason == "410_GONE":
                subs_to_delete.append(sub)
                
    if subs_to_delete:
        for s in subs_to_delete:
            db.delete(s)
        db.commit()
"""

pattern = re.compile(r'def notify_inactivity_check\(db: Session\):.*?(?=@router\.post\("/check-inactivity"\))', re.DOTALL)
content = pattern.sub(new_func + '\n\n', content)

with open('backend/app/push_notifications.py', 'w') as f:
    f.write(content)
