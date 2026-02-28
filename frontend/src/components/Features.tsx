"use client";
const FEATURES = [
  { icon: "🔬", title: "LLM Extraction", desc: "Groq's llama-3.1-8b converts unstructured resume text into clean JSON fields — skills, CGPA, internships, projects, achievements — with hallucination guards.", tag: "llama-3.1-8b", tagColor: "var(--cyan)", tagBg: "rgba(6,182,212,0.08)", tagBorder: "rgba(6,182,212,0.2)", iconBg: "rgba(6,182,212,0.1)" },
  { icon: "🐙", title: "GitHub Verification", desc: "Auto-detects GitHub usernames from resumes, queries the API to verify repos, commit frequency, and stars — cross-checking claimed technical skills.", tag: "GitHub API", tagColor: "#a78bfa", tagBg: "rgba(124,58,237,0.1)", tagBorder: "rgba(124,58,237,0.25)", iconBg: "rgba(124,58,237,0.1)" },
  { icon: "📋", title: "JD Matching", desc: "Paste a job description and scores recalculate with keyword alignment. Missing skills highlighted. Matching skills boosted. Context-aware ranking.", tag: "Smart Match", tagColor: "var(--emerald)", tagBg: "rgba(16,185,129,0.08)", tagBorder: "rgba(16,185,129,0.25)", iconBg: "rgba(16,185,129,0.1)" },
  { icon: "💬", title: "RAG Chat", desc: "Ask any question about any candidate — \"Does Priya have Docker experience?\" — answers grounded in resume text via a full RAG pipeline.", tag: "RAG Pipeline", tagColor: "var(--amber)", tagBg: "rgba(245,158,11,0.08)", tagBorder: "rgba(245,158,11,0.25)", iconBg: "rgba(245,158,11,0.1)" },
  { icon: "✉️", title: "Email Drafting", desc: "One-click generation of personalized accept or reject emails. Tone adjustable. References specific resume highlights. Ready to send.", tag: "AI Draft", tagColor: "var(--rose)", tagBg: "rgba(244,63,94,0.08)", tagBorder: "rgba(244,63,94,0.2)", iconBg: "rgba(244,63,94,0.1)" },
  { icon: "📡", title: "Live Processing Logs", desc: "WebSocket-powered real-time log stream shows every extraction step as it happens. Full transparency into the pipeline — not a black box.", tag: "WebSocket", tagColor: "var(--cyan)", tagBg: "rgba(6,182,212,0.08)", tagBorder: "rgba(6,182,212,0.2)", iconBg: "rgba(6,182,212,0.1)" },
];

export default function Features() {
  return (
    <section id="features" style={{ padding: "120px 60px", background: "rgba(124,58,237,0.03)" }}>
      <div className="container">
        <p className="section-label reveal">Capabilities</p>
        <h2 className="section-title reveal reveal-d1">More than ranking.<br />A full hiring brain.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 60 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className={`reveal reveal-d${(i % 3) + 1}`} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, position: "relative", overflow: "hidden", transition: "all 0.3s" }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "rgba(6,182,212,0.25)"; el.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "var(--border)"; el.style.transform = ""; }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: f.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", marginBottom: 16 }}>{f.icon}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.65 }}>{f.desc}</div>
              <div style={{ display: "inline-block", marginTop: 14, padding: "3px 10px", borderRadius: 100, fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: f.tagColor, background: f.tagBg, border: `1px solid ${f.tagBorder}` }}>{f.tag}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
