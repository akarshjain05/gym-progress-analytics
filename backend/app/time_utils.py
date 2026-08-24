import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

def get_today(timezone_str: str = "UTC") -> datetime.date:
    """Returns the current date in the specified timezone (fallback to UTC)."""
    if not timezone_str:
        timezone_str = "UTC"
    try:
        tz = ZoneInfo(timezone_str)
    except ZoneInfoNotFoundError:
        tz = datetime.timezone.utc
    return datetime.datetime.now(tz).date()
