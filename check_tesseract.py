import pytesseract
import os

tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
print(f"Checking path: {tesseract_path}")
print(f"Path exists: {os.path.exists(tesseract_path)}")

if os.path.exists(tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_path
    try:
        version = pytesseract.get_tesseract_version()
        print(f"Tesseract version: {version}")
    except Exception as e:
        print(f"Error getting version: {e}")
else:
    print("Tesseract not found at default path.")
