"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  Upload, LogOut, Zap, X, Send, Copy, Check,
  FileText, Mail, MessageSquare, Sparkles, Trash2, Activity,
  ChevronDown, ChevronUp, Eye, EyeOff
} from "lucide-react";
import {
  Candidate, fetchCandidates, deleteCandidates,
  uploadResume, generateEmail, generateJD, chatWithResume,
  WS_URL, API_URL
} from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────
type ModalType = "email" | "chat" | null;

// ─── Score bar ───────────────────────────────────────────────────────────────
function ScoreBar({ score, max, label, detail }: { score: number; max: number; label: string; detail: string }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? "bg-green-400" : pct >= 50 ? "bg-yellow-400" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className="text-white/80 font-mono">{score}/{max} <span className="opacity-50">({detail})</span></span>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const BREAKDOWN_LABELS: Record<string, string> = {
  internships: "Internships", skills: "Skills/Certs", projects: "Projects",
  cgpa: "CGPA", achievements: "Achievements", hackathons: "Hackathons",
  experience: "Experience", extra_curricular: "Extra-Curricular",
  languages: "Language Fluency", online_presence: "Online Presence",
  degree: "Degree Type", college_rank: "College Ranking", school_marks: "School Marks",
};

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [logs, setLogs] = useState<string[]>(["> TalentScout AI ready."]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [jd, setJd] = useState("");
  const [jdGenerating, setJdGenerating] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [emailType, setEmailType] = useState<"accept" | "reject">("accept");
  const [emailLoading, setEmailLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pdfView, setPdfView] = useState(false);
  const [wsStatus, setWsStatus] = useState<"online" | "offline">("offline");
  const [logExpanded, setLogExpanded] = useState(true);
  const [processingCount, setProcessingCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // ── Auth guard + init ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) return; // Clerk middleware handles redirect
    load(user.id);
    connectWS(user.id);
  }, [isLoaded, user]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addLog = (msg: string) => setLogs((p) => [...p.slice(-80), msg]);

  const load = useCallback(async (userId: string) => {
    try {
      const data = await fetchCandidates(userId);
      setCandidates(data);
      if (data.length) addLog(`> Loaded ${data.length} candidates.`);
    } catch { addLog("! Backend offline — start the FastAPI server."); }
  }, []);

  const connectWS = useCallback((userId: string) => {
    try {
      const ws = new WebSocket(`${WS_URL}/ws/logs`);
      wsRef.current = ws;
      ws.onopen = () => { setWsStatus("online"); addLog("> Connected to server."); };
      ws.onclose = () => { setWsStatus("offline"); setTimeout(() => connectWS(userId), 4000); };
      ws.onmessage = (e) => {
        if (e.data.startsWith("COMPLETE_JSON:")) {
          setProcessingCount(p => Math.max(0, p - 1));
          const d: Candidate = JSON.parse(e.data.replace("COMPLETE_JSON:", ""));
          setCandidates((prev) => {
            const idx = prev.findIndex((c) => c.filename === d.filename);
            const next = idx !== -1 ? [...prev] : [...prev, d];
            if (idx !== -1) next[idx] = d;
            return next.sort((a, b) => b.score - a.score);
          });
        } else if (!e.data.startsWith("COMPLETE:")) {
          addLog(e.data);
        }
      };
    } catch { addLog("! WebSocket unavailable."); }
  }, []);

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const fileList = Array.from(files);
    setUploading(true);
    setProcessingCount(p => p + fileList.length);
    for (const f of fileList) {
      addLog(`> Uploading: ${f.name}`);
      try {
        await uploadResume(f, jd, user.id);
        addLog(`✓ Uploaded: ${f.name}`);
      } catch (err: any) {
        addLog(`! Failed: ${f.name}`);
        setProcessingCount(p => Math.max(0, p - 1));
      }
    }
    setUploading(false);
    setTimeout(() => load(user.id), 2000);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  // ── Email ───────────────────────────────────────────────────────────────────
  const openEmail = async (type: "accept" | "reject") => {
    if (!selected) return;
    setEmailType(type); setEmailLoading(true); setEmailContent(""); setModal("email");
    try {
      const txt = await generateEmail(
        selected.name || "Candidate", type,
        selected.jd_analysis?.matches || [],
        selected.jd_analysis?.missing || [],
        selected.jd_present
      );
      setEmailContent(txt);
    } catch { setEmailContent("Error generating email. Is the backend running?"); }
    setEmailLoading(false);
  };

  // ── Chat ────────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || !selected || chatLoading) return;
    const q = chatInput.trim(); setChatInput("");
    setChatMessages((p) => [...p, { role: "user" as const, text: q }]);
    setChatLoading(true);
    try {
      const ans = await chatWithResume(selected.name || "Candidate", selected.raw_text, q);
      setChatMessages((p) => [...p, { role: "ai" as const, text: ans }]);
    } catch { setChatMessages((p) => [...p, { role: "ai" as const, text: "Error: backend offline." }]); }
    setChatLoading(false);
  };

  // ── JD Generator ────────────────────────────────────────────────────────────
  const handleGenJD = async () => {
    const p = window.prompt("Describe the role (e.g. 'Senior React Developer at a fintech startup'):");
    if (!p) return;
    setJdGenerating(true);
    try { setJd(await generateJD(p)); } catch { setJd("Error generating JD."); }
    setJdGenerating(false);
  };

  // ── Purge ───────────────────────────────────────────────────────────────────
  const purge = async () => {
    if (!user || !window.confirm("Are you sure you want to clear all candidate data?")) return;
    await deleteCandidates(user.id); setCandidates([]); addLog("> All candidates cleared.");
  };

  const candidateName = (c: Candidate, rank: number) =>
    anonymousMode ? `Applicant ${String(rank).padStart(3, "0")}` : (c.name || c.filename);

  const signOutFn = () => signOut({ redirectUrl: "/" });

  if (!isLoaded || !user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[var(--cyan)]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="w-6 h-6 border-2 border-[var(--cyan)] border-t-transparent rounded-full animate-spin relative z-10" />
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex font-[var(--font-body)]">
        {/* ── SIDEBAR ── */}
        <aside className="w-[280px] shrink-0 border-r border-[rgba(255,255,255,0.05)] flex flex-col py-8 px-6 bg-[var(--surface)] backdrop-blur-3xl relative z-20">

          <div className="flex-1" />

          {/* User Profile Area */}
          <div className="mt-auto border-t border-[rgba(255,255,255,0.05)] pt-6 flex flex-col gap-4">
            <button onClick={() => setAnonymousMode(!anonymousMode)}
              className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all text-[10px] font-[var(--font-mono)] font-bold uppercase tracking-wider border
                ${anonymousMode
                  ? 'bg-[rgba(124,58,237,0.15)] text-[var(--violet)] border-[var(--violet)]/30 shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                  : 'bg-[rgba(255,255,255,0.02)] text-[var(--muted)] border-[rgba(255,255,255,0.05)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`}
            >
              {anonymousMode ? <><Eye className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Reveal Names</span></> : <><EyeOff className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Anonymous Mode</span></>}
            </button>

            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[linear-gradient(135deg,rgba(6,182,212,0.2),rgba(124,58,237,0.2))] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-sm font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                {(user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0] || "U").toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden min-w-0">
                <p className="text-sm font-bold text-[var(--text)] truncate">
                  {user.fullName || "TalentScout User"}
                </p>
                <p className="text-[10px] font-[var(--font-mono)] text-[var(--muted)] truncate">
                  {user.primaryEmailAddress?.emailAddress || ""}
                </p>
              </div>
            </div>

            <button onClick={signOutFn} className="w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-[10px] font-[var(--font-mono)] font-bold uppercase tracking-wider text-[var(--muted)] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:text-[var(--rose)] hover:border-[var(--rose)]/30 hover:bg-[rgba(244,63,94,0.05)] transition-all">
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <header className="border-b border-[rgba(255,255,255,0.03)] px-8 py-4 flex flex-wrap gap-4 items-center justify-between bg-[rgba(3,7,18,0.6)] backdrop-blur-2xl z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-[var(--cyan)] animate-pulse rounded-full shadow-[0_0_8px_var(--cyan)]" />
                <h1 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] cursor-default">
                  TalentScout<span className="opacity-50 text-[var(--cyan)]">.AI</span>
                </h1>
              </div>
              <div className="h-5 w-[1px] bg-[rgba(255,255,255,0.08)]" />
              <div className="flex items-center gap-2 text-[10px] font-[var(--font-mono)] text-[var(--muted)]">
                <span className="relative flex h-2 w-2">
                  {wsStatus === "online" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--emerald)] opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${wsStatus === "online" ? "bg-[var(--emerald)]" : "bg-[var(--rose)]"}`} />
                </span>
                {wsStatus === "online" ? "Connected" : "Offline"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {candidates.length > 0 && (
                <span className="text-xs text-[var(--text)] font-medium px-3 py-1.5 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.06)]">
                  {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
                </span>
              )}
              {candidates.length > 0 && (
                <button onClick={purge} className="text-xs text-[var(--rose)]/70 hover:text-[var(--rose)] px-3 py-1.5 rounded-lg hover:bg-[rgba(244,63,94,0.08)] transition-all flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Clear All Data
                </button>
              )}
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
              {/* ── ACTION BAR: JD (Step 1) + Upload (Step 2) ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Step 1: Job Description */}
                <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6 relative overflow-hidden group hover:border-[rgba(124,58,237,0.3)] transition-all duration-500">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--violet)] to-transparent opacity-30" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] flex items-center justify-center">
                        <span className="text-[10px] font-[var(--font-mono)] font-bold text-[var(--violet)]">1</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text)]">Job Description</h3>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5">Optional — improves skill matching</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleGenJD} disabled={jdGenerating}
                        className="text-[9px] font-[var(--font-mono)] font-bold text-[#030712] bg-[var(--violet)] px-2.5 py-1 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1 shadow-[0_0_12px_rgba(124,58,237,0.3)]">
                        <Sparkles className="w-3 h-3" /> {jdGenerating ? "Generating..." : "AI Generate"}
                      </button>
                      {jd && <button onClick={() => setJd("")} className="text-[9px] font-[var(--font-mono)] text-[var(--muted)] hover:text-white transition-colors px-2">Clear</button>}
                    </div>
                  </div>
                  <textarea
                    value={jd} onChange={(e) => setJd(e.target.value)}
                    placeholder="Paste a job description here to score resumes against specific requirements..."
                    className="w-full h-28 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.05)] rounded-xl text-xs p-4 text-[var(--text)] placeholder-[var(--muted)]/50 focus:outline-none focus:border-[var(--violet)]/50 resize-none leading-relaxed font-[var(--font-body)]"
                  />
                </div>

                {/* Step 2: Upload */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { setDragActive(false); onDrop(e); }}
                  onClick={() => fileRef.current?.click()}
                  className={`rounded-2xl border relative overflow-hidden transition-all duration-500 cursor-pointer group flex flex-col min-h-[200px] p-6
                  ${uploading
                      ? "bg-[rgba(6,182,212,0.05)] border-[rgba(6,182,212,0.4)] shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                      : dragActive
                        ? "bg-[rgba(6,182,212,0.08)] border-[rgba(6,182,212,0.5)] shadow-[0_0_40px_rgba(6,182,212,0.2)] scale-[1.02]"
                        : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.08)]"
                    }`}
                >
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--cyan)] to-transparent opacity-30" />
                  {uploading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="w-16 h-20 bg-white/5 border border-white/10 rounded-lg overflow-hidden relative shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        <div className="absolute top-2 left-2 right-4 h-1 bg-white/20 rounded" />
                        <div className="absolute top-5 left-2 right-6 h-1 bg-white/20 rounded" />
                        <div className="absolute top-8 left-2 right-8 h-1 bg-white/20 rounded" />
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-[var(--cyan)] shadow-[0_0_15px_rgba(6,182,212,1)] animate-[scan_1.5s_ease-in-out_infinite_alternate]" />
                      </div>
                      <p className="mt-4 text-[10px] font-[var(--font-mono)] text-[var(--cyan)] animate-pulse tracking-widest uppercase font-bold">Processing...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-6 h-6 rounded-full bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.3)] flex items-center justify-center">
                          <span className="text-[10px] font-[var(--font-mono)] font-bold text-[var(--cyan)]">2</span>
                        </div>
                        <h3 className="text-sm font-semibold text-[var(--text)]">Upload Resumes</h3>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[rgba(255,255,255,0.03)] group-hover:bg-[rgba(6,182,212,0.1)] transition-all group-hover:-translate-y-1">
                          <Upload className="w-6 h-6 text-[var(--muted)] group-hover:text-[var(--cyan)] transition-colors" />
                        </div>
                        <p className="text-sm font-medium mt-3 text-[var(--text)] group-hover:text-white transition-colors">Drag & drop or click to browse</p>
                        <p className="text-[10px] text-[var(--muted)] font-[var(--font-mono)] mt-1">PDF, DOC, DOCX · Unlimited</p>
                      </div>
                      <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                    </>
                  )}
                </div>
              </div>

              {/* ── CANDIDATES (full width) ── */}
              {candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20">
                  {uploading || processingCount > 0 ? (
                    <>
                      <div className="w-20 h-20 rounded-full border border-[var(--cyan)]/20 bg-[rgba(6,182,212,0.05)] flex items-center justify-center relative mb-6">
                        <div className="absolute inset-0 rounded-full border border-[var(--cyan)] scale-[1.3] opacity-20 animate-ping" />
                        <Sparkles className="w-8 h-8 text-[var(--cyan)] animate-pulse" />
                      </div>
                      <p className="text-lg font-semibold text-[var(--cyan)] animate-pulse mb-2">Analyzing Resumes...</p>
                      <p className="text-sm text-[var(--muted)] max-w-sm">Our AI is extracting skills and scoring match quality. Results will appear in real-time below.</p>
                      <div className="mt-8 flex gap-2">
                        {[0, 1, 2].map(n => (
                          <div key={n} className="w-2 h-2 rounded-full bg-[var(--cyan)] animate-bounce" style={{ animationDelay: `${n * 0.15}s` }} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] flex items-center justify-center relative mb-6">
                        <div className="absolute inset-0 rounded-full border border-[var(--cyan)] scale-[1.3] opacity-10 animate-[ping_3s_infinite]" />
                        <FileText className="w-8 h-8 text-[var(--muted)] opacity-50" />
                      </div>
                      <p className="text-lg font-semibold text-[var(--text)]/80 mb-2">No candidates yet</p>
                      <p className="text-sm text-[var(--muted)] max-w-sm">Upload resumes above to start analysis. Add a job description first for smarter skill matching.</p>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center px-5 pb-3 text-[10px] font-[var(--font-mono)] text-[var(--muted)] uppercase tracking-widest border-b border-[rgba(255,255,255,0.04)]">
                    <span className="w-14">Rank</span>
                    <span className="flex-1">Candidate</span>
                    <span className="w-32">Score</span>
                    <span className="w-48 text-right">Skills</span>
                  </div>
                  <div className="space-y-2 mt-3">
                    {(uploading || processingCount > 0) && (
                      <div className="group relative bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.04)] rounded-xl p-4 flex items-center gap-4 animate-pulse">
                        <div className="w-14 flex justify-center"><div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.05)]" /></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded w-1/3" />
                          <div className="h-3 bg-[rgba(255,255,255,0.02)] rounded w-1/4" />
                        </div>
                        <div className="w-32 flex flex-col gap-2">
                          <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded w-1/2 ml-auto" />
                          <div className="h-1 w-full bg-[rgba(255,255,255,0.05)] rounded-full" />
                        </div>
                        <div className="w-48 flex justify-end gap-2">
                          <div className="h-4 w-12 bg-[rgba(255,255,255,0.05)] rounded" />
                          <div className="h-4 w-16 bg-[rgba(255,255,255,0.05)] rounded" />
                        </div>
                      </div>
                    )}
                    {candidates.map((c, i) => (
                      <div key={i}
                        onClick={() => { setSelected(c); setChatMessages([]); }}
                        className="group relative bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(6,182,212,0.04)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(6,182,212,0.25)] rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_-8px_rgba(6,182,212,0.15)]"
                      >
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-[var(--cyan)] rounded-r-full transition-all duration-300 group-hover:h-10 shadow-[0_0_8px_var(--cyan)]" />
                        <div className="w-14 flex justify-center">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-[var(--font-mono)]
                          ${i === 0 ? "bg-[linear-gradient(135deg,#F59E0B,#D97706)] text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                              : i === 1 ? "bg-[linear-gradient(135deg,#94A3B8,#64748B)] text-white"
                                : i === 2 ? "bg-[linear-gradient(135deg,#B45309,#78350F)] text-white"
                                  : "bg-[rgba(255,255,255,0.05)] text-[var(--muted)]"}`}>
                            {i + 1}
                          </div>
                        </div>
                        <div className="flex-1 overflow-hidden pointer-events-none">
                          <h3 className={`text-sm font-semibold truncate flex items-center gap-2 ${anonymousMode ? "text-[var(--violet)]" : "text-[var(--text)] group-hover:text-white"}`}>
                            {candidateName(c, i + 1)}
                            {c.jd_present && <span className="text-[8px] border border-[var(--cyan)]/40 text-[var(--cyan)] px-1.5 py-0.5 rounded uppercase tracking-wider">JD</span>}
                          </h3>
                          <p className="text-[10px] text-[var(--muted)] font-[var(--font-mono)] mt-0.5 truncate">{anonymousMode ? "Hidden" : c.filename}</p>
                        </div>
                        <div className="w-32 flex flex-col gap-1 pointer-events-none">
                          <div className="flex items-end justify-between">
                            <span className="text-xl font-bold text-[var(--cyan)] leading-none drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">{c.score}</span>
                            <span className="text-[10px] text-[var(--muted)] font-mono mb-0.5">/100</span>
                          </div>
                          <div className="h-1 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                            <div className="h-full bg-[linear-gradient(90deg,var(--cyan),#38BDF8)] rounded-full relative" style={{ width: `${c.score}%` }}>
                              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] animate-[shimmer_2s_infinite]" />
                            </div>
                          </div>
                        </div>
                        <div className="w-48 text-right pointer-events-none">
                          <div className="flex flex-wrap gap-1 justify-end">
                            {c.skills.slice(0, 3).map((s) => (
                              <span key={s} className="text-[9px] font-[var(--font-mono)] bg-[rgba(6,182,212,0.05)] border border-[rgba(6,182,212,0.15)] text-[var(--cyan)] px-2 py-0.5 rounded-md whitespace-nowrap">{s}</span>
                            ))}
                            {c.skills_count > 3 && <span className="text-[9px] font-[var(--font-mono)] text-[var(--muted)] px-1">+{c.skills_count - 3}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ACTIVITY LOG (collapsible) ── */}
              <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#020617] overflow-hidden relative">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(255,255,255,0.015)_1px,rgba(255,255,255,0.015)_2px)] pointer-events-none" />
                <button onClick={() => setLogExpanded(!logExpanded)}
                  className="w-full px-5 py-3 flex items-center justify-between bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-3.5 h-3.5 text-[var(--cyan)]" />
                    <span className="text-[10px] font-[var(--font-mono)] text-[var(--muted)] uppercase tracking-widest">Activity Log</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] animate-pulse shadow-[0_0_5px_var(--cyan)]" />
                  </div>
                  <div className="flex items-center gap-3">
                    {!logExpanded && logs.length > 0 && (
                      <span className="text-[10px] font-[var(--font-mono)] text-[var(--muted)]/60 truncate max-w-[300px]">{logs[logs.length - 1]}</span>
                    )}
                    {logExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[var(--muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)]" />}
                  </div>
                </button>
                {logExpanded && (
                  <div className="max-h-48 overflow-y-auto p-4 space-y-1 font-[var(--font-mono)] text-[10px] leading-relaxed no-scrollbar relative z-10">
                    {logs.map((l, i) => (
                      <div key={i} className={`flex gap-3 ${l.startsWith("!") ? "text-[var(--rose)]"
                        : l.startsWith("✓") ? "text-[var(--cyan)]"
                          : l.startsWith(">") ? "text-white/50"
                            : "text-white/30"}`}>
                        <span className="opacity-30 shrink-0 select-none">[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                        <span>{l}</span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ── CANDIDATE INSPECTOR SIDEBAR (Right HUD) ── */}
        {selected && (
          <>
            {/* Backdrop overlay */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity" onClick={() => setSelected(null)} />
            <div className={`fixed inset-y-0 right-0 ${pdfView ? "w-[95vw] max-w-[1400px]" : "w-full max-w-[800px]"} transition-[width,max-width] duration-500 ease-in-out bg-[rgba(3,7,18,0.95)] backdrop-blur-3xl border-l border-[rgba(6,182,212,0.3)] shadow-[-20px_0_50px_rgba(0,0,0,0.8)] flex flex-col z-40 overflow-hidden animate-in slide-in-from-right shadow-[0_0_50px_rgba(6,182,212,0.1)]`}>
              {/* Top glow */}
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--cyan)]/10 blur-[120px] pointer-events-none" />

              {/* Header */}
              <div className="flex items-start justify-between p-6 border-b border-[rgba(255,255,255,0.05)] relative z-10 bg-[rgba(255,255,255,0.01)]">
                <div>
                  <h2 className={`font-[var(--font-display)] font-extrabold text-2xl ${anonymousMode ? "text-[var(--violet)]" : "text-[var(--text)] drop-shadow-md"}`}>
                    {anonymousMode ? `APPLICANT_${String((candidates.indexOf(selected) + 1)).padStart(3, "0")}` : (selected.name || selected.filename)}
                  </h2>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--cyan)] to-[#38BDF8] drop-shadow-[0_0_10px_rgba(6,182,212,0.5)] leading-none">{selected.score}</span>
                    <span className="text-sm font-[var(--font-mono)] text-[var(--muted)]">/ 100</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className="flex gap-2 items-center">
                    <button onClick={() => {
                      if (selected.file_hash) {
                        const url = `${window.location.origin}/shared/${selected.file_hash}`;
                        navigator.clipboard.writeText(url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } else {
                        alert("This candidate does not have a shareable hash. Please re-upload.");
                      }
                    }} className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.1)] hover:bg-[rgba(124,58,237,0.2)] text-[var(--violet)] transition-all text-[10px] font-[var(--font-mono)] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(124,58,237,0.15)]">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5 -rotate-90" />}
                      {copied ? "Copied Link" : "Share"}
                    </button>
                    <button onClick={() => setSelected(null)} className="text-[var(--muted)] hover:text-white bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(244,63,94,0.1)] hover:border-[rgba(244,63,94,0.3)] border border-[rgba(255,255,255,0.05)] p-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <button onClick={() => setPdfView(!pdfView)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-[var(--font-mono)] font-bold uppercase tracking-wider ${pdfView ? "bg-[rgba(6,182,212,0.15)] text-[var(--cyan)] border-[var(--cyan)]/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-[rgba(255,255,255,0.03)] text-[var(--muted)] border-[rgba(255,255,255,0.05)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]"}`}>
                    <FileText className="w-3.5 h-3.5" />
                    {pdfView ? "Hide Original PDF" : "View Original PDF"}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 p-5 border-b border-[rgba(255,255,255,0.03)] bg-[rgba(0,0,0,0.2)]">
                <button onClick={() => openEmail("accept")} className="flex-1 group relative flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--emerald)]/30 bg-[rgba(16,185,129,0.05)] text-[var(--emerald)] text-xs font-bold font-[var(--font-mono)] transition-all overflow-hidden hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <div className="absolute inset-0 bg-[var(--emerald)]/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                  <Check className="w-4 h-4 relative z-10" /> <span className="relative z-10">ACCEPT</span>
                </button>
                <button onClick={() => openEmail("reject")} className="flex-1 group relative flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--rose)]/30 bg-[rgba(244,63,94,0.05)] text-[var(--rose)] text-xs font-bold font-[var(--font-mono)] transition-all overflow-hidden hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                  <div className="absolute inset-0 bg-[var(--rose)]/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                  <X className="w-4 h-4 relative z-10" /> <span className="relative z-10">REJECT</span>
                </button>
                <button onClick={() => { setModal("chat"); }} className="flex-1 group relative flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--cyan)]/30 bg-[rgba(6,182,212,0.05)] text-[var(--cyan)] text-xs font-bold font-[var(--font-mono)] transition-all overflow-hidden hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,182,212,0),rgba(124,58,237,0.2))] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                  <MessageSquare className="w-4 h-4 relative z-10" /> <span className="relative z-10">CHAT AI</span>
                </button>
              </div>

              {/* Body */}
              <div className={`flex-1 overflow-hidden relative z-10 flex ${pdfView ? "flex-row" : "flex-col"}`}>

                {/* PDF Viewer Pane */}
                {pdfView && (
                  <div className="w-1/2 border-r border-[rgba(255,255,255,0.05)] bg-[#0d131f] flex flex-col">
                    <div className="bg-[rgba(0,0,0,0.2)] px-4 py-2 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2 text-[10px] font-[var(--font-mono)] text-[var(--muted)] uppercase tracking-widest">
                      <FileText className="w-3 h-3 text-[var(--cyan)]" /> Original Document Render
                    </div>
                    {selected.file_hash ? (
                      <iframe
                        src={`${API_URL}/pdf/${selected.file_hash}`}
                        className="flex-1 w-full h-full border-none"
                        title="Resume PDF Viewer"
                      />
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] font-mono text-sm p-10 text-center">
                        <X className="w-8 h-8 mb-4 opacity-20" />
                        No hash associated with this document.<br />Please re-upload to enable viewer.
                      </div>
                    )}
                  </div>
                )}

                {/* Analysis Pane */}
                <div className={`${pdfView ? "w-1/2" : "w-full"} overflow-y-auto p-6 space-y-6 no-scrollbar`}>
                  {/* Contact info */}
                  {!anonymousMode && (selected.email || selected.phone || selected.location) && (
                    <div className="flex flex-wrap gap-4 text-xs font-[var(--font-mono)] text-[var(--muted)] bg-[rgba(255,255,255,0.01)] p-4 rounded-xl border border-[rgba(255,255,255,0.03)]">
                      {selected.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[var(--cyan)]" /> <span>{selected.email}</span></div>}
                      {selected.phone && <div className="flex items-center gap-2"><span>📱</span> <span>{selected.phone}</span></div>}
                      {selected.location && <div className="flex items-center gap-2"><span>📍</span> <span>{selected.location}</span></div>}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "Internships", val: selected.internships, glow: "rgba(6,182,212,0.2)" },
                      { label: "Projects", val: selected.projects, glow: "rgba(124,58,237,0.2)" },
                      { label: "Skills", val: selected.skills_count, glow: "rgba(16,185,129,0.2)" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-2xl p-4 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] relative overflow-hidden group hover:border-[rgba(255,255,255,0.1)] transition-colors">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, ${s.glow} 0%, transparent 70%)` }} />
                        <p className="text-3xl font-[var(--font-display)] font-bold text-white relative z-10 drop-shadow-md">{s.val}</p>
                        <p className="text-[9px] font-[var(--font-mono)] text-[var(--muted)] uppercase tracking-widest mt-1 relative z-10">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* AI Summary */}
                  {selected.hireability_summary && (
                    <div className="relative rounded-2xl p-5 border border-[var(--violet)]/30 bg-[rgba(124,58,237,0.05)] shadow-[inset_0_0_20px_rgba(124,58,237,0.1)]">
                      <div className="absolute -top-3 left-4 bg-[var(--bg)] px-2">
                        <p className="text-[10px] font-[var(--font-mono)] text-[var(--violet)] font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> AI Synthesis Report
                        </p>
                      </div>
                      <p className="text-sm text-[var(--text)]/90 leading-relaxed font-medium mt-2">{selected.hireability_summary}</p>
                    </div>
                  )}

                  {/* Culture fit */}
                  {selected.culture_fit != null && (
                    <div className="rounded-2xl p-5 border border-[var(--cyan)]/30 bg-[rgba(6,182,212,0.05)] shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-[var(--font-mono)] font-bold text-[var(--cyan)] uppercase tracking-widest">Culture & Soft Skills</p>
                        <div className="flex items-center gap-1">
                          <span className="text-2xl font-[var(--font-display)] font-extrabold text-[var(--cyan)] leading-none">{selected.culture_fit}</span>
                          <span className="text-[10px] font-mono text-[var(--muted)] self-end mb-0.5">/100</span>
                        </div>
                      </div>
                      {selected.soft_skills && selected.soft_skills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selected.soft_skills.map((s) => (
                            <span key={s} className="text-[10px] font-medium border border-[var(--cyan)]/40 bg-[rgba(6,182,212,0.1)] text-[var(--text)] px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.1)]">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Score breakdown (Stunning Matrix Upgrade) */}
                  {selected.score_breakdown && (
                    <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#030712] overflow-hidden relative shadow-[inset_0_2px_15px_rgba(0,0,0,1)]">
                      {/* Hardware Grid Backdrop */}
                      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--cyan)]/10 blur-[40px] pointer-events-none" />

                      <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between relative z-10">
                        <p className="text-[10px] font-[var(--font-mono)] font-bold text-[var(--cyan)] uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" /> Classification Matrix
                        </p>
                      </div>

                      <div className="p-5 space-y-4 relative z-10">
                        {Object.entries(selected.score_breakdown).map(([k, v], i) => {
                          const pct = Math.min((v.score / v.max) * 100, 100);
                          // Cycle through theme colors for bars
                          const color = i % 3 === 0 ? 'var(--cyan)' : i % 3 === 1 ? 'var(--violet)' : 'var(--emerald)';
                          return (
                            <div key={k} className="group relative">
                              <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] font-[var(--font-mono)] text-white/80 uppercase tracking-wider">{BREAKDOWN_LABELS[k] || k}</span>
                                <span className="text-xs font-[var(--font-display)] font-bold text-white group-hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] transition-all">
                                  {v.score} <span className="text-[9px] text-[var(--muted)] font-[var(--font-mono)]">/ {v.max}</span>
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-[#0d131f] rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] outline outline-1 outline-[rgba(255,255,255,0.05)]">
                                <div
                                  className="h-full rounded-full relative transition-[width] duration-1000 ease-out"
                                  style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)] animate-[shimmer_2s_infinite]" />
                                </div>
                              </div>
                              <p className="text-[9px] font-[var(--font-mono)] text-[var(--muted)] mt-1.5 truncate group-hover:text-white/50 transition-colors">
                                <span className="text-[var(--cyan)] opacity-50 mr-1">&gt;</span>{v.detail}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {selected.skills.length > 0 && (
                    <div>
                      <p className="text-[10px] font-[var(--font-mono)] text-[var(--muted)] uppercase tracking-widest mb-2">Key Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.skills.map((s) => (
                          <span key={s} className="text-[10px] border border-[var(--cyan)]/30 text-[var(--cyan)] px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gap Analysis */}
                  {selected.jd_analysis?.jd_present && (
                    <div className="rounded-2xl p-5 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] space-y-4">
                      <div className="text-[10px] font-[var(--font-mono)] font-bold text-white/50 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" /> JD Gap Analysis
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-[var(--emerald)] mb-2 font-bold flex items-center gap-1.5"><Check className="w-3 h-3" /> MATCHED CORE</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selected.jd_analysis.matches.map((m) => (
                              <span key={m} className="text-[9px] font-[var(--font-mono)] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[var(--emerald)] px-2.5 py-1 rounded shadow-[0_0_8px_rgba(16,185,129,0.1)]">{m}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--rose)] mb-2 font-bold flex items-center gap-1.5"><X className="w-3 h-3" /> MISSING CORE</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selected.jd_analysis.missing.slice(0, 15).map((m) => (
                              <span key={m} className="text-[9px] font-[var(--font-mono)] bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.3)] text-[var(--rose)] px-2.5 py-1 rounded shadow-[0_0_8px_rgba(244,63,94,0.1)]">{m}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GitHub */}
                  {selected.github_username && !anonymousMode && (
                    <div className="rounded-2xl p-5 border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3">
                        {selected.github_verified ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[10px] font-bold text-[var(--emerald)] shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <Check className="w-3 h-3" /> VERIFIED
                          </div>
                        ) : (
                          <div className="text-[9px] font-mono text-[var(--muted)]/50 uppercase tracking-tighter">UNVERIFIED PROFILE</div>
                        )}
                      </div>

                      <p className="text-[10px] font-[var(--font-mono)] text-[var(--muted)] uppercase tracking-widest mb-3">GitHub Presence</p>
                      <a href={`https://github.com/${selected.github_username}`} target="_blank" rel="noreferrer"
                        className="text-[var(--cyan)] hover:text-[var(--violet)] text-base font-bold transition-all flex items-center gap-2 group-hover:translate-x-1">
                        @{selected.github_username}
                        <Zap className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>

                      {selected.github_stats && (
                        <div className="flex gap-4 mt-3 text-[10px] font-[var(--font-mono)] text-[var(--muted)]/80">
                          <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-[var(--cyan)]" /> {selected.github_stats.repos} Repos</span>
                          <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-[var(--violet)]" /> {selected.github_stats.followers} Followers</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Interview Questions */}
                  {selected.interview_questions && selected.interview_questions.length > 0 && (
                    <div className="rounded-2xl p-5 border border-[var(--cyan)]/20 bg-[var(--cyan)]/5">
                      <p className="text-[10px] font-mono text-[var(--cyan)] uppercase tracking-widest mb-3 font-bold">AI Interview Guide</p>
                      <ol className="space-y-3">
                        {selected.interview_questions.map((q, i) => (
                          <li key={i} className="text-xs text-[var(--text)]/80 flex gap-3 leading-relaxed">
                            <span className="text-[var(--cyan)] font-bold shrink-0">{i + 1}.</span>
                            {q}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Resume snippet */}
                  <div>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">Raw File Snippet</p>
                    <pre className="text-[10px] text-[var(--muted)]/60 leading-5 whitespace-pre-wrap max-h-40 overflow-y-auto bg-black/50 rounded-xl p-4 border border-white/5 font-mono">
                      {selected.raw_text?.slice(0, 1000) || "No snippet available."}
                      {selected.raw_text && selected.raw_text.length > 1000 && "..."}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── EMAIL MODAL ── */}
        {modal === "email" && selected && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-[var(--bg)] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative">
              <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-[var(--muted)] hover:text-white p-1"><X className="w-5 h-5" /></button>
              <h2 className={`font-[var(--font-display)] text-xl font-bold mb-4 ${emailType === "accept" ? "text-[var(--emerald)]" : "text-[var(--rose)]"}`}>
                {emailType === "accept" ? "✓ Acceptance Email Draft" : "✗ Rejection Email Draft"}
              </h2>
              {emailLoading ? (
                <div className="h-48 flex items-center justify-center text-[var(--cyan)] animate-pulse font-[var(--font-mono)] text-sm">Generating via LLM...</div>
              ) : (
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  className="w-full h-64 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-xl p-4 text-sm text-[var(--text)]/80 resize-none focus:outline-none focus:border-[var(--cyan)]"
                />
              )}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => { navigator.clipboard.writeText(emailContent); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-2 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(6,182,212,0.4)] text-[var(--muted)] hover:text-white px-4 py-2 rounded-xl text-sm transition-all"
                >
                  {copied ? <><Check className="w-4 h-4 text-[var(--emerald)]" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT MODAL ── */}
        {modal === "chat" && selected && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-[var(--bg)] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-xl flex flex-col h-[540px] shadow-2xl relative">
              <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.08)]">
                <div>
                  <h2 className="font-[var(--font-display)] font-bold text-[var(--cyan)] text-lg flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Chat with Resume</h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Ask anything about {anonymousMode ? "this applicant" : selected.name || selected.filename}</p>
                </div>
                <button onClick={() => setModal(null)} className="text-[var(--muted)] hover:text-white p-1"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center text-white/25 text-xs mt-8">Ask a question like: "Did they use Python in production?"</div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-brand-600 text-white" : "bg-white/5 border border-white/8 text-white/80"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-2.5">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(n => <div key={n} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${n * 0.15}s` }} />)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-[rgba(255,255,255,0.08)] flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Ask about this candidate..."
                  className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] focus:border-[var(--cyan)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all"
                />
                <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                  className="p-2.5 bg-[linear-gradient(135deg,var(--cyan),var(--violet))] hover:opacity-90 disabled:opacity-40 rounded-xl transition-all border-0">
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
