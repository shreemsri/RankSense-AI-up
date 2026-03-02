@echo off
echo Configuring Git...
git config user.email "bot@talentscout.ai"
git config user.name "TalentScout Bot"

echo Initializing Repo...
git init

echo Adding Files...
git add .

echo Committing...
git commit -m "Initial commit: TalentScout Enterprise Core"

echo Setting Branch...
git branch -M main

echo Adding Remote...
git remote remove origin
git remote add origin https://github.com/shashank-tomar0/TalentScout-AI.git

echo Pushing to GitHub...
git push -u origin main

echo Done.
pause
