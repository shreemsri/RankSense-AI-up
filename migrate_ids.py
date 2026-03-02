import sqlite3
import json

def migrate():
    conn = sqlite3.connect("talentscout.db")
    c = conn.cursor()
    c.execute("SELECT id, data_json FROM candidates")
    rows = c.fetchall()
    print(f"Migrating {len(rows)} candidates...")
    
    updated = 0
    for r in rows:
        cid, djson = r
        try:
            data = json.loads(djson)
            if data.get("id") != cid:
                data["id"] = cid
                c.execute("UPDATE candidates SET data_json=? WHERE id=?", (json.dumps(data), cid))
                updated += 1
        except Exception as e:
            print(f"Error migrating row {cid}: {e}")
            
    conn.commit()
    conn.close()
    print(f"Migration complete. Updated {updated} rows.")

if __name__ == "__main__":
    migrate()
