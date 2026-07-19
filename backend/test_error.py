import sys
import math
from datetime import date, timedelta
from app.routers.coach import _eta_for_exercise, ist_today

print(_eta_for_exercise(90.0, 100.0, "improving", 2, 0.5, 80.0, 0, 0.9, ist_today(), 20))
print(_eta_for_exercise(90.0, 100.0, "improving", 1, 0, 0, 0.02, None, ist_today(), 0))
