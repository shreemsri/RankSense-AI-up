import sqlite3
import json

DB_NAME = "talentscout.db"

def check():
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        rows = c.execute("SELECT id, filename, user_id FROM candidates").fetchall()
        print(f"Total candidates: {len(rows)}")
        for r in rows:
            print(f"ID: {r[0]} | Filename: {r[1]} | User: {r[2]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
