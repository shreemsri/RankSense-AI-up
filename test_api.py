import requests
import json

def test():
    user_id = "anonymous"
    print(f"Testing /candidates for user: {user_id}")
    try:
        res = requests.get("http://localhost:8000/candidates", headers={"X-User-Id": user_id})
        if res.status_code == 200:
            candidates = res.json()
            print(f"Found {len(candidates)} candidates.")
            for c in candidates:
                print(f"- Filename: {c.get('filename')}, ID: {c.get('id')}, Score: {c.get('score')}")
        else:
            print(f"Failed with status: {res.status_code}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
