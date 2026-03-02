import sys

# Minimal required data for scoring logic
SKILLS_TAXONOMY = [
    "python", "react", "docker", "kubernetes", "java", "javascript", "typescript", "go"
]

def calculate_candidate_score(extracted, full_text, jd_text=""):
    """
    Calculates weighted score based on ATS criteria (Max 100).
    Returns (total_score, analysis_dict, score_breakdown_dict)
    """
    breakdown = {}  # per-category scores for explainability
    analysis = {"matches": [], "missing": [], "jd_present": bool(jd_text.strip())}

    # — 1. Prior Internships (20pts max) — 10pts per internship, cap at 2 —
    internships = extracted.get('internship_count', 0)
    pts_intern = min(internships * 10.0, 20.0)

    # — 2. Technical Skills (20pts max) — Base skills + JD Alignment Bonus —
    skills_list = extracted.get('skills', [])
    # Base presence (up to 10 pts: 1 pt per skill)
    base_skill_pts = min(float(len(skills_list)), 10.0)
    
    # JD Alignment Bonus (up to 10 pts)
    jd_bonus = 0.0
    if analysis["jd_present"]:
        jd_keywords = [s.lower() for s in SKILLS_TAXONOMY if s.lower() in jd_text.lower()]
        matches = [s for s in skills_list if s.lower() in jd_keywords]
        missing = [s for s in jd_keywords if s.lower() not in [sk.lower() for sk in skills_list]]
        analysis["matches"] = list(set(matches))
        analysis["missing"] = list(set(missing))
        
        if jd_keywords:
            match_ratio = len(analysis["matches"]) / len(jd_keywords)
            jd_bonus = min(match_ratio * 10.0, 10.0)
    
    pts_skills = base_skill_pts + jd_bonus

    # — 3. Projects (15pts max) — 5pts per project, capped at 3 —
    projects = extracted.get('project_count', 0)
    pts_proj = min(projects * 5.0, 15.0)
    
    # — 4. CGPA / Academic (10pts max) — Linear scale (8.0 CGPA = 8 pts) —
    cgpa = extracted.get('cgpa', 0.0)
    if 0 < cgpa <= 4.0:
        pts_cgpa = round(min(cgpa * 2.5, 10.0), 2)
    elif 0 < cgpa <= 10.0:
        pts_cgpa = round(min(cgpa * 1.0, 10.0), 2)
    else:
        pts_cgpa = 0.0

    # — 5. Quantifiable Achievements (10pts max) — 2pts per achievement —
    achievements = extracted.get('achievement_count', 0)
    hack_count = extracted.get('hackathon_count', 0)
    pts_ach = min(achievements * 2.0 + hack_count * 2.0, 10.0)

    # — 6. Work Experience (5pts max) — Weighted based on years and roles —
    exp_years = extracted.get('experience_years', 0)
    exp_entries = extracted.get('experience_count', 0)
    pts_exp = round(max(min(exp_years * 1.0, 5.0), min(exp_entries * 1.0, 5.0)), 2)

    # — 7. Extra-curricular (5pts max) — Leadership roles, clubs, sports —
    extra = extracted.get('extra_count', 0)
    pts_extra = round(min(extra * 1.5, 5.0), 2)

    # — 8. Degree Quality (3pts max) — 3 (Masters/PhD), 2 (Bachelors), 1 (Diploma) —
    degree_pts = float(extracted.get('degree_score', 1))

    # — 9. Online Presence (3pts max) — GitHub, LinkedIn, Portfolios —
    links = extracted.get('link_count', 0)
    pts_links = round(min(links * 1.0, 3.0), 2)

    # — 10. Language Fluency (3pts max) — 1pt per language —
    langs = extracted.get('language_count', 0)
    pts_lang = round(min(langs * 1.0, 3.0), 2)

    # — 11. College Tier (2pts max) — 2 (Tier 1), 1 (Tier 2/NITs) —
    college_pts = float(extracted.get('college_tier_score', 0))

    # — 12. School Marks (2pts max) — Scale 0-2 —
    school_pts = float(extracted.get('school_marks_score', 0))

    # Final breakdown mapping (STRICT 12 PS CATEGORIES)
    breakdown = {
        "internships": {"score": round(pts_intern, 2), "max": 20, "detail": f"{internships} detected"},
        "skills": {"score": round(pts_skills, 2), "max": 20, "detail": f"{len(skills_list)} skills + JD bonus"},
        "projects": {"score": round(pts_proj, 2), "max": 15, "detail": f"{projects} detected"},
        "cgpa": {"score": pts_cgpa, "max": 10, "detail": f"CGPA {cgpa}"},
        "achievements": {"score": pts_ach, "max": 10, "detail": f"{achievements} ach. / {hack_count} hack."},
        "experience": {"score": pts_exp, "max": 5, "detail": f"{exp_years}yrs / {exp_entries} roles"},
        "extra_curricular": {"score": pts_extra, "max": 5, "detail": f"{extra} activities"},
        "degree": {"score": degree_pts, "max": 3, "detail": "Postgrad" if degree_pts==3 else "Undergrad" if degree_pts==2 else "Diploma"},
        "online_presence": {"score": pts_links, "max": 3, "detail": f"{links} profiles"},
        "languages": {"score": pts_lang, "max": 3, "detail": f"{langs} languages"},
        "college_rank": {"score": college_pts, "max": 2, "detail": f"{extracted.get('college_name', 'Not found')}"},
        "school_marks": {"score": school_pts, "max": 2, "detail": "Analyzed"}
    }
    
    final_score = round(sum(v["score"] for v in breakdown.values()), 2)
    return final_score, analysis, breakdown

def test_scoring():
    print("Testing 12-Point Scoring System (Isolated)...")
    sys.stdout.flush()
    
    # Mock extracted data
    mock_extracted = {
        "skills": ["python", "react", "docker"],  # 3 skills -> 3 base pts
        "internship_count": 2,                    # 20 pts
        "project_count": 2,                       # 10 pts
        "cgpa": 8.0,                              # 8.0 pts
        "achievement_count": 2,                   # 4 pts
        "hackathon_count": 1,                     # 2 pts -> total 6 pts
        "experience_years": 1,                    # 1 pt
        "experience_count": 1,                    # 1 pt -> max 1 pt
        "extra_count": 2,                         # 3 pts
        "degree_score": 2,                        # 2 pts (Bachelors)
        "link_count": 2,                          # 2 pts
        "language_count": 1,                      # 1 pt
        "college_tier_score": 1,                  # 1 pt
        "school_marks_score": 1.0,                # 1.0 pt
        "college_name": "LPU"
    }
    
    # JD matching: python, react, kubernetes
    jd_text = "Looking for a python developer with react experience and kubernetes knowledge."
    
    score, analysis, breakdown = calculate_candidate_score(mock_extracted, "full text", jd_text)
    
    print(f"Final Score: {score}/100")
    for k, v in breakdown.items():
        print(f" - {k}: {v['score']}/{v['max']}")
    
    # Calculation:
    # 1. Intern: 20
    # 2. Skills: 3 (base) + (2/3 * 10 = 6.67) = 9.67
    # 3. Proj: 10
    # 4. CGPA: 8
    # 5. Ach: 6
    # 6. Exp: 1
    # 7. Extra: 3
    # 8. Degree: 2
    # 9. Online: 2
    # 10. Lang: 1
    # 11. College: 1
    # 12. School: 1
    # Total = 20 + 9.67 + 10 + 8 + 6 + 1 + 3 + 2 + 2 + 1 + 1 + 1 = 64.67
    
    assert abs(score - 64.67) < 0.01
    print("\nScoring logic verified successfully!")

if __name__ == "__main__":
    test_scoring()
