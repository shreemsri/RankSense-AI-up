import sys
import os

# Add the parent directory to sys.path to import main
sys.path.append(os.getcwd())

from main import calculate_candidate_score, SKILLS_TAXONOMY

def test_scoring():
    print("Testing 12-Point Scoring System...")
    sys.stdout.flush()
    
    # Mock extracted data
    mock_extracted = {
        "skills": ["Python", "React", "Docker"],  # 3 skills
        "internship_count": 2,                    # 20 pts
        "project_count": 3,                       # 15 pts
        "cgpa": 8.5,                              # 8.5 pts
        "achievement_count": 2,                   # 4 pts
        "hackathon_count": 1,                     # 2 pts -> total 6 pts
        "experience_years": 2,                    # 2 pts
        "experience_count": 2,                    # 2 pts -> max 2 pts
        "extra_count": 2,                         # 3 pts
        "degree_score": 3,                        # 3 pts (Masters)
        "link_count": 2,                          # 2 pts
        "language_count": 2,                      # 2 pts
        "college_tier_score": 2,                  # 2 pts
        "school_marks_score": 1.5,                # 1.5 pts
        "college_name": "IIT Bombay"
    }
    
    # Mock JD text containing some skills
    jd_text = "Looking for a Python developer with React experience. Knowledge of Kubernetes is a plus."
    
    score, analysis, breakdown = calculate_candidate_score(mock_extracted, "full text", jd_text)
    
    print(f"Final Score: {score}/100")
    print("\nBreakdown:")
    for k, v in breakdown.items():
        print(f" - {k}: {v['score']}/{v['max']} ({v['detail']})")
        
    print("\nAnalysis:")
    print(f" - Matches: {analysis['matches']}")
    print(f" - Missing: {analysis['missing']}")
    
    # Assertions
    assert breakdown['internships']['score'] == 20.0
    assert breakdown['projects']['score'] == 15.0
    assert breakdown['cgpa']['score'] == 8.5
    # Skills: 3 base + JD bonus (Python, React are matches. JD has Python, React, Kubernetes. Ratio 2/3 * 10 = 6.67)
    # Total skills: 3 + 6.67 = 9.67
    assert breakdown['skills']['score'] == 9.67
    
    print("\nScoring Verification PASSED!")

if __name__ == "__main__":
    try:
        test_scoring()
    except Exception as e:
        print(f"Scoring Verification FAILED: {e}")
        import traceback
        traceback.print_exc()
