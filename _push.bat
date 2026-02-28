@echo off
echo "=== Git Status ==="
git status
echo "=== Git Remote ==="
git remote -v
echo "=== Adding ==="
git add .
echo "=== Committing ==="
git commit -m "Refactor: Finalized Hackathon Release (RankSense AI to TalentScout AI)"
echo "=== Pushing ==="
git push origin HEAD --force
echo "Done."
