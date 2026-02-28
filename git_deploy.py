import os
import subprocess

def run_cmd(cmd):
    print(f"Running: {' '.join(cmd)}")
    try:
        # Run process and wait for it to complete
        result = subprocess.run(
            cmd, 
            cwd=r"C:\\Users\\dell\\Desktop\\xnords", 
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT,
            text=True,
            timeout=60
        )
        return result.stdout
    except subprocess.TimeoutExpired as e:
        return f"TIMEOUT: {e}"
    except Exception as e:
        return f"ERROR: {e}"

output = []
output.append("=== GIT ADD ===")
output.append(run_cmd(["git", "add", "."]))
output.append("\\n=== GIT COMMIT ===")
output.append(run_cmd(["git", "commit", "-m", "Refactor: Finalized Hackathon Release (TalentScout AI)"]))
output.append("\\n=== GIT PUSH ===")
output.append(run_cmd(["git", "push", "origin", "main", "--force"]))

with open(r"C:\\Users\\dell\\Desktop\\xnords\\git_final_output.txt", "w") as f:
    f.write("\\n".join(output))

print("Git script completed.")
