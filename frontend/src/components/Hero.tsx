import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Sparkles, BrainCircuit, Activity } from "lucide-react";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

function ScoreWidget() {
  const [score, setScore] = useState(0);
  useEffect(() => {
    let val = 0;
    const iv = setInterval(() => {
      val += 2; if (val >= 91) { val = 91; clearInterval(iv); }
      setScore(val);
    }, 25);
    return () => clearInterval(iv);
  }, []);

  const pct = (score / 100) * 163;
  return (
    <div className="animate-[floatY_4s_ease-in-out_infinite] hidden lg:block">
      <div className="bg-[rgba(3,7,18,0.6)] backdrop-blur-2xl border border-[rgba(6,182,212,0.3)] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(6,182,212,0.1)] p-5 rounded-2xl min-w-[220px]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--cyan)]/20 blur-[30px] rounded-full pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <svg width="60" height="60" viewBox="0 0 64 64" className="drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
            <circle cx="32" cy="32" r="26" fill="none" stroke="url(#sg)" strokeWidth="4"
              strokeDasharray="163" strokeDashoffset={163 - pct} strokeLinecap="round"
              className="-rotate-90 origin-center transition-all duration-75" />
            <defs>
              <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--cyan)" /><stop offset="100%" stopColor="var(--violet)" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <div className="font-[var(--font-display)] text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--cyan)] to-white">{score}</div>
            <div className="text-[9px] font-[var(--font-mono)] text-[var(--muted)] uppercase tracking-widest mt-0.5">Neural Match</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] relative z-10">
          <div className="font-semibold text-sm text-white/90">Priya Sharma</div>
          <div className="inline-block mt-2 px-2.5 py-1 rounded-md bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.3)] text-[9px] text-[var(--cyan)] font-[var(--font-mono)] uppercase tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.1)]">
            #1 Ranked Candidate
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveWidget() {
  return (
    <div className="animate-[floatY_5s_1s_ease-in-out_infinite] hidden lg:block">
      <div className="bg-[rgba(3,7,18,0.6)] backdrop-blur-2xl border border-[rgba(124,58,237,0.3)] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(124,58,237,0.1)] p-5 rounded-2xl min-w-[220px]">
        {/* Glow */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-[var(--violet)]/20 blur-[30px] rounded-full pointer-events-none" />

        <div className="text-[9px] text-[var(--muted)] font-[var(--font-mono)] mb-3 uppercase tracking-widest flex items-center gap-2 relative z-10">
          <Activity className="w-3 h-3 text-[var(--violet)]" /> Live Stream
        </div>

        <div className="space-y-2.5 relative z-10">
          {[{ c: "var(--cyan)", t: "Vectorizing skills...", d: 0 }, { c: "var(--violet)", t: "Running JD Gap Analysis...", d: 0.4 }, { c: "var(--emerald)", t: "Deterministic Ranking...", d: 0.8 }].map((r, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: r.c, animation: `pulse 1.2s ${r.d}s infinite`, boxShadow: `0 0 8px ${r.c}` }} />
              <span className="text-xs text-white/70 font-medium">{r.t}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] relative z-10 flex justify-between items-end">
          <div>
            <div className="font-[var(--font-mono)] text-[10px] text-[var(--muted)]">25 Resumes</div>
            <div className="font-[var(--font-mono)] text-[11px] text-[var(--violet)] font-bold mt-0.5">Processed</div>
          </div>
          <div className="font-[var(--font-mono)] text-[10px] text-[var(--cyan)] bg-[rgba(6,182,212,0.1)] px-2 py-1 rounded">0.8s avg</div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background 3D Scene */}
      <div className="absolute inset-0 z-0 opacity-60"><HeroScene /></div>

      {/* Heavy gradient overlay to blend 3D with UI */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[var(--bg)]/80 to-[var(--bg)] pointer-events-none" />

      {/* Floaters */}
      <div className="absolute left-[5%] top-[45%] -translate-y-1/2 z-10"><LiveWidget /></div>
      <div className="absolute right-[8%] top-[50%] -translate-y-1/2 z-10"><ScoreWidget /></div>

      {/* Main Content */}
      <div className="relative z-20 text-center max-w-4xl px-6 mx-auto flex flex-col items-center">

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(6,182,212,0.05)] border border-[rgba(6,182,212,0.2)] text-[10px] font-[var(--font-mono)] text-[var(--cyan)] mb-8 animate-[fadeUp_0.6s_ease_both] shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <Sparkles className="w-3 h-3 animate-pulse" />
          <span>HACKATHON BUILD // AI-PS-1</span>
        </div>

        <h1 className="font-[var(--font-display)] text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 animate-[fadeUp_0.7s_0.1s_ease_both] drop-shadow-2xl">
          Resume Intelligence<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--cyan)] via-white to-[var(--violet)] drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]">
            at Neural Speed
          </span>
        </h1>

        <p className="text-base md:text-lg text-[var(--muted)] leading-relaxed max-w-2xl text-center mb-10 animate-[fadeUp_0.7s_0.2s_ease_both]">
          LLM-powered extraction, 12-factor scoring, and deterministic ranking for 25+ resumes in under 30 seconds. No bias. No guesswork. Just raw intelligence.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-[fadeUp_0.7s_0.3s_ease_both]">
          <Link href="/dashboard" className="group relative px-8 py-4 bg-[linear-gradient(135deg,var(--cyan),var(--violet))] rounded-xl font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(6,182,212,0.5)] overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <BrainCircuit className="w-5 h-5" /> Initialize Dashboard
            </span>
          </Link>

          <a href="#how" className="px-8 py-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-xl font-medium text-white transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(6,182,212,0.4)] hover:bg-[rgba(6,182,212,0.05)] text-center">
            View Live Telemetry
          </a>
        </div>
      </div>
    </section>
  );
}
