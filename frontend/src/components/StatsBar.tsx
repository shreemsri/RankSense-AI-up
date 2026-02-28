"use client";
const STATS = [
  { val: "25+", label: "Resumes per batch" }, { val: "95%", label: "Extraction accuracy" },
  { val: "1.8s", label: "Avg per resume" }, { val: "12", label: "Scoring dimensions" },
  { val: "100", label: "Max possible score" }, { val: "0", label: "Manual intervention" },
  { val: "PDF/DOCX", label: "All formats" }, { val: "GitHub", label: "Profile verified" },
];

export default function StatsBar() {
  const items = [...STATS, ...STATS];
  return (
    <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "18px 0", overflow: "hidden", background: "rgba(6,182,212,0.03)" }}>
      <div style={{ display: "flex", width: "max-content", animation: "ticker 22s linear infinite" }}>
        {items.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 48px", fontSize: "0.85rem", color: "var(--muted)", whiteSpace: "nowrap", borderRight: "1px solid var(--border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)", fontWeight: 600, fontSize: "1rem" }}>{s.val}</span>
            {s.label}
          </div>
        ))}
      </div>
      <style>{`@keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }`}</style>
    </div>
  );
}
