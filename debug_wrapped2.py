import sys, sqlite3
conn = sqlite3.connect("gym.db")
c = conn.cursor()
c.execute("SELECT date FROM lift_logs LIMIT 1")
print(repr(c.fetchone()[0]))
