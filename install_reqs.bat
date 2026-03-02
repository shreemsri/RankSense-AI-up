@echo off
echo Installing TalentScout Dependencies...
pip install fastapi uvicorn pdfplumber spacy python-multipart requests websockets python-docx
echo.
echo Downloading Spacy Model (en_core_web_sm)...
python -m spacy download en_core_web_sm
echo.
echo Installation Complete.
pause
