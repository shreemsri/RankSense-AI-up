"use client";
import Link from "next/link";
import { Check, ShieldAlert, Sparkles } from "lucide-react";

const TIERS = [
  { name: "Free Link", price: "$0", period: "forever", featured: false, features: ["3 resume uploads / day", "Full scoring & ranking", "Basic extraction", "Score breakdown view"], cta: "Start Free", href: "/login", ctaStyle: "outline" },
  { name: "Pro Matrix", price: "$19", period: "per month", featured: true, badge: "Most Popular", features: ["Unlimited uploads", "JD matching & scoring", "GitHub verification", "Email drafting (AI)", "RAG chat", "Interview questions"], cta: "Upgrade to Pro", href: "/login", ctaStyle: "solid" },
  { name: "Enterprise Auth", price: "Custom", period: "contact us", featured: false, features: ["API access", "Custom scoring weights", "Bulk batch processing", "HRMS integration", "Dedicated support"], cta: "Contact Sales", href: "mailto:hello@talentscout.ai", ctaStyle: "outline" },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 relative overflow-hidden bg-[var(--bg)]">
      {/* Background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20 animate-[fadeUp_0.8s_ease_both]">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(124,58,237,0.05)] border border-[rgba(124,58,237,0.2)] text-[10px] font-[var(--font-mono)] text-[var(--violet)] mb-6 shadow-[0_0_15px_rgba(124,58,237,0.1)]">
            <ShieldAlert className="w-3 h-3" />
            <span>AUTHORIZATION LEVELS</span>
          </div>
          <h2 className="font-[var(--font-display)] text-4xl md:text-5xl font-bold text-white mb-6">
            Start Free. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--cyan)] to-[var(--violet)]">Scale Neural.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {TIERS.map((t, i) => (
            <div key={i} className={`relative group animate-[fadeUp_0.8s_ease_both] rounded-3xl p-8 transition-all duration-500
              ${t.featured
                ? "bg-[rgba(3,7,18,0.8)] border border-[rgba(6,182,212,0.4)] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(6,182,212,0.1)] md:-translate-y-4 hover:-translate-y-6"
                : "bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.03)] hover:-translate-y-2"}
            `} style={{ animationDelay: `${i * 0.15}s` }}>

              {/* Featured Glow */}
              {t.featured && (
                <div className="absolute inset-0 bg-gradient-to-b from-[var(--cyan)]/5 to-transparent rounded-3xl pointer-events-none" />
              )}

              {t.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-[10px] font-bold text-white tracking-widest uppercase shadow-[0_0_20px_rgba(124,58,237,0.5)] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> {t.badge}
                </div>
              )}

              <div className="mb-8">
                <div className="font-[var(--font-mono)] text-[11px] text-[var(--cyan)] uppercase tracking-widest mb-4">{t.name}</div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-[var(--font-display)] text-5xl font-extrabold text-white">{t.price}</span>
                </div>
                <div className="text-sm text-[var(--muted)]">{t.period}</div>
              </div>

              <ul className="space-y-4 mb-10">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm text-[var(--muted)] hover:text-white transition-colors">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${t.featured ? "text-[var(--cyan)] drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" : "text-white/30"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={t.href}
                className={`block w-full py-4 rounded-xl text-sm font-semibold text-center transition-all duration-300 relative overflow-hidden group/btn
                  ${t.ctaStyle === "solid"
                    ? "bg-[linear-gradient(135deg,var(--cyan),var(--violet))] text-white hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]"
                    : "bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(6,182,212,0.4)]"}
                `}>
                <span className="relative z-10">{t.cta}</span>
                {t.ctaStyle === "solid" && <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
