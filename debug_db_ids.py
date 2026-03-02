import sqlite3
import json

def check_db():
    try:
        conn = sqlite3.connect("talentscout.db")
        c = conn.cursor()
        c.execute("SELECT id, filename, data_json FROM candidates LIMIT 5")
        rows = c.fetchall()
        print(f"Checking first {len(rows)} candidates:")
        for r in rows:
            cid, filename, djson = r
            data = json.loads(djson)
            json_id = data.get("id")
            print(f"- CID: {cid}, Filename: {filename}, ID in JSON: {json_id}")
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    check_db()
