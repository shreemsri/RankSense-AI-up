"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Mail, MessageSquare, Sparkles, Activity, Check, X,
  FileText, Zap
} from "lucide-react";
import { API_URL, Candidate } from "@/lib/api";

const BREAKDOWN_LABELS: Record<string, string> = {
  internships: "Internships", skills: "Skills/Certs", projects: "Projects",
  cgpa: "CGPA", achievements: "Achievements", hackathons: "Hackathons",
  experience: "Experience", extra_curricular: "Extra-Curricular",
  languages: "Language Fluency", online_presence: "Online Presence",
  degree: "Degree Type", college_rank: "College Ranking", school_marks: "School Marks",
};

export default function SharedCandidatePage() {
  const { hash } = useParams() as { hash: string };
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfView, setPdfView] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/shared/${hash}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setCandidate(data);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [hash]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[var(--cyan)]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="w-6 h-6 border-2 border-[var(--cyan)] border-t-transparent rounded-full animate-spin relative z-10" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-8 text-center text-[var(--muted)]">
        <FileText className="w-12 h-12 mb-4 opacity-20" />
        <h1 className="text-xl text-white mb-2">Analysis Not Found</h1>
        <p className="text-sm">The shared link may be invalid or has expired.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-[var(--font-body)] flex flex-col items-center">
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[var(--cyan)]/5 blur-[150px] pointer-events-none z-0" />

      {/* Main Container */}
      <div className={`relative z-10 w-full ${pdfView ? "max-w-[1400px]" : "max-w-[800px]"} transition-[max-width] duration-500 min-h-screen flex flex-col bg-[rgba(3,7,18,0.6)] backdrop-blur-3xl border-x border-[rgba(255,255,255,0.03)] shadow-2xl overflow-hidden`}>

        {/* Header */}
        <div className="flex items-start justify-between p-8 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] shrink-0">
          <div>
            <div className="flex gap-2 items-center mb-1">
              <div className="w-2 h-2 rounded-full bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)] animate-pulse" />
              <span className="text-[10px] font-mono text-[var(--cyan)] uppercase tracking-wider font-bold">TalentScout Shared Report</span>
            </div>
            <h2 className="font-[var(--font-display)] font-extrabold text-3xl text-[var(--text)] drop-shadow-md mt-2">
              {candidate.name || candidate.filename}
            </h2>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--cyan)] to-[#38BDF8] drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] leading-none">{candidate.score}</span>
              <span className="text-sm font-[var(--font-mono)] text-[var(--muted)]">/ 100 System Score</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-end">
            <button onClick={() => setPdfView(!pdfView)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-xs font-[var(--font-mono)] font-bold uppercase tracking-wider ${pdfView ? "bg-[rgba(6,182,212,0.15)] text-[var(--cyan)] border-[var(--cyan)]/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-[rgba(255,255,255,0.03)] text-[var(--muted)] border-[rgba(255,255,255,0.05)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]"}`}>
              <FileText className="w-4 h-4" />
              {pdfView ? "Hide Original PDF" : "View Original PDF"}
            </button>
          </div>
        </div>

        {/* Body Split */}
        <div className={`flex-1 flex overflow-hidden min-h-0 ${pdfView ? "flex-col md:flex-row" : "flex-col"}`}>

          {/* PDF Viewer Pane */}
          {pdfView && (
            <div className="w-full md:w-1/2 border-r border-[rgba(255,255,255,0.05)] bg-[#0d131f] flex flex-col h-[50vh] md:h-auto shrink-0 z-20">
              <div className="bg-[rgba(0,0,0,0.2)] px-5 py-3 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2 text-xs font-[var(--font-mono)] text-[var(--muted)] uppercase tracking-widest shrink-0">
                <FileText className="w-3.5 h-3.5 text-[var(--cyan)]" /> Original Document Render
              </div>
              <iframe
                src={`${API_URL}/shared_pdf/${hash}`}
                className="flex-1 w-full h-full border-none"
                title="Resume PDF Viewer"
              />
            </div>
          )}

          {/* Analysis Pane */}
          <div className={`flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar ${pdfView ? "md:w-1/2 w-full" : "w-full"}`}>

            {/* Contact info */}
            {(candidate.email || candidate.phone || candidate.location) && (
              <div className="flex flex-wrap gap-5 text-sm font-[var(--font-mono)] text-[var(--muted)] bg-[rgba(255,255,255,0.01)] p-5 rounded-xl border border-[rgba(255,255,255,0.03)] focus-within:border-[var(--cyan)]/30 transition-colors">
                {candidate.email && <div className="flex items-center gap-2.5"><Mail className="w-4 h-4 text-[var(--cyan)]" /> <span>{candidate.email}</span></div>}
                {candidate.phone && <div className="flex items-center gap-2.5"><span>📱</span> <span>{candidate.phone}</span></div>}
                {candidate.location && <div className="flex items-center gap-2.5"><span>📍</span> <span>{candidate.location}</span></div>}
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Internships", val: candidate.internships, glow: "rgba(6,182,212,0.2)" },
                { label: "Projects", val: candidate.projects, glow: "rgba(124,58,237,0.2)" },
                { label: "Skills", val: candidate.skills_count, glow: "rgba(16,185,129,0.2)" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-5 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, ${s.glow} 0%, transparent 70%)` }} />
                  <p className="text-4xl font-[var(--font-display)] font-bold text-white relative z-10 drop-shadow-md">{s.val}</p>
                  <p className="text-[10px] font-[var(--font-mono)] text-[var(--muted)] uppercase tracking-widest mt-1.5 relative z-10">{s.label}</p>
                </div>
              ))}
            </div>

            {/* AI Summary */}
            {candidate.hireability_summary && (
              <div className="relative rounded-2xl p-6 border border-[var(--violet)]/30 bg-[rgba(124,58,237,0.05)] shadow-[inset_0_0_20px_rgba(124,58,237,0.1)]">
                <div className="absolute -top-3 left-6 bg-[rgba(3,7,18,1)] px-3 rounded">
                  <p className="text-[10px] font-[var(--font-mono)] text-[var(--violet)] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> AI Synthesis Report
                  </p>
                </div>
                <p className="text-[15px] text-[var(--text)]/90 leading-relaxed font-medium mt-2">{candidate.hireability_summary}</p>
              </div>
            )}

            {/* Score breakdown Matrix */}
            {candidate.score_breakdown && (
              <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#030712] overflow-hidden relative shadow-[inset_0_2px_15px_rgba(0,0,0,1)]">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--cyan)]/10 blur-[40px] pointer-events-none" />

                <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between relative z-10">
                  <p className="text-[10px] font-[var(--font-mono)] font-bold text-[var(--cyan)] uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Classification Matrix
                  </p>
                </div>

                <div className="p-6 space-y-5 relative z-10">
                  {Object.entries(candidate.score_breakdown).map(([k, v], i) => {
                    const pct = Math.min((v.score / v.max) * 100, 100);
                    const color = i % 3 === 0 ? 'var(--cyan)' : i % 3 === 1 ? 'var(--violet)' : 'var(--emerald)';
                    return (
                      <div key={k} className="group relative">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[11px] font-[var(--font-mono)] text-white/80 uppercase tracking-wider">{BREAKDOWN_LABELS[k] || k}</span>
                          <span className="text-sm font-[var(--font-display)] font-bold text-white transition-all">
                            {v.score} <span className="text-[10px] text-[var(--muted)] font-[var(--font-mono)]">/ {v.max}</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#0d131f] rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] outline outline-1 outline-[rgba(255,255,255,0.05)]">
                          <div
                            className="h-full rounded-full relative transition-[width] duration-1000 ease-out"
                            style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                          />
                        </div>
                        <p className="text-[10px] font-[var(--font-mono)] text-[var(--muted)] mt-2 line-clamp-2">
                          <span className="text-[var(--cyan)] opacity-50 mr-1.5">&gt;</span>{v.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* JD Analysis */}
            {candidate.jd_analysis?.jd_present && (
              <div className="rounded-2xl p-6 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] space-y-5">
                <div className="text-[11px] font-[var(--font-mono)] font-bold text-white/50 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" /> JD Gap Analysis
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <p className="text-[10px] text-[var(--emerald)] mb-3 font-bold flex items-center gap-2"><Check className="w-4 h-4" /> MATCHED CORE</p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.jd_analysis.matches.map((m) => (
                        <span key={m} className="text-[10px] font-[var(--font-mono)] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[var(--emerald)] px-3 py-1.5 rounded shadow-[0_0_8px_rgba(16,185,129,0.1)]">{m}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--rose)] mb-3 font-bold flex items-center gap-2"><X className="w-4 h-4" /> MISSING CORE</p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.jd_analysis.missing.slice(0, 15).map((m) => (
                        <span key={m} className="text-[10px] font-[var(--font-mono)] bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.3)] text-[var(--rose)] px-3 py-1.5 rounded shadow-[0_0_8px_rgba(244,63,94,0.1)]">{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GitHub Presence */}
            {candidate.github_username && (
              <div className="rounded-2xl p-6 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                  {candidate.github_verified ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[10px] font-bold text-[var(--emerald)] shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <Check className="w-3.5 h-3.5" /> VERIFIED PROFILE
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-[var(--muted)]/40 uppercase tracking-tighter">UNVERIFIED PROFILE</div>
                  )}
                </div>

                <p className="text-[11px] font-[var(--font-mono)] text-[var(--muted)] uppercase tracking-widest mb-4">GitHub Presence</p>
                <a href={`https://github.com/${candidate.github_username}`} target="_blank" rel="noreferrer"
                  className="text-[var(--cyan)] hover:text-[var(--violet)] text-xl font-bold transition-all flex items-center gap-2 group-hover:translate-x-1">
                  @{candidate.github_username}
                  <Zap className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>

                {candidate.github_stats && (
                  <div className="flex gap-6 mt-4 text-[11px] font-[var(--font-mono)] text-[var(--muted)]/80">
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" /> {candidate.github_stats.repos} Repositories</span>
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--violet)]" /> {candidate.github_stats.followers} Followers</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
