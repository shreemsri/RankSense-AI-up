export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "40px 60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}>TalentScout AI</div>
      <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        Built for <span style={{ color: "var(--cyan)" }}>Techknowledge Edusearch</span> · Problem Statement <span style={{ color: "var(--cyan)" }}>AI-PS-1</span>
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>© 2025 TalentScout AI</div>
    </footer>
  );
}
