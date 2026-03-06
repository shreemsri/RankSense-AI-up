import sqlite3
import os

DB_NAME = "talentscout.db"
print(f"Checking {DB_NAME}...")
try:
    conn = sqlite3.connect(DB_NAME, timeout=5)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = c.fetchall()
    print(f"Tables found: {tables}")
    conn.close()
    print("Database is accessible.")
except Exception as e:
    print(f"Database error: {e}")
