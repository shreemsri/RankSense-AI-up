"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { isSignedIn } = useUser();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "20px 60px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", background: scrolled ? "rgba(3,7,18,0.9)" : "rgba(3,7,18,0.6)", borderBottom: "1px solid var(--border)", transition: "background 0.3s" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 800, background: "linear-gradient(135deg, var(--cyan), var(--violet))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>
        Talent<span style={{ color: "var(--cyan)", WebkitTextFillColor: "var(--cyan)" }}>Scout</span> AI
      </div>
      <div style={{ display: "flex", gap: 36 }}>
        {[["#how", "How it Works"], ["#scoring", "Scoring"], ["#demo", "Demo"], ["#pricing", "Pricing"]].map(([href, label]) => (
          <a key={href} href={href} style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--muted)", textDecoration: "none", letterSpacing: "0.04em", textTransform: "uppercase" as const, transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>{label}</a>
        ))}
      </div>
      <Link href={isSignedIn ? "/dashboard" : "/login"} style={{ padding: "10px 24px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600, fontFamily: "var(--font-body)", background: "linear-gradient(135deg, var(--cyan), var(--violet))", color: "white", textDecoration: "none", transition: "opacity 0.2s, transform 0.2s" }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = ""; }}>
        {isSignedIn ? "Dashboard →" : "Get Started →"}
      </Link>
    </nav>
  );
}
