"use client";
import { useState } from "react";

const CANDIDATES = [
  { name: "Priya Sharma", role: "Full Stack Dev", initials: "PS", color: "var(--cyan)", score: 91, rank: 1, location: "Bangalore", cgpa: "9.2", internships: 3, projects: 5, skills: ["React", "Python", "Docker", "Node.js", "PostgreSQL"], breakdown: { Internships: [18, 20], Skills: [18, 20], Projects: [13, 15], CGPA: [9, 10], Achievements: [8, 10], GitHub: [8, 10] } },
  { name: "Arjun Kumar", role: "ML Engineer", initials: "AK", color: "#a78bfa", score: 84, rank: 2, location: "Hyderabad", cgpa: "8.8", internships: 2, projects: 6, skills: ["PyTorch", "TensorFlow", "Python", "MLOps", "K8s"], breakdown: { Internships: [13, 20], Skills: [17, 20], Projects: [14, 15], CGPA: [8, 10], Achievements: [7, 10], GitHub: [6, 10] } },
  { name: "Nisha Patel", role: "Data Analyst", initials: "NP", color: "var(--amber)", score: 72, rank: 3, location: "Mumbai", cgpa: "7.9", internships: 1, projects: 3, skills: ["SQL", "Tableau", "Python", "Excel"], breakdown: { Internships: [8, 20], Skills: [14, 20], Projects: [9, 15], CGPA: [7, 10], Achievements: [5, 10], GitHub: [4, 10] } },
  { name: "Rahul Gupta", role: "Backend Dev", initials: "RG", color: "var(--emerald)", score: 65, rank: 4, location: "Pune", cgpa: "7.2", internships: 1, projects: 2, skills: ["Java", "Spring Boot", "MySQL"], breakdown: { Internships: [7, 20], Skills: [12, 20], Projects: [7, 15], CGPA: [6, 10], Achievements: [3, 10], GitHub: [3, 10] } },
  { name: "Sara Mehta", role: "DevOps Engineer", initials: "SM", color: "var(--rose)", score: 48, rank: 5, location: "Delhi", cgpa: "6.5", internships: 0, projects: 2, skills: ["Linux", "Bash", "AWS"], breakdown: { Internships: [0, 20], Skills: [10, 20], Projects: [7, 15], CGPA: [4, 10], Achievements: [2, 10], GitHub: [2, 10] } },
];

function scoreColor(s: number) {
  return s >= 80 ? "var(--emerald)" : s >= 60 ? "var(--amber)" : "var(--rose)";
}

export default function DemoPreview() {
  const [active, setActive] = useState(0);
  const c = CANDIDATES[active];

  return (
    <section id="demo" style={{ padding: "120px 60px", background: "radial-gradient(ellipse at center, rgba(6,182,212,0.05), transparent 70%)" }}>
      <div className="container">
        <p className="section-label reveal">Interactive Demo</p>
        <h2 className="section-title reveal reveal-d1">See it rank.<br />In real time.</h2>
        <div className="reveal reveal-d2" style={{ marginTop: 50, borderRadius: 24, overflow: "hidden", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
          {/* Fake browser bar */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)" }}>
            {["#F43F5E", "#F59E0B", "#10B981"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-mono)", marginLeft: 8 }}>TalentScout AI — Dashboard</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: 440 }}>
            {/* Sidebar */}
            <div style={{ borderRight: "1px solid var(--border)", padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "var(--font-mono)" }}>Candidates (5/25)</div>
              {CANDIDATES.map((cd, i) => (
                <div key={i} onClick={() => setActive(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", transition: "background 0.2s", background: active === i ? "rgba(6,182,212,0.08)" : "transparent", border: `1px solid ${active === i ? "rgba(6,182,212,0.2)" : "transparent"}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, background: `${cd.color}22`, color: cd.color, flexShrink: 0 }}>{cd.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cd.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{cd.role}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 600, color: scoreColor(cd.score) }}>{cd.score}</div>
                </div>
              ))}
            </div>
            {/* Main panel */}
            <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800 }}>{c.name}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {[c.role, `📍 ${c.location}`, `🎓 ${c.cgpa} CGPA`, `💼 ${c.internships} Internship${c.internships !== 1 ? "s" : ""}`, `🚀 ${c.projects} Projects`].map((m, i) => (
                      <span key={i} style={{ padding: "3px 10px", borderRadius: 100, fontSize: "0.7rem", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{m}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 800, color: scoreColor(c.score), lineHeight: 1 }}>{c.score}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>/ 100 · Rank #{c.rank}</div>
                </div>
              </div>
              {/* Skills */}
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "var(--font-mono)" }}>Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {c.skills.map(s => <span key={s} style={{ padding: "4px 12px", borderRadius: 100, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", fontSize: "0.75rem", color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>{s}</span>)}
                </div>
              </div>
              {/* Breakdown */}
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: "var(--font-mono)" }}>Score Breakdown</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {Object.entries(c.breakdown).map(([k, [val, max]]) => (
                    <div key={k} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{k}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 600, color: scoreColor((val / max) * 100) }}>{val}<span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>/{max}</span></div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 8 }}>
                        <div style={{ height: "100%", width: `${(val / max) * 100}%`, borderRadius: 2, background: "linear-gradient(90deg, var(--cyan), var(--violet))" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                {[{ label: "✓ Hire", bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.3)", color: "var(--emerald)" }, { label: "✕ Pass", bg: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.2)", color: "var(--rose)" }, { label: "✉ Draft Email", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.25)", color: "#a78bfa" }].map(a => (
                  <button key={a.label} style={{ padding: "9px 20px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, fontFamily: "var(--font-body)", background: a.bg, border: `1px solid ${a.border}`, color: a.color, transition: "opacity 0.2s" }}>{a.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
