from datetime import datetime, timezone, timedelta
from datetime import date as date_type

# IST = UTC + 5:30
IST = timezone(timedelta(hours=5, minutes=30))

def ist_today() -> date_type:
    """Returns the current date in Indian Standard Time (UTC+5:30)."""
    return datetime.now(IST).date()
