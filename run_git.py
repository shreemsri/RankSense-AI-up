import subprocess

commands = [
    ["git", "add", "."],
    ["git", "commit", "-m", "Refactor: Cleanup repo and rename to TalentScout AI for Hackathon"],
    ["git", "push", "origin", "main"]
]

with open("git_output.txt", "w") as f:
    for cmd in commands:
        f.write(f"\\n=== Running {' '.join(cmd)} ===\\n")
        try:
            result = subprocess.run(cmd, cwd=r"c:\\Users\\dell\\Desktop\\xnords", capture_output=True, text=True)
            f.write(result.stdout)
            if result.stderr:
                f.write("\\n[ERROR]\\n" + result.stderr)
        except Exception as e:
            f.write(f"\\nException: {e}\\n")
