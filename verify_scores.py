import sqlite3
import json

DB_NAME = "talentscout.db"

def verify_scores():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT id, name, score, data_json FROM candidates")
    rows = c.fetchall()
    
    for r_id, name, total_score, data_json in rows:
        data = json.loads(data_json)
        breakdown = data.get("score_breakdown", {})
        sum_score = sum(v.get("score", 0) for v in breakdown.values())
        print(f"Candidate {name} (ID: {r_id}):")
        print(f"  Total Score: {total_score}")
        print(f"  Breakdown Sum: {sum_score}")
        if abs(total_score - sum_score) > 0.1:
            print(f"  !! MISMATCH FOUND !! Diff: {total_score - sum_score}")
        else:
            print(f"  ✓ Sum matches.")
    conn.close()

if __name__ == "__main__":
    verify_scores()
