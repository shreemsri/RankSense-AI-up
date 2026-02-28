"use client";
const TECHS = ["Python 3.12", "FastAPI", "SQLite WAL", "SpaCy NER", "PyMuPDF", "pdfplumber", "python-docx", "Groq API", "llama-3.1-8b", "Next.js 15", "TypeScript", "Tailwind CSS", "Three.js", "Framer Motion", "Clerk Auth", "WebSocket", "GitHub API", "RAG Pipeline"];

export default function TechStack() {
  return (
    <section id="stack" style={{ padding: "80px 60px", textAlign: "center" }}>
      <div className="container">
        <p className="section-label reveal">Built With</p>
        <h2 className="section-title reveal reveal-d1">Production-grade stack.<br />Hackathon speed.</h2>
        <div className="reveal reveal-d2" style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 50, maxWidth: 700, marginLeft: "auto", marginRight: "auto" }}>
          {TECHS.map(t => (
            <span key={t} className="tech-pill" style={{ padding: "8px 18px", borderRadius: 100, background: "var(--surface)", border: "1px solid var(--border)", fontSize: "0.82rem", fontFamily: "var(--font-mono)", fontWeight: 500, transition: "all 0.2s", display: "inline-block" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "rgba(6,182,212,0.4)"; (e.target as HTMLElement).style.color = "var(--cyan)"; (e.target as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; (e.target as HTMLElement).style.color = ""; (e.target as HTMLElement).style.transform = ""; }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
