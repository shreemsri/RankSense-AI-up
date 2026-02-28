from fastapi import FastAPI, UploadFile, File, BackgroundTasks, WebSocket, WebSocketDisconnect, Header

from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import spacy
import re
import difflib
import asyncio
import json
from typing import List, Optional
from fastapi import Form
from pydantic import BaseModel
import docx
import sqlite3
import datetime
import urllib.request
import urllib.error
import os
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()
groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY")) if os.environ.get("GROQ_API_KEY") else None

app = FastAPI()

# Configuration
FREE_LIMIT = 99999 # Unlimited for now
DB_NAME = "talentscout.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("PRAGMA journal_mode=WAL")
    c.execute('''CREATE TABLE IF NOT EXISTS candidates
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  filename TEXT,
                  score REAL,
                  data_json TEXT,
                  user_id TEXT DEFAULT 'anonymous',
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE(filename, user_id))''')
    # Migrate: add new columns if missing
    existing_cols = [r[1] for r in c.execute("PRAGMA table_info(candidates)").fetchall()]
    if "user_id" not in existing_cols:
        c.execute("ALTER TABLE candidates ADD COLUMN user_id TEXT DEFAULT 'anonymous'")
    if "created_at" not in existing_cols:
        c.execute("ALTER TABLE candidates ADD COLUMN created_at DATETIME DEFAULT NULL")
    if "file_hash" not in existing_cols:
        c.execute("ALTER TABLE candidates ADD COLUMN file_hash TEXT DEFAULT ''")
    if "raw_pdf" not in existing_cols:
        c.execute("ALTER TABLE candidates ADD COLUMN raw_pdf BLOB DEFAULT NULL")

    # Users table for tier/daily upload tracking
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (clerk_id TEXT PRIMARY KEY,
                  daily_uploads INTEGER DEFAULT 0,
                  last_upload_date TEXT DEFAULT '',
                  tier TEXT DEFAULT 'free')''')
    c.execute("CREATE INDEX IF NOT EXISTS idx_cands_user ON candidates(user_id)")
    conn.commit()
    conn.close()

init_db()  # Initialize on startup

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    nlp = spacy.load("en_core_web_sm")
    print("SUCCESS: Spacy model loaded.")
except Exception:
    print("WARNING: Spacy model 'en_core_web_sm' not found. Downloads needed.")
    nlp = None

@app.get("/")
def health_check():
    return {"status": "active", "model_loaded": nlp is not None}

# Store active websocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

def fuzzy_match(term, choices, cutoff=0.6):
    matches = difflib.get_close_matches(term, choices, n=1, cutoff=cutoff)
    return matches[0] if matches else term

def normalize_tech_terms(text: str) -> str:
    # Lowercase and replace common skill variations
    t = text.lower()
    t = re.sub(r'\breact\s*js\b|\breact\.js\b|\breactjs\b', 'react', t)
    t = re.sub(r'\bnode\s*js\b|\bnode\.js\b|\bnodejs\b', 'node.js', t)
    t = re.sub(r'\bvue\s*js\b|\bvue\.js\b|\bvuejs\b', 'vue', t)
    t = re.sub(r'\bnext\s*js\b|\bnext\.js\b|\bnextjs\b', 'next.js', t)
    t = re.sub(r'\bexpress\s*js\b|\bexpress\.js\b|\bexpressjs\b', 'express', t)
    t = re.sub(r'\bjava\s*script\b', 'javascript', t)
    t = re.sub(r'\btype\s*script\b', 'typescript', t)
    t = re.sub(r'\bgolang\b', 'go', t)
    t = re.sub(r'\bk8s\b', 'kubernetes', t)
    t = re.sub(r'\baws\b', 'amazon web services', t)
    t = re.sub(r'\bgcp\b', 'google cloud', t)
    return t


def calculate_candidate_score(extracted, full_text, jd_text=""):
    """
    Calculates weighted score based on ATS criteria (Max 100).
    Returns (total_score, analysis_dict, score_breakdown_dict)
    """
    breakdown = {}  # per-category scores for explainability
    score = 0
    analysis = {"matches": [], "missing": [], "jd_present": False}

    # — 1. Prior Internships (20pts max) — 10pts per internship, cap at 2 —
    internships = extracted.get('internship_count', 0)
    pts_intern = min(internships * 10, 20)
    score += pts_intern
    breakdown["internships"] = {"score": pts_intern, "max": 20, "detail": f"{internships} detected"}

    # — 2. Skills & Certification (20pts max) —
    skills_list = extracted.get('skills', [])
    base_skill_score = min(len(skills_list) * 2, 20)

    if jd_text and nlp:
        analysis["jd_present"] = True
        try:
            jd_doc = nlp(jd_text)
            jd_keywords = set(chunk.text.lower() for chunk in jd_doc.noun_chunks if len(chunk.text) > 3)
            jd_keywords.update(ent.text.lower() for ent in jd_doc.ents if len(ent.text) > 2)

            text_lower = normalize_tech_terms(full_text)
            norm_jd_keywords = set(normalize_tech_terms(kw) for kw in jd_keywords)
            matches = [kw for kw in norm_jd_keywords if kw in text_lower]
            missing = list(norm_jd_keywords - set(matches))

            analysis["matches"] = sorted(set(matches))
            analysis["missing"] = sorted(missing)

            coverage = len(matches) / len(jd_keywords) if jd_keywords else 0
            jd_bonus = coverage * 5
            skill_matches = sum(1 for s in skills_list if s.lower() in jd_text.lower())
            jd_bonus += min(skill_matches, 5)

            pts_skills = min(base_skill_score + jd_bonus, 20)
        except Exception as e:
            print(f"NLP Error: {e}")
            pts_skills = base_skill_score
    else:
        pts_skills = base_skill_score

    pts_skills = round(pts_skills, 2)
    score += pts_skills
    breakdown["skills"] = {"score": pts_skills, "max": 20, "detail": f"{len(skills_list)} skills"}

    # — 3. Projects (15pts max) —
    projects = extracted.get('project_count', 0)
    pts_proj = min(projects * 5, 15)
    score += pts_proj
    breakdown["projects"] = {"score": pts_proj, "max": 15, "detail": f"{projects} detected"}

    # — 4. CGPA (10pts max) —
    cgpa = extracted.get('cgpa', 0.0)
    if 0 < cgpa <= 4.0:
        pts_cgpa = round(min(cgpa * 2.5, 10), 2)
    elif 0 < cgpa <= 10.0:
        pts_cgpa = round(min(cgpa, 10), 2)
    else:
        pts_cgpa = 0
    score += pts_cgpa
    breakdown["cgpa"] = {"score": pts_cgpa, "max": 10, "detail": f"CGPA {cgpa}"}

    # — 5. Quantifiable Achievements (10pts max) —
    achievements = extracted.get('achievement_count', 0)
    pts_ach = min(achievements * 2, 10)
    score += pts_ach
    breakdown["achievements"] = {"score": pts_ach, "max": 10, "detail": f"{achievements} detected"}

    # — 6. Work Experience (5pts max) —
    exp_years = extracted.get('experience_years', 0)
    exp_entries = extracted.get('experience_count', 0)
    pts_exp = round(max(min(exp_years * 2.5, 5), min(exp_entries * 1.25, 5)), 2)
    score += pts_exp
    breakdown["experience"] = {"score": pts_exp, "max": 5, "detail": f"{exp_years}yrs / {exp_entries} entries"}

    # — 7. Extra-curricular (5pts max) —
    extra = extracted.get('extra_count', 0)
    pts_extra = round(min(extra * 1.25, 5), 2)
    score += pts_extra
    breakdown["extra_curricular"] = {"score": pts_extra, "max": 5, "detail": f"{extra} activities"}

    # — 8. Language Fluency (3pts max) —
    langs = extracted.get('language_count', 0)
    pts_lang = round(min(langs * 1.0, 3), 2)
    score += pts_lang
    breakdown["languages"] = {"score": pts_lang, "max": 3, "detail": f"{langs} languages"}

    # — 9. Online Presence (3pts max) —
    links = extracted.get('link_count', 0)
    pts_links = round(min(links * 1.5, 3), 2)
    score += pts_links
    breakdown["online_presence"] = {"score": pts_links, "max": 3, "detail": f"{links} profiles"}

    # — 10. Degree Type (3pts) —
    degree_pts = extracted.get('degree_score', 0)
    score += degree_pts
    degree_labels = {3: "Postgraduate", 2: "Undergraduate", 1: "Diploma", 0: "Not found"}
    breakdown["degree"] = {"score": degree_pts, "max": 3, "detail": degree_labels.get(degree_pts, "N/A")}

    # — 11. College Ranking (2pts) —
    college_pts = extracted.get('college_tier_score', 0)
    score += college_pts
    tier_labels = {2: "Tier 1", 1: "Tier 2", 0: "Not ranked"}
    breakdown["college_rank"] = {"score": college_pts, "max": 2, "detail": tier_labels.get(college_pts, "N/A")}

    # — 12. School Marks (2pts max) —
    school_pts = extracted.get('school_marks_score', 0)
    score += school_pts
    breakdown["school_marks"] = {"score": round(school_pts, 2), "max": 2, "detail": f"{round(school_pts/2*100)}% avg" if school_pts else "Not found"}

    # — 13. Hackathon & Competitive Coding (5pts max) —
    hack_count = extracted.get('hackathon_count', 0)
    pts_hack = min(hack_count * 5, 5)
    score += pts_hack
    breakdown["hackathons"] = {"score": pts_hack, "max": 5, "detail": f"{hack_count} keywords"}

    # Scale base score (which maps up to 103 max now) to 100
    scaled_score = (score / 103.0) * 100 if score > 0 else 0
    total = round(min(scaled_score, 100), 2)
    return total, analysis, breakdown

def generate_hireability_summary_fallback(score: float, analysis: dict, breakdown: dict) -> str:
    """Generate a pseudo-LLM hireability summary based on the parsed data."""
    if score >= 80:
        intro = "Exceptional candidate with a highly competitive profile."
    elif score >= 60:
        intro = "Strong candidate demonstrating solid technical foundations."
    elif score >= 40:
        intro = "Average candidate with potential, though some core areas lack depth."
    else:
        intro = "Candidate profile is currently below recommended enterprise standards."
    
    technical_note = ""
    matches = analysis.get("matches", [])
    if analysis.get("jd_present"):
        if len(matches) > 5:
            technical_note = f" Shows excellent JD alignment, particularly in {', '.join(matches[:3])}."
        elif len(matches) > 0:
            technical_note = f" Exhibits partial role alignment (matched {len(matches)} key requirements)."
        else:
            technical_note = " Lacks direct alignment with the provided Job Description."

    proj_pts = breakdown.get("projects", {}).get("score", 0)
    if proj_pts > 10:
        proj_note = " Their strong project portfolio is a significant asset."
    else:
        proj_note = ""
        
    hack_pts = breakdown.get("hackathons", {}).get("score", 0)
    hack_note = " Demonstrated active hackathon/competitive participation." if hack_pts > 0 else ""

    return f"{intro}{technical_note}{proj_note}{hack_note}"

async def generate_hireability_summary_llm(score: float, analysis: dict, breakdown: dict, jd_present: bool = False) -> str:
    if not groq_client:
        return generate_hireability_summary_fallback(score, analysis, breakdown)
    
    try:
        if jd_present:
            prompt = f"""
            You are an elite technical recruiter AI evaluating a candidate against a specific Job Description.
            Candidate ATS Score: {score}/100.
            Projects Score: {breakdown.get('projects', {}).get('score')}/{breakdown.get('projects', {}).get('max')}.
            Matched Job Requirements: {', '.join(analysis.get('matches', []))}
            Missing Job Requirements: {', '.join(analysis.get('missing', [])[:10])}
            
            Write a concise, punchy 2-sentence hireability summary for this candidate highlighting how well they fit the JD. 
            Focus specifically on their critical matches and glaring missing requirements. Do NOT use jargon like 'score breakdown' or 'points'. 
            Be objective and slightly critical like a senior engineering manager.
            """
        else:
            prompt = f"""
            You are an elite technical recruiter AI evaluating a candidate's general profile.
            Candidate ATS Score: {score}/100.
            Projects Score: {breakdown.get('projects', {}).get('score')}/{breakdown.get('projects', {}).get('max')}.
            Hackathon Score: {breakdown.get('hackathons', {}).get('score')}/{breakdown.get('hackathons', {}).get('max')}.
            
            Write a concise, punchy 2-sentence hireability summary for this candidate. 
            Focus on their overall strengths, technical depth, and general potential. Do NOT use jargon like 'score breakdown' or 'points'. 
            Be objective and slightly critical like a senior engineering manager.
            """
        
        chat_completion = await groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a concise technical recruiter AI."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=100,
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq API Error: {e}")
        return generate_hireability_summary_fallback(score, analysis, breakdown)

async def generate_interview_questions_llm(analysis: dict, resume_skills: list, jd_present: bool = False) -> list:
    if not groq_client:
        return ["Could you describe your most challenging recent project?", "How do you stay updated with new technologies?"]
        
    try:
        if jd_present:
            prompt = f"""
            You are a senior technical interviewer. I am giving you the semantic gap analysis between a candidate's resume and our Job Description.
            Candidate possesses these matching skills: {', '.join(analysis.get('matches', []))}
            Candidate is MISSING these required skills from the JD: {', '.join(analysis.get('missing', [])[:10])}
            
            Generate EXACTLY 3 targeted, highly-technical interview questions to assess this candidate. 
            Focus at least one question on probing their knowledge of the 'missing' skills (to see if they can learn them or have adjacent knowledge), and the others to deeply validate their 'matched' skills.
            Format the output strictly as a valid JSON array of 3 strings. Example: ["Question 1?", "Question 2?", "Question 3?"]
            """
        else:
            prompt = f"""
            You are a senior technical interviewer. I am giving you a list of skills extracted from a candidate's resume.
            Candidate Skills: {', '.join(resume_skills[:20])}
            
            Generate EXACTLY 3 targeted, highly-technical interview questions to assess this candidate based largely on their highlighted skills.
            Format the output strictly as a valid JSON array of 3 strings. Example: ["Question 1?", "Question 2?", "Question 3?"]
            """
            
        chat_completion = await groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an expert technical interviewer that ONLY outputs raw valid JSON arrays of strings."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.4,
            max_tokens=250,
            response_format={"type": "json_object"}
        )
        
        # Parse JSON output
        content = chat_completion.choices[0].message.content.strip()
        # Fallback regex if it wraps in a dict instead of array like {"questions": [...]}
        try:
             import json
             parsed = json.loads(content)
             if isinstance(parsed, list):
                 return parsed[:3]
             elif isinstance(parsed, dict):
                 # Try to extract the first list found in values
                 for val in parsed.values():
                     if isinstance(val, list):
                         return val[:3]
             return ["Could you elaborate on the skills mentioned in your resume?"]
        except:
             return ["Could you elaborate on the skills mentioned in your resume?"]
             
    except Exception as e:
        print(f"Groq Questions Error: {e}")
        return ["Could you describe your most challenging recent project?", "How do you approach problem solving?"]

async def generate_soft_skills_llm(text: str) -> dict:
    if not groq_client:
        return {"soft_skills": ["Teamwork", "Communication"], "culture_fit": 75}
        
    try:
        snippet = text[:4000] # Limit to avoid exceeding tokens
        prompt = f"""
        You are an expert HR organizational psychologist. Analyze the following candidate resume text:
        ---
        {snippet}
        ---
        Extract EXACTLY 4 to 6 key 'Soft Skills' or cultural attributes implied by their experience, summary, and achievements (e.g. Leadership, Cross-functional Communication, Grit, Autonomous Problem Solving).
        Also, assign a realistic 'Culture Fit' score from 1 to 100 representing their readiness for a fast-paced, modern software engineering team.
        Format your response STRICTLY as a valid JSON object matching this schema:
        {{
            "soft_skills": ["skill 1", "skill 2", "skill 3"],
            "culture_fit_score": 85
        }}
        """
        
        chat_completion = await groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You output only valid JSON objects."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=150,
            response_format={"type": "json_object"}
        )
        
        import json
        content = chat_completion.choices[0].message.content.strip()
        parsed = json.loads(content)
        
        # Validate soft_skills list
        skills = parsed.get("soft_skills", [])
        if not isinstance(skills, list):
            skills = ["Problem Solving", "Communication"]
            
        # Validate culture fit score
        cf_score = parsed.get("culture_fit_score", 80)
        if not isinstance(cf_score, (int, float)):
            cf_score = 80
            
        return {
            "soft_skills": skills[:6],
            "culture_fit": int(cf_score)
        }
    except Exception as e:
        print(f"Groq Soft Skills Error: {e}")
        return {"soft_skills": ["Problem Solving", "Collaboration"], "culture_fit": 80}

def extract_github_stats(username: str) -> dict:
    """Synchronously fetches GitHub user stats to avoid adding external dependencies."""
    stats = {"repos": 0, "followers": 0, "verified": False}
    if not username:
        return stats
    url = f"https://api.github.com/users/{username}"
    req = urllib.request.Request(url, headers={'User-Agent': 'RankSense-AI/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode())
            stats["repos"] = data.get("public_repos", 0)
            stats["followers"] = data.get("followers", 0)
            stats["verified"] = True
    except urllib.error.URLError:
        pass # Rate limited or network error
    return stats

import hashlib

async def process_resume_task(file_content: bytes, filename: str, jd_text: str = "", user_id: str = "anonymous"):
    file_hash = hashlib.sha256(file_content + jd_text.encode('utf-8')).hexdigest()
    
    # Cache check
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute("SELECT data_json FROM candidates WHERE file_hash=? AND user_id=?", (file_hash, user_id))
        row = c.fetchone()
        conn.close()
        if row:
            await manager.broadcast(f"> CACHE HIT: Skip re-processing. Fetched {filename} from neural cache.")
            await asyncio.sleep(0.3)
            await manager.broadcast(f"COMPLETE_JSON:{row[0]}")
            return
    except Exception as e:
        print(f"Cache Error: {e}")

    await manager.broadcast(f"> Processing started for: {filename}")
    
    # Simulate processing time
    await asyncio.sleep(1) 
    
    full_text = ""
    try:
        # Determine file type
        if filename.lower().endswith(".pdf"):
            import io
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                 full_text = "\n".join([page.extract_text() or "" for page in pdf.pages])
                 
                 # Extract embedded hyperlinks
                 hyperlinks = []
                 for page in pdf.pages:
                     if page.hyperlinks:
                         for hl in page.hyperlinks:
                             if hl.get('uri'):
                                 hyperlinks.append(hl['uri'])
                 if hyperlinks:
                     full_text += "\n" + "\n".join(hyperlinks)
                     
            with open("DEBUG_LAST_RESUME.txt", "w", encoding="utf-8") as f:
                 f.write(full_text)
        elif filename.lower().endswith(".docx"):
            import io
            doc = docx.Document(io.BytesIO(file_content))
            full_text = "\n".join([p.text for p in doc.paragraphs])
        elif filename.lower().endswith(".txt"):
            full_text = file_content.decode("utf-8")
        else:
             await manager.broadcast(f"> ERROR: Unsupported format {filename}")
             return

        await manager.broadcast(f"> DEBUG: Extracted {len(full_text)} characters.")
        if len(full_text) < 50:
             await manager.broadcast("> WARNING: Minimal text found.")
    except Exception as e:
        await manager.broadcast(f"> Error extracting {filename}: {str(e)}")
        return

    extracted = extract_structured_data(full_text)
    personal_info = extract_personal_info(full_text)

    score, analysis, score_breakdown = calculate_candidate_score(extracted, full_text, jd_text)
    
    jd_present = bool(jd_text.strip())
    hireability_summary = await generate_hireability_summary_llm(score, analysis, score_breakdown, jd_present)
    interview_questions = await generate_interview_questions_llm(analysis, extracted['skills'], jd_present)
    soft_skills_data = await generate_soft_skills_llm(full_text)

    github_user = extracted.get('github_username')
    github_stats = {"repos": 0, "followers": 0, "verified": False}
    if github_user:
        try:
            github_stats = await asyncio.to_thread(extract_github_stats, github_user)
            if github_stats['verified']:
                await manager.broadcast(f"> PORTFOLIO_VERIFIED: @{github_user} [{github_stats['repos']} repos | {github_stats['followers']} followers]")
        except Exception:
            pass

    await manager.broadcast(f"> CANDIDATE_ANALYZED: {personal_info.get('name', 'Candidate')} | {len(extracted['skills'])} skills detected.")
    await manager.broadcast(f"> PROJECTS_DETECTED: {extracted['project_count']}")
    await manager.broadcast(f"> EXPERIENCE: {extracted['experience_count']} ROLES | INTERNSHIPS: {extracted['internship_count']}")
    await manager.broadcast(f"> CULTURE_FIT_SCORE: {soft_skills_data.get('culture_fit', 0)}/100")
    if jd_text:
        await manager.broadcast(f"> JD_MATCH: {len(analysis['matches'])} technical requirements matched.")
    await manager.broadcast(f"> FINAL_EVALUATION_SCORE: {score}/100")
    github_verified = False
    if github_user:
        github_verified = await verify_github(github_user)

    # Final payload for frontend
    breakdown = {
        "id": None, # assigned by caller if needed
        "filename": filename,
        "name": personal_info['name'],
        "email": personal_info['email'],
        "phone": personal_info['phone'],
        "location": personal_info['location'],
        "score": score,
        "skills_count": len(extracted['skills']),
        "skills": extracted['skills'],
        "internships": extracted['internship_count'],
        "projects": extracted['project_count'],
        "cgpa": extracted['cgpa'],
        "experience": extracted['experience_count'],
        "raw_text": full_text,
        "jd_present": bool(jd_text),
        "jd_analysis": analysis,
        "score_breakdown": score_breakdown,
        "hireability_summary": hireability_summary,
        "interview_questions": interview_questions,
        "soft_skills": soft_skills_data.get("soft_skills", []),
        "culture_fit": soft_skills_data.get("culture_fit", 0),
        "github_stats": github_stats,
        "github_username": github_user,
        "github_verified": github_verified,
        "file_hash": file_hash
    }
    
    # Save to Database with user isolation and PDF Blob
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute("DELETE FROM candidates WHERE filename=? AND user_id=?", (filename, user_id))
        
        pdf_blob = None
        if filename.lower().endswith(('.pdf', '.doc', '.docx')):
            pdf_blob = file_content
            
        c.execute("INSERT INTO candidates (filename, score, data_json, user_id, file_hash, raw_pdf) VALUES (?, ?, ?, ?, ?, ?)",
                  (filename, score, json.dumps(breakdown), user_id, file_hash, pdf_blob))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")
    
    await manager.broadcast(f"COMPLETE_JSON:{json.dumps(breakdown)}")

@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/candidates")
def get_candidates(x_user_id: str = Header(default="anonymous")):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT data_json FROM candidates WHERE user_id=? ORDER BY score DESC", (x_user_id,))
    rows = c.fetchall()
    conn.close()
    return [json.loads(row['data_json']) for row in rows]

@app.get("/shared/{file_hash}")
def get_shared_candidate(file_hash: str):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT data_json FROM candidates WHERE file_hash=?", (file_hash,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return json.loads(row['data_json'])

@app.get("/shared_pdf/{file_hash}")
def get_shared_pdf(file_hash: str):
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute("SELECT raw_pdf, filename FROM candidates WHERE file_hash=?", (file_hash,))
        row = c.fetchone()
        conn.close()
        
        if row and row[0]:
            filename = row[1]
            content_type = "application/pdf"
            if filename.lower().endswith(".doc"):
                content_type = "application/msword"
            elif filename.lower().endswith(".docx"):
                content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            
            return Response(content=row[0], media_type=content_type)
        else:
            return Response(content="File not found or no PDF saved.", status_code=404)
    except Exception as e:
        return Response(content=f"Database error: {str(e)}", status_code=500)


@app.delete("/candidates")
def clear_candidates(x_user_id: str = Header(default="anonymous")):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM candidates WHERE user_id=?", (x_user_id,))
    conn.commit()
    conn.close()
    return {"message": "User candidates cleared"}

@app.get("/user_stats")
def get_user_stats(user_id: str = "anonymous"):
    from datetime import date
    today = str(date.today())
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT daily_uploads, last_upload_date, tier FROM users WHERE clerk_id=?", (user_id,))
    row = c.fetchone()
    conn.close()
    if not row or row[1] != today:
        return {"daily_uploads": 0, "tier": "free"}
    return {"daily_uploads": row[0], "tier": row[2]}

class EmailRequest(BaseModel):
    name: str
    type: str # 'accept' or 'reject'
    matched_skills: List[str]
    missing_skills: List[str]
    jd_present: bool

@app.post("/generate_email")
async def generate_email(req: EmailRequest):
    if not groq_client:
        return {"email": f"Dear {req.name},\n\nThank you for your application. We will be in touch shortly.\n\nBest,\nTalentScout AI Team"}
        
    try:
        if req.type == "accept":
            prompt = f"""
            You are a senior technical recruiter writing an enthusiastic follow-up email to a candidate named {req.name}.
            We want to invite them to the next round of interviews.
            Highlight that we were impressed with their following skills: {', '.join(req.matched_skills[:5])}
            Keep it professional, encouraging, and under 150 words.
            """
        else:
            if req.jd_present and req.missing_skills:
                prompt = f"""
                You are a senior technical recruiter writing a polite, constructive rejection email to a candidate named {req.name}.
                We are not moving forward because they lack some key skills for this specific role, explicitly: {', '.join(req.missing_skills[:3])}.
                Mention those specific missing skills constructively so they know what to learn. 
                Keep it professional, empathetic, and under 150 words.
                """
            else:
                prompt = f"""
                You are a senior technical recruiter writing a polite, standard rejection email to a candidate named {req.name}.
                Keep it professional, empathetic, and under 100 words.
                """
                
        chat_completion = await groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an expert technical recruiter who writes professional emails. Do not include placeholders like [Your Name]. Sign off as 'TalentScout AI Team'."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.4,
            max_tokens=250,
        )
        return {"email": chat_completion.choices[0].message.content.strip()}
    except Exception as e:
        print(f"Groq Email Error: {e}")
        return {"email": f"Dear {req.name},\n\nThank you for your application. We will be in touch shortly.\n\nBest,\nTalentScout AI Team"}

class ChatRequest(BaseModel):
    name: str
    raw_text: str
    question: str

@app.post("/chat")
async def chat_with_resume(req: ChatRequest):
    if not groq_client:
        return {"answer": "I am offline. Please connect my API key."}
        
    try:
        prompt = f"""
        You are an AI assistant helping a recruiter analyze a candidate named {req.name}.
        Answer the following question based ONLY on the provided resume snippet. If the answer is not in the text, say you don't know based on the resume. Keep it very conversational, concise, and professional. Let the recruiter know exactly what the resume says about their query.

        Resume Text:
        ---
        {req.raw_text[:8000]}
        ---

        Recruiter Question: {req.question}
        """
        
        chat_completion = await groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful AI recruiting assistant."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.2,
            max_tokens=200,
        )
        return {"answer": chat_completion.choices[0].message.content.strip()}
    except Exception as e:
        print(f"Groq Chat Error: {e}")
        return {"answer": f"Error contacting AI: {str(e)}"}

class JDRequest(BaseModel):
    prompt: str

@app.post("/generate_jd")
async def generate_jd(req: JDRequest):
    if not groq_client:
        return {"jd": "I am offline. Please connect my API key to use the AI JD Generator."}
        
    try:
        sys_prompt = "You are an expert HR Manager. Write a highly professional, tech-focused Job Description based on the user's short prompt. Include: 1) Job Title 2) A short 2-sentence summary 3) 5-7 exact technical skills required. Format it cleanly without markdown headers, just plain text with line breaks."
        
        chat_completion = await groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": f"Write a job description for: {req.prompt}"}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=300,
        )
        return {"jd": chat_completion.choices[0].message.content.strip()}
    except Exception as e:
        print(f"Groq JD Generator Error: {e}")
        return {"jd": f"Error contacting AI: {str(e)}"}

# ─────────────────────────────────────────────────────
# Comprehensive skill taxonomy (expandable)
# ─────────────────────────────────────────────────────
SKILLS_TAXONOMY = [
    # Programming Languages
    "python", "java", "c", "c++", "c#", "javascript", "typescript", "go", "golang",
    "rust", "swift", "kotlin", "r", "matlab", "scala", "ruby", "php", "dart",
    # Web
    "html", "css", "react", "angular", "vue", "node.js", "express", "django",
    "flask", "fastapi", "next.js", "bootstrap", "tailwind",
    # Data / ML / AI
    "sql", "mysql", "postgresql", "mongodb", "sqlite", "machine learning",
    "deep learning", "nlp", "computer vision", "pandas", "numpy", "matplotlib",
    "seaborn", "scikit-learn", "pytorch", "tensorflow", "keras", "opencv",
    "huggingface", "transformers", "llm", "langchain",
    # Cloud / DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "linux", "git", "github",
    "ci/cd", "jenkins", "terraform", "ansible", "bash", "shell",
    # Data Engineering
    "spark", "hadoop", "kafka", "airflow", "etl", "snowflake", "bigquery",
    # Security / Networking
    "cybersecurity", "networking", "tcp/ip", "penetration testing",
    # Certifications (common keywords)
    "aws certified", "google certified", "azure certified", "pmp", "ccna",
    "comptia", "gcp certified"
]

# Known spoken/natural languages
LANGUAGE_KEYWORDS = [
    "english", "hindi", "french", "spanish", "german", "mandarin", "chinese",
    "japanese", "arabic", "portuguese", "russian", "italian", "korean",
    "bengali", "tamil", "telugu", "marathi", "kannada", "gujarati"
]

# Tier-1 institutions (comprehensive lists)
TIER_1_COLLEGES = [
    "indian institute of technology", "iit ", "iit-", "iitb", "iitd", "iitm", "iitk", "iitr", "iitg", "iith", "iiti",
    "bits pilani", "bits hyderabad", "bits goa", "birla institute of technology and science",
    "iiit hyderabad", "iiit bangalore", "iiit delhi", "iiit allahabad", "international institute of information technology",
    "nit trichy", "nit warangal", "nit surathkal", "nit calicut", "national institute of technology",
    "ism dhanbad", "iiser", "iisc", "indian institute of science", "dtu", "delhi technological university", "nsit", "nsut"
]

TIER_2_COLLEGES = [
    "nit ", "nit-", "iiit ", "vit ", "vellore institute", "srm ", "manipal institute", "amity", "lpu",
    "thapar", "pec ", "punjab engineering college", "bmsce", "rvce", "ms ramaiah", "pes university",
    "daiict", "lnmiit", "vjti", "coep", "college of engineering pune"
]

async def verify_github(username: str) -> bool:
    """Checks if a GitHub username exists via public API."""
    if not username: return False
    url = f"https://api.github.com/users/{username}"
    try:
        # Using a standard User-Agent to avoid blocks
        req = urllib.request.Request(url, headers={'User-Agent': 'TalentScout-AI-Bot'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False


def extract_personal_info(text):
    """
    Extracts personal details: name, email, phone, location.
    Uses regex patterns + NLP NER for name detection.
    """
    first_line = text.strip().split('\n')[0].strip()
    # Check if name is squashed (e.g. ShashankTomar) and break it up if possible
    name = re.sub(r'([a-z])([A-Z])', r'\1 \2', first_line) if first_line else "Candidate"
    if len(name) > 40: # Sanity check for extremely long first string
        name = "Candidate"

    info = {"name": "", "email": "", "phone": "", "location": ""}

    # Email
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}', text)
    if email_match:
        info["email"] = email_match.group(0)

    # Phone (Indian/International formats)
    phone_match = re.search(
        r'(?:\+91[\s\-]?)?(?:\(?\d{3,5}\)?[\s\-]?)?\d{3}[\s\-]?\d{4,5}', text
    )
    if phone_match:
        info["phone"] = phone_match.group(0).strip()

    # Location (common Indian cities + generic pattern)
    cities = [
        "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "chennai",
        "kolkata", "pune", "ahmedabad", "jaipur", "surat", "lucknow",
        "kanpur", "nagpur", "noida", "gurgaon", "gurugram", "indore",
        "bhopal", "patna", "chandigarh", "kochi", "coimbatore"
    ]
    text_lower = text.lower()
    for city in cities:
        if city in text_lower:
            info["location"] = city.title()
            break

    # Name — try spaCy PERSON entity first, then fallback to first title-case line
    invalid_name_words = ["ai", "developer", "engineer", "resume", "curriculum", "vitae", "generative", "machine", "learning", "data", "scientist"]
    
    if nlp:
        try:
            doc = nlp(text[:500])  # scan first 500 chars
            for ent in doc.ents:
                if ent.label_ == "PERSON" and 2 <= len(ent.text.split()) <= 4:
                    ent_text = ent.text.strip().title()
                    # Filter out common false positives
                    if not any(word in ent_text.lower() for word in invalid_name_words):
                        info["name"] = ent_text
                        break
        except Exception:
            pass

    # Fallback: first non-empty line that looks like a name (Title Case, short)
    if not info["name"]:
        for line in text.split('\n')[:10]:
            line = line.strip()
            if (2 <= len(line.split()) <= 4 and
                    line.replace(' ', '').isalpha() and
                    line == line.title() and
                    len(line) < 50):
                if not any(word in line.lower() for word in invalid_name_words):
                    info["name"] = line
                    break

    return info


def extract_structured_data(text):

    """
    Extracts all structured fields from raw resume text.
    Designed to feed into calculate_candidate_score.
    """
    text_lower = text.lower()

    # ── 1. Skills & Certifications ──────────────────────────────────────────
    found_skills = list(set(skill for skill in SKILLS_TAXONOMY if skill in text_lower))

    # ── 2. Internships ───────────────────────────────────────────────────────
    # Use word-boundary to avoid "international", "internal", etc.
    # Count unique internship entries (look for date patterns nearby)
    intern_patterns = re.findall(
        r'\b(intern(?:ship)?(?:\s+\w+){0,4})\b',
        text_lower
    )
    # Additionally look for a dedicated INTERNSHIP section header
    has_intern_section = bool(re.search(
        r'(?:^|\n)\s*internship[s]?\s*[:\-–]?\s*\n', text_lower
    ))
    # Combine: unique mentions via regex + 1 if section header found
    internship_count = len(intern_patterns)
    if has_intern_section and internship_count == 0:
        internship_count = 1
    internship_count = min(internship_count, 10)  # sanity cap

    # ── 3. Projects ──────────────────────────────────────────────────────────
    # Line-by-line project section parser — works regardless of whitespace/encoding
    SECTION_KWS = re.compile(
        r'^(education|experience|skills|work\s+experience|certif|awards|'
        r'languages|achievements|contact|summary|objective|profile|'
        r'extracurricular|extra.curricular|training|courses|honours|hobbies|'
        r'activities|publications|references|specialized\s+interests)\b',
        re.IGNORECASE
    )
    PROJ_HEADER = re.compile(
        r'^(?:.{0,30}\s)?(?:high[\s\-]*impact\s*|academic\s*|personal\s*|technical\s*|key\s*|notable\s*)?projects?\s*:?\s*$',
        re.IGNORECASE
    )
    text_lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    proj_start_li = None
    for li, line in enumerate(text_lines):
        stripped = line.strip()
        if PROJ_HEADER.search(stripped): # Use search instead of match for more flexibility
            proj_start_li = li + 1
            break

    if proj_start_li is not None:
        # Collect lines until the next recognized section header or 50 lines max
        section_lines = []
        for line in text_lines[proj_start_li: proj_start_li + 50]:
            stripped = line.strip()
            if not stripped:
                continue
            # Stop at a new section keyword or a short all-caps line (like "EDUCATION")
            if SECTION_KWS.match(stripped):
                # asyncio.run_coroutine_threadsafe(manager.broadcast(f"> DEBUG: Stopped at keyword {stripped}"), asyncio.get_event_loop())
                break
            if stripped.isupper() and 3 < len(stripped) < 40 and "PROJECT" not in stripped:
                break
            section_lines.append(stripped)
        # Count lines that look like project TITLES (usually has | or : or just a short capitalized line)
        # and ignore lines that are clearly descriptions (starting with bullets)
        entries = []
        for l in section_lines:
            # If it's a bullet point or starts with "•", it's a description, skip
            if re.match(r'^[-\u2022\u2013\u25ba\u25b8\*]|^\d+[\s\.\)]|^•', l):
                continue
            # If it looks like a title (contains separator or is relatively short and capitalized or camelCased)
            if '|' in l or ':' in l or (len(l) < 80 and (any(char.isupper() for char in l) or l.istitle())):
                entries.append(l)
        
        project_count = len(entries)
        if project_count == 0 and section_lines:
            # Fallback: if no clear titles but section has content, try counting bullet chunks
            bullet_chunks = len([l for l in section_lines if re.match(r'^[-\u2022\u2013\u25ba\u25b8\*]', l)])
            project_count = max(1, bullet_chunks // 2) # Assume 2 bullets per project on average

        # Secondary check: judge from action verbs (1 project per 2-3 verbs)
        action_verbs = re.findall(
            r'\b(?:developed|built|created|designed|implemented|engineered|deployed|architected|automated|integrated|utilized|orchestrated|optimized|authored)\b',
            text_lower
        )
        titled_matches = re.findall(
            r'(?:project|app|system|tool|platform|website|bot|model|framework|module|agent)\s*[:\-]\s*[A-Z]',
            text, re.IGNORECASE
        )
        verb_count = max(len(titled_matches), len(action_verbs) // 3)
        project_count = max(project_count, verb_count)
        if project_count == 0 and action_verbs:
            project_count = 1
    else:
        # No section found: Fallback to action verbs only
        action_verbs = re.findall(
            r'\b(?:developed|built|created|designed|implemented|engineered|deployed|architected|automated|integrated|utilized|orchestrated|optimized|authored)\b',
            text_lower
        )
        titled_matches = re.findall(
            r'(?:project|app|system|tool|platform|website|bot|model|framework|module|agent)\s*[:\-]\s*[A-Z]',
            text, re.IGNORECASE
        )
        project_count = max(len(titled_matches), len(action_verbs) // 3)
        if project_count == 0 and action_verbs:
            project_count = 1
    project_count = min(project_count, 10)  # sanity cap



    # ── 4. CGPA / GPA ────────────────────────────────────────────────────────
    cgpa = 0.0
    # Context-aware: must have cgpa/gpa/score/marks keyword nearby
    cgpa_patterns = [
        r'(?:cgpa|c\.g\.p\.a|gpa|g\.p\.a)[\s:/-]*([0-9]+(?:\.[0-9]{1,2})?)',
        r'([0-9]+(?:\.[0-9]{1,2})?)\s*(?:/\s*10|out\s*of\s*10)',
        r'([0-9]+(?:\.[0-9]{1,2})?)\s*(?:/\s*4|out\s*of\s*4)'
    ]
    for pat in cgpa_patterns:
        m = re.search(pat, text_lower)
        if m:
            val = float(m.group(1))
            if 0 < val <= 10:
                cgpa = val
                break

    # ── 5. School Marks (10th / 12th) ────────────────────────────────────────
    school_marks = []  # collect percentages/cgpa near school keywords
    school_pattern = re.findall(
        r'(?:10th|x(?:th)?|ssc|hsc|12th|xii(?:th)?|class\s*12|class\s*10|secondary|higher secondary)[^\n]{0,60}?([0-9]{2,3}(?:\.[0-9]{1,2})?)',
        text_lower
    )
    school_marks = [float(m) for m in school_pattern if 30 <= float(m) <= 100]

    # School marks score (2pts max): avg if present
    if school_marks:
        avg_marks = sum(school_marks) / len(school_marks)
        school_marks_score = round(min(avg_marks / 50, 2), 2)  # 100% → 2pts
    else:
        school_marks_score = 0.0  # no hardcoding — must be found

    # ── 6. Links & Online Presence ───────────────────────────────────────────
    link_count = 0
    if 'github.com' in text_lower or 'github' in text_lower:
        link_count += 1
    if 'linkedin.com' in text_lower or 'linkedin' in text_lower:
        link_count += 1
    if re.search(r'(?:portfolio|website|personal site)[:\s]+https?://', text_lower):
        link_count += 1

    # ── 7. Degree Type ────────────────────────────────────────────────────────
    # 3pts for postgrad, 2pts for undergrad, 1pt for diploma/associate, 0 for nothing
    if any(x in text_lower for x in ['m.tech', 'm.e.', 'mtech', 'master of technology',
                                      'mca', 'mba', 'm.sc', 'm.s.', 'phd', 'ph.d', 'master']):
        degree_score = 3
    elif any(x in text_lower for x in ['b.tech', 'b.e.', 'btech', 'bachelor of technology',
                                        'b.sc', 'b.s.', 'bca', 'bba', 'bachelor', 'b.e']):
        degree_score = 2
    elif any(x in text_lower for x in ['diploma', 'associate', 'polytechnic']):
        degree_score = 1
    else:
        degree_score = 0

    # ── 8. College Ranking ────────────────────────────────────────────────────
    if any(t in text_lower for t in TIER_1_COLLEGES):
        college_tier_score = 2
    elif any(t in text_lower for t in TIER_2_COLLEGES):
        college_tier_score = 1
    else:
        college_tier_score = 0

    # ── 9. Quantifiable Achievements ─────────────────────────────────────────
    # Must have both an achievement keyword AND a number (ranks, %, positions etc.)
    achievement_keywords = [
        r'\b(?:won|winner|first|second|third|1st|2nd|3rd|rank(?:ed)?|award(?:ed)?|scholarship|merit|topper|top\s*\d+|placed\s*\d+|finalist)\b'
    ]
    quant_number = r'\b\d+\b'
    ach_count = 0
    for pat in achievement_keywords:
        hits = re.findall(pat, text_lower)
        ach_count += len(hits)
    # Bonus: quantified achievement (number nearby an achievement keyword)
    quant_achievements = re.findall(
        r'(?:won|awarded|ranked|top|placed|\d+(?:st|nd|rd|th)\s+(?:rank|place|position))',
        text_lower
    )
    ach_count = max(ach_count, len(quant_achievements))
    ach_count = min(ach_count, 5)  # cap at 5

    # ── 9.5 Hackathon & Competitive Coding (Wow Feature) ────────────────────
    hackathon_keywords = [
        r'\bhackathon\b', r'\bleetcode\b', r'\bcodeforces\b',
        r'\bcodechef\b', r'\bcompetitive programming\b', r'\bhackerearth\b'
    ]
    hack_count = sum(1 for kw in hackathon_keywords if re.search(kw, text_lower))
    
    # Also detect GitHub username from links
    github_username = None
    gh_match = re.search(r'github\.com/([a-zA-Z0-9-]+)', text_lower)
    if gh_match:
        github_username = gh_match.group(1)
            
    # Fallback to search any part of the text for a valid GitHub username including URLs
    if not github_username:
        gh_match = re.search(r'github\.com/([a-zA-Z0-9_\-]+)', text, re.IGNORECASE)
        if gh_match:
            github_username = gh_match.group(1)
            
    # Clean trailing slashes or URL fragments
    if github_username:
        github_username = github_username.split('/')[0].strip()

    # ── 10. Work Experience (not internship) ──────────────────────────────────
    # Extract years of experience
    exp_years_matches = re.findall(
        r'(\d+(?:\.\d+)?)\s*(?:\+)?\s*year[s]?\s*(?:of)?\s*(?:work|professional|industry|full.?time)?\s*experience',
        text_lower
    )
    experience_years = sum(float(y) for y in exp_years_matches) if exp_years_matches else 0.0

    # Count experience section entries (non-intern)
    exp_section_match = re.search(
        r'(?:^|\n)\s*(?:work\s+experience|professional\s+experience|employment|experience)\s*[:\-–]?\s*\n(.*?)(?:\n\s*[A-Z][A-Z ]{3,}\s*\n|$)',
        text, re.IGNORECASE | re.DOTALL
    )
    experience_count = 0
    if exp_section_match:
        sec = exp_section_match.group(1)
        entries = re.findall(r'(?:^|\n)\s*(?:[\•\-\*\d\.]|[A-Z][a-zA-Z ]{2,40}(?:Inc|Ltd|Corp|Pvt|Technologies|Solutions|Systems)?\b)', sec)
        experience_count = len(entries)

    # ── 11. Extra-Curricular ──────────────────────────────────────────────────
    extra_patterns = [
        'volunteer', 'volunteering', 'community service', 'nss', 'ncc',
        'club member', 'club head', 'cultural', 'sports', 'captain', 'treasurer',
        'secretary', 'organizer', 'organized', 'event', 'hackathon participant',
        'tech fest', 'college fest', 'coordinator'
    ]
    extra_count = sum(1 for kw in extra_patterns if kw in text_lower)
    extra_count = min(extra_count, 8)  # cap

    # ── 12. Language Fluency ─────────────────────────────────────────────────
    found_languages = [lang for lang in LANGUAGE_KEYWORDS if lang in text_lower]
    language_count = len(found_languages) if found_languages else 0

    return {
        "skills":             found_skills,
        "internship_count":   internship_count,
        "project_count":      project_count,
        "cgpa":               cgpa,
        "school_marks_score": school_marks_score,
        "achievement_count":  ach_count,
        "hackathon_count":    hack_count,
        "github_username":    github_username,
        "experience_years":   experience_years,
        "experience_count":   experience_count,
        "extra_count":        extra_count,
        "language_count":     language_count,
        "link_count":         link_count,
        "degree_score":       degree_score,
        "college_tier_score": college_tier_score,
        "raw_text_snippet":   text[:500] + "..."
    }

@app.post("/upload")
async def process_resume(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    jd_text: Optional[str] = Form(None),
    x_user_id: str = Header(default="anonymous")
):
    # Read file content to pass to background task (file object closes after request)
    file_content = await file.read()
    
    background_tasks.add_task(process_resume_task, file_content, file.filename, jd_text or "", x_user_id)
    
    return {"message": "Processing started", "filename": file.filename}

from fastapi.responses import Response

@app.get("/pdf/{file_hash}")
def get_pdf_by_hash(file_hash: str):
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute("SELECT raw_pdf, filename FROM candidates WHERE file_hash=?", (file_hash,))
        row = c.fetchone()
        conn.close()
        
        if row and row[0]:
            filename = row[1]
            content_type = "application/pdf"
            if filename.lower().endswith(".doc"):
                content_type = "application/msword"
            elif filename.lower().endswith(".docx"):
                content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            
            return Response(content=row[0], media_type=content_type)
        else:
            return Response(content="File not found or no PDF saved in DB.", status_code=404)
    except Exception as e:
        return Response(content=f"Database error: {str(e)}", status_code=500)
