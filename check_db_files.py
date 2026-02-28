import sqlite3
import json

conn = sqlite3.connect('talentscout.db')
c = conn.cursor()
c.execute("SELECT data_json FROM candidates ORDER BY rowid DESC LIMIT 1")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    with open("full_text_saved.txt", "w", encoding="utf-8") as f:
        f.write(data.get('raw_text', 'No raw text found in DB'))
    print("Saved to full_text_saved.txt")
else:
    print("No data found")
conn.close()
