import os
import shutil
import sqlite3

def nuclear_reset():
    print("--- TALENTSCOUT NUCLEAR RESET ---")
    
    # 1. Database files to purge
    db_files = ["talentscout.db", "talentscout.db-wal", "talentscout.db-shm"]
    
    for f in db_files:
        if os.path.exists(f):
            try:
                os.remove(f)
                print(f"[PURGED] {f}")
            except Exception as e:
                print(f"[ERROR] Could not delete {f}: {e}")
                print("Tip: Make sure to STOP your backend terminal first!")
    
    print("\n--- CACHE PURGED ---")
    print("Next steps:")
    print("1. Close the terminal running main.py.")
    print("2. Run 'start_talentscout.bat' to start fresh.")
    print("3. Re-upload your resumes.")

if __name__ == "__main__":
    nuclear_reset()
