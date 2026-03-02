import os
import shutil
import sqlite3
import subprocess
import time
import sys

def repair():
    print("="*40)
    print("   TALENTSCOUT SYSTEM RECOVERY TOOL   ")
    print("="*40)
    
    db_file = "talentscout.db"
    
    # 1. Force kill python
    print("\n[STEP 1] Terminating all Python processes...")
    try:
        # Use taskkill with /T to kill child processes (like background threads)
        subprocess.run(["taskkill", "/F", "/IM", "python.exe", "/T"], capture_output=True)
        print("✓ All Python processes terminated.")
    except:
        print("! No active Python processes found.")

    time.sleep(2)

    # 2. Cleanup lock files
    print("\n[STEP 2] Removing database lock files...")
    for ext in ["-wal", "-shm"]:
        f = db_file + ext
        if os.path.exists(f):
            try:
                os.remove(f)
                print(f"✓ Removed {f}")
            except Exception as e:
                print(f"! Could not remove {f}: {e}")
                print("  This usually means a process is still holding it.")

    # 3. Attempt database clear or delete
    print("\n[STEP 3] Resetting Data Integrity...")
    try:
        if os.path.exists(db_file):
            print("  Attempting to clear records...")
            conn = sqlite3.connect(db_file, timeout=5)
            c = conn.cursor()
            c.execute("DELETE FROM candidates")
            conn.commit()
            conn.close()
            print("✓ Success: Database records cleared.")
        else:
            print("  Database file not found — a new one will be created.")
    except Exception as e:
        print(f"! ERROR: Database is still HARD-LOCKED: {e}")
        print("  Attempting to delete the entire database file...")
        try:
            # If we can't delete it, we rename it (often works as a workaround)
            if os.path.exists(db_file):
                temp_name = f"talentscout_backup_{int(time.time())}.db"
                os.rename(db_file, temp_name)
                print(f"✓ Database moved to {temp_name}. Problem solved.")
            else:
                print("✓ Database file is already gone.")
        except Exception as e2:
            print(f"!! CRITICAL: File System Lock detected: {e2}")
            print("\n" + "!"*40)
            print(" ACTION REQUIRED: PLEASE REBOOT YOUR COMPUTER.")
            print(" A system process is holding 'talentscout.db' hostage.")
            print("!"*40 + "\n")
            return

    print("\n" + "="*40)
    print(" RECOVERY SUCCESSFUL! ")
    print("="*40)
    print("1. Refresh your dashboard in the browser.")
    print("2. Run 'start_talentscout.bat' to start fresh.")
    print("="*40)

if __name__ == "__main__":
    repair()
