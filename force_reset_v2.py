import sqlite3
import os

DB_NAME = "talentscout.db"

def reset_db():
    if not os.path.exists(DB_NAME):
        print(f"Database {DB_NAME} not found. Nothing to reset.")
        return

    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        
        # Drop all relevant tables
        c.execute("DROP TABLE IF EXISTS candidates")
        c.execute("DROP TABLE IF EXISTS users")
        
        print("Successfully wiped 'candidates' and 'users' tables.")
        
        conn.commit()
        conn.close()
        
        print("\n[SUCCESS] Cache cleared. Restart your backend and re-upload to see the new Neural Logic in action!")
    except Exception as e:
        print(f"Error resetting database: {e}")

if __name__ == "__main__":
    reset_db()
