import re

# Mocking the taxonomy and keywords for the test
SKILLS_TAXONOMY = ["python", "react"]
TIER_1_COLLEGES = ["iit"]
TIER_2_COLLEGES = ["vit"]
LANGUAGE_KEYWORDS = ["english"]

def test_extraction_logic(text):
    text_lower = text.lower()
    
    # Mocking the extraction logic from main.py
    # ── 5. School Marks (10th / 12th) ────────────────────────────────────────
    school_marks = []
    # Using the exact refined regex from main.py
    school_pattern = re.findall(
        r'(?<!ygpa)(?<!cgpa)(?<!gpa)(?:10th|x(?:th)?|ssc|hsc|12th|xii(?:th)?|class\s*12|class\s*10|secondary|higher secondary)[^\n]{0,60}?\b([0-9]{2}(?:\.[0-9]{1,2})?)\b(?:\s*%|\s*/\s*100|\s*marks|\s*score)?',
        text_lower
    )
    
    for m in school_pattern:
        try:
            val = float(m)
            if 1900 <= val <= 2030: continue
            if 35 <= val <= 100:
                school_marks.append(val)
            elif 1.0 <= val <= 10:
                school_marks.append(val * 10)
        except: continue
    
    return school_marks

# Test Cases
test_texts = [
    "School: 10th - 95%, 12th - 90%",
    "University YGPA: 8.6, 12th: 92%",
    "Higher Secondary (12th): 88.5 Marks",
    "Class 10: 9.8 CGPA",
    "YGPA: 8.1, SSC: 85%"
]

for i, text in enumerate(test_texts):
    marks = test_extraction_logic(text)
    print(f"Test {i+1}: '{text}' -> Marks: {marks}")

# Check if ygpa is still caught if it's right next to it but excluded
# "YGPA: 8.6, 12th: 92%" -> should only catch 92
marks_ygpa = test_extraction_logic("YGPA: 8.6, 12th: 92%")
assert 8.6 not in marks_ygpa and 86.0 not in marks_ygpa, "YGPA should not be in school marks"
assert 92.0 in marks_ygpa, "12th marks should be in school marks"

print("\nValidation Successful: YGPA is not picked up as school marks.")
