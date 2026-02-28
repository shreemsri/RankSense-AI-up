const API = "http://127.0.0.1:8000";
const WS = "ws://127.0.0.1:8000";

export const API_URL = API;
export const WS_URL = WS;

export interface Candidate {
  id?: number;
  file_hash?: string;
  name: string | null;
  filename: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  github_username: string | null;
  github_verified: boolean;
  github_stats: { verified: boolean; repos: number; followers: number } | null;
  score: number;
  skills: string[];
  skills_count: number;
  internships: number;
  projects: number;
  raw_text: string;
  hireability_summary: string | null;
  interview_questions: string[] | null;
  soft_skills: string[] | null;
  culture_fit: number | null;
  jd_present: boolean;
  jd_analysis: { jd_present: boolean; matches: string[]; missing: string[] } | null;
  score_breakdown: Record<string, { score: number; max: number; detail: string }> | null;
}

export async function fetchCandidates(userId: string): Promise<Candidate[]> {
  const res = await fetch(`${API}/candidates`, {
    headers: { "X-User-Id": userId },
  });
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

export async function deleteCandidates(userId: string): Promise<void> {
  await fetch(`${API}/candidates`, {
    method: "DELETE",
    headers: { "X-User-Id": userId },
  });
}

export async function uploadResume(file: File, jdText?: string, userId?: string): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  if (jdText) form.append("jd_text", jdText);
  if (userId) form.append("user_id", userId);
  const res = await fetch(`${API}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const err: any = new Error("Upload failed");
    err.status = res.status;
    throw err;
  }
}

export async function generateEmail(
  name: string,
  type: "accept" | "reject",
  matchedSkills: string[],
  missingSkills: string[],
  jdPresent: boolean
): Promise<string> {
  const res = await fetch(`${API}/generate_email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      type,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      jd_present: jdPresent,
    }),
  });
  const d = await res.json();
  return d.email;
}

export async function generateJD(prompt: string): Promise<string> {
  const res = await fetch(`${API}/generate_jd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const d = await res.json();
  return d.jd;
}

export async function chatWithResume(
  name: string,
  rawText: string,
  question: string
): Promise<string> {
  const res = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, raw_text: rawText, question }),
  });
  const d = await res.json();
  return d.answer;
}
