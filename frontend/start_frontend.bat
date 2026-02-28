@echo off
echo === TalentScout AI Frontend ===
echo.
echo Installing dependencies (first run only)...
call npm install
echo.
echo Starting Next.js dev server on http://localhost:3001
echo.
call npm run dev -- --port 3001
