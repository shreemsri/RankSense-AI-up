"use client";
const STEPS = [
  { num: "01", icon: "📄", title: "Upload & Parse", desc: "Accepts PDF, DOC, DOCX. PyMuPDF + pdfplumber extract raw text from any layout — multi-column, scanned, or templated." },
  { num: "02", icon: "🧠", title: "NLP Extraction", desc: "SpaCy NER locates names and locations. Groq's llama-3.1-8b extracts skills, CGPA, projects, and internships as structured JSON." },
  { num: "03", icon: "⚖️", title: "Weighted Scoring", desc: "12 factors scored against PS-defined weights. Anti-overfitting rules prevent gaming. Max 100 points, always reproducible." },
  { num: "04", icon: "🏆", title: "Ranked Output", desc: "Candidates sorted deterministically. Ties broken by sub-score hierarchy. Every point justified by extracted evidence." },
];

export default function HowItWorks() {
  return (
    <section id="how" style={{ padding: "120px 60px", background: "linear-gradient(180deg, var(--bg) 0%, rgba(6,182,212,0.03) 50%, var(--bg) 100%)" }}>
      <div className="container">
        <p className="section-label reveal">Pipeline</p>
        <h2 className="section-title reveal reveal-d1">Four steps.<br />One ranked list.</h2>
        <p className="section-sub reveal reveal-d2">Our algorithmic pipeline converts unstructured documents into objective, reproducible candidate rankings — every time.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2, marginTop: 60, position: "relative" }}>
          <div style={{ position: "absolute", top: 40, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, var(--cyan), var(--violet), transparent)", zIndex: 0 }} />
          {STEPS.map((s, i) => (
            <div key={i} className={`reveal reveal-d${i + 1}`} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 24px", position: "relative", zIndex: 1, transition: "border-color 0.3s, transform 0.3s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.35)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--cyan)", fontWeight: 600, marginBottom: 20 }}>{s.num}</div>
              <div style={{ fontSize: "2rem", marginBottom: 14 }}>{s.icon}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
