"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "../app/landing.css";

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);

  // Stats tickers
  const [parsed, setParsed] = useState(0);
  const [ranked, setRanked] = useState(0);
  const [acc, setAcc] = useState(0);

  // Selected Demo Candidate
  const [selC, setSelC] = useState(0);

  // Hero stat counter animation
  const [heroStats, setHeroStats] = useState({ resumes: 0, avgTime: 0, accuracy: 0 });
  useEffect(() => {
    const targets = { resumes: 25, avgTime: 0.8, accuracy: 95 };
    const duration = 1500;
    const steps = 40;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 3);
      setHeroStats({
        resumes: Math.round(targets.resumes * ease),
        avgTime: +(targets.avgTime * ease).toFixed(1),
        accuracy: Math.round(targets.accuracy * ease),
      });
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, []);

  // Active nav link
  const [activeSection, setActiveSection] = useState('');
  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
    }, { threshold: 0.3 });
    sections.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('.reveal-on-scroll');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Typewriter effect
  const [typeText, setTypeText] = useState("");
  useEffect(() => {
    const words = ["Decoded.", "Simplified.", "Automated."];
    let wordIdx = 0, charIdx = 0, deleting = false, timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = words[wordIdx];
      if (!deleting) {
        charIdx++;
        setTypeText(current.slice(0, charIdx));
        if (charIdx === current.length) {
          timer = setTimeout(() => { deleting = true; tick(); }, 2000);
        } else {
          timer = setTimeout(tick, 60);
        }
      } else {
        charIdx--;
        setTypeText(current.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          wordIdx = (wordIdx + 1) % words.length;
          timer = setTimeout(tick, 400);
        } else {
          timer = setTimeout(tick, 30);
        }
      }
    };

    timer = setTimeout(tick, 100);
    return () => clearTimeout(timer);
  }, []);

  // Three.js Background
  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;

    let rafId: number;
    let W = hero.clientWidth,
      H = hero.clientHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 300);
    camera.position.z = 50;

    function makeField(count: number, color: number, size: number, spread: number) {
      const g = new THREE.BufferGeometry();
      const p = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i++) p[i] = (Math.random() - 0.5) * spread;
      g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      return new THREE.Points(
        g,
        new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.5 })
      );
    }
    scene.add(makeField(1400, 0x00d4ff, 0.14, 200));
    scene.add(makeField(600, 0x6d28d9, 0.2, 160));
    scene.add(makeField(400, 0x1a56db, 0.16, 180));

    const grid = new THREE.GridHelper(200, 40, 0x00d4ff, 0x0ea5e9);
    (grid.material as THREE.Material).opacity = 0.06;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -28;
    grid.rotation.x = 0;
    scene.add(grid);

    // Removed shapes per user request

    // Removed mouse parallax logic

    let t = 0;
    function anim() {
      rafId = requestAnimationFrame(anim);
      t += 0.008;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    }
    anim();

    const onResize = () => {
      W = hero.clientWidth;
      H = hero.clientHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  // Log Stream Simulator
  useEffect(() => {
    const logData = [
      { ts: "00:00.1", tag: "INF", tagc: "tag-inf", msg: '<span class="hlc">Loading</span> batch: <span class="hl">25 resumes</span>' },
      { ts: "00:00.3", tag: "INF", tagc: "tag-inf", msg: '<span class="hlc">PyMuPDF</span> initialized · parser=<span class="hlg">active</span>' },
      { ts: "00:00.6", tag: "OK ", tagc: "tag-ok", msg: 'resume_001.pdf → <span class="hlg">parse complete</span> · chars=<span class="hl">4820</span>' },
      { ts: "00:00.9", tag: "INF", tagc: "tag-inf", msg: '<span class="hlc">Groq</span> API call → extract(<span class="hlv">skills</span>)' },
      { ts: "00:01.2", tag: "OK ", tagc: "tag-ok", msg: 'skills=<span class="hlg">["React","Python","Docker","Node.js"]</span>' },
      { ts: "00:01.4", tag: "OK ", tagc: "tag-ok", msg: 'cgpa=<span class="hlg">9.2</span> · internships=<span class="hlg">3</span>' },
      { ts: "00:01.6", tag: "INF", tagc: "tag-inf", msg: '<span class="hlc">GitHub</span> verify → @priya_dev · repos=<span class="hl">24</span>' },
      { ts: "00:01.8", tag: "OK ", tagc: "tag-ok", msg: 'score=<span class="hlg">91</span> · rank=<span class="hlg">#1</span> → <span class="hlg">HIRE</span>' },
      { ts: "00:02.0", tag: "INF", tagc: "tag-inf", msg: 'resume_002.pdf → <span class="hlc">processing...</span>' },
      { ts: "00:02.3", tag: "OK ", tagc: "tag-ok", msg: 'score=<span class="hlg">84</span> · rank=<span class="hlg">#2</span> → <span class="hlg">HIRE</span>' },
      { ts: "00:02.5", tag: "WARN", tagc: "tag-warn", msg: 'resume_003: cgpa_field=<span class="hla">ambiguous</span> → fallback' },
      { ts: "00:02.8", tag: "OK ", tagc: "tag-ok", msg: 'score=<span class="hlg">72</span> · rank=<span class="hlg">#3</span> → <span class="hla">REVIEW</span>' },
      { ts: "00:03.1", tag: "INF", tagc: "tag-inf", msg: '<span class="hlc">anti_overfit</span> check → word_count ignored ✓' },
      { ts: "00:03.4", tag: "OK ", tagc: "tag-ok", msg: 'score=<span class="hlg">65</span> · rank=<span class="hlg">#4</span> → <span class="hla">REVIEW</span>' },
      { ts: "00:03.8", tag: "OK ", tagc: "tag-ok", msg: 'score=<span class="hl">48</span> · rank=<span class="hl">#5</span> → <span class="hlc">PASS</span>' },
      { ts: "00:04.1", tag: "OK ", tagc: "tag-ok", msg: '<span class="hlg">Batch complete</span> · 25/25 ranked · 0 errors' },
    ];
    let li = 0;
    const iv = setInterval(() => {
      if (!logRef.current) return;
      if (li >= logData.length) {
        li = 0;
        logRef.current.innerHTML = "";
      }
      const l = logData[li++];
      const d = document.createElement("div");
      d.className = "log-entry";
      d.style.animationDelay = "0s";
      d.innerHTML = `<span class="log-ts">${l.ts}</span><span class="log-tag ${l.tagc}">${l.tag}</span><span class="log-msg">${l.msg}</span>`;
      logRef.current.appendChild(d);
      if (logRef.current.children.length > 8) logRef.current.removeChild(logRef.current.firstChild!);
    }, 600);
    return () => clearInterval(iv);
  }, []);

  // Metrics Ticker
  useEffect(() => {
    let p = 0,
      r = 0;
    const iv = setInterval(() => {
      setParsed((prev) => {
        const next = Math.min(prev + 1, 25);
        p = next;
        return next;
      });
      setRanked((prev) => {
        const next = Math.min(prev + 1, Math.max(0, p - 1));
        r = next;
        return next;
      });
      setAcc(Math.min(95 + Math.floor(Math.random() * 3), 97));
    }, 400);
    return () => clearInterval(iv);
  }, []);

  // Radar Chart
  useEffect(() => {
    const cv = radarRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const cx = 170,
      cy = 170,
      r = 120;
    const labels = ["Internships", "Skills", "Projects", "CGPA", "Achievements", "Exp.", "Extra", "Lang.", "Online", "Degree", "College", "School"];
    const vals = [0.87, 0.92, 0.77, 0.84, 0.62, 0.52, 0.72, 0.66, 0.82, 0.7, 0.57, 0.9];
    const n = labels.length;

    ctx.clearRect(0, 0, cv.width, cv.height);

    for (let lv = 1; lv <= 5; lv++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r * (lv / 5);
        const y = cy + Math.sin(a) * r * (lv / 5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(0,212,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.strokeStyle = "rgba(0,212,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r * vals[i],
        y = cy + Math.sin(a) * r * vals[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(0,212,255,0.32)");
    g.addColorStop(1, "rgba(109,40,217,0.1)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,212,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = "500 9.5px JetBrains Mono,monospace";
    ctx.fillStyle = "rgba(71,85,105,0.9)";
    ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(labels[i], cx + Math.cos(a) * (r + 16), cy + Math.sin(a) * (r + 16) + 3.5);
    }

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * vals[i], cy + Math.sin(a) * r * vals[i], 3, 0, Math.PI * 2);
      ctx.fillStyle = "#00d4ff";
      ctx.fill();
    }
  }, []);

  const rankData = [
    { n: "Shashank Tomar", r: "Full Stack", score: 91, rank: 1, c: "rgba(0,212,255,.13)", cc: "var(--cyan)", i: "ST", badge: "HIRE", bc: "badge-hire" },
    { n: "Arjun Kumar", r: "ML Eng.", score: 84, rank: 2, c: "rgba(139,92,246,.13)", cc: "var(--violet2)", i: "AK", badge: "HIRE", bc: "badge-hire" },
    { n: "Nisha Patel", r: "Data Analyst", score: 72, rank: 3, c: "rgba(251,191,36,.13)", cc: "var(--amber)", i: "NP", badge: "REVIEW", bc: "badge-rev" },
    { n: "Rahul Gupta", r: "Backend", score: 65, rank: 4, c: "rgba(0,255,163,.1)", cc: "var(--emerald)", i: "RG", badge: "REVIEW", bc: "badge-rev" },
    { n: "Sara Mehta", r: "DevOps", score: 48, rank: 5, c: "rgba(255,77,109,.1)", cc: "var(--rose)", i: "SM", badge: "PASS", bc: "badge-pass" },
  ];

  const demoCands = [
    { name: "Shashank Tomar", role: "Full Stack Developer", loc: "Bangalore", cgpa: "9.2", score: 91, rank: 1, skills: ["React", "Python", "Docker", "Node.js", "PostgreSQL"], interns: 3, proj: 5, bk: { Internships: { v: 20, m: 20 }, "Skills & Certs": { v: 18, m: 20 }, Projects: { v: 15, m: 15 }, CGPA: { v: 9, m: 10 }, Achievements: { v: 8, m: 10 }, Experience: { v: 5, m: 5 }, "Extra-curricular": { v: 4, m: 5 }, Languages: { v: 3, m: 3 }, "Online Presence": { v: 3, m: 3 }, Degree: { v: 3, m: 3 }, College: { v: 2, m: 2 }, School: { v: 1, m: 2 } } },
    { name: "Arjun Kumar", role: "ML Engineer", loc: "Hyderabad", cgpa: "8.8", score: 84, rank: 2, skills: ["PyTorch", "TensorFlow", "Python", "MLOps", "K8s"], interns: 2, proj: 6, bk: { Internships: { v: 20, m: 20 }, "Skills & Certs": { v: 17, m: 20 }, Projects: { v: 15, m: 15 }, CGPA: { v: 9, m: 10 }, Achievements: { v: 6, m: 10 }, Experience: { v: 4, m: 5 }, "Extra-curricular": { v: 3, m: 5 }, Languages: { v: 2, m: 3 }, "Online Presence": { v: 3, m: 3 }, Degree: { v: 3, m: 3 }, College: { v: 1, m: 2 }, School: { v: 1, m: 2 } } },
    { name: "Nisha Patel", role: "Data Analyst", loc: "Mumbai", cgpa: "7.9", score: 72, rank: 3, skills: ["SQL", "Tableau", "Python", "Excel"], interns: 1, proj: 3, bk: { Internships: { v: 10, m: 20 }, "Skills & Certs": { v: 14, m: 20 }, Projects: { v: 15, m: 15 }, CGPA: { v: 8, m: 10 }, Achievements: { v: 4, m: 10 }, Experience: { v: 3, m: 5 }, "Extra-curricular": { v: 3, m: 5 }, Languages: { v: 2, m: 3 }, "Online Presence": { v: 2, m: 3 }, Degree: { v: 2, m: 3 }, College: { v: 1, m: 2 }, School: { v: 1, m: 2 } } },
    { name: "Rahul Gupta", role: "Backend Developer", loc: "Pune", cgpa: "7.2", score: 65, rank: 4, skills: ["Java", "Spring Boot", "MySQL"], interns: 1, proj: 2, bk: { Internships: { v: 10, m: 20 }, "Skills & Certs": { v: 12, m: 20 }, Projects: { v: 10, m: 15 }, CGPA: { v: 7, m: 10 }, Achievements: { v: 4, m: 10 }, Experience: { v: 3, m: 5 }, "Extra-curricular": { v: 2, m: 5 }, Languages: { v: 2, m: 3 }, "Online Presence": { v: 1, m: 3 }, Degree: { v: 2, m: 3 }, College: { v: 1, m: 2 }, School: { v: 1, m: 2 } } },
    { name: "Sara Mehta", role: "DevOps Engineer", loc: "Delhi", cgpa: "6.5", score: 48, rank: 5, skills: ["Linux", "Bash", "AWS"], interns: 0, proj: 2, bk: { Internships: { v: 0, m: 20 }, "Skills & Certs": { v: 10, m: 20 }, Projects: { v: 10, m: 15 }, CGPA: { v: 7, m: 10 }, Achievements: { v: 2, m: 10 }, Experience: { v: 0, m: 5 }, "Extra-curricular": { v: 1, m: 5 }, Languages: { v: 1, m: 3 }, "Online Presence": { v: 1, m: 3 }, Degree: { v: 2, m: 3 }, College: { v: 0, m: 2 }, School: { v: 1, m: 2 } } },
  ];

  const getScoreColor = (s: number) => (s >= 80 ? "var(--emerald)" : s >= 60 ? "var(--amber)" : "var(--rose)");
  const c = demoCands[selC];

  return (
    <div className="landing-page">
      <nav className={activeSection && activeSection !== 'hero' ? 'nav-scrolled' : ''}>
        <div className="nlogo">TALENTSCOUT AI</div>
        <div className="nlinks">
          <a href="#how" className={activeSection === 'how' ? 'nav-active' : ''}>Pipeline</a>
          <a href="#matrix-section" className={activeSection === 'matrix-section' ? 'nav-active' : ''}>Leaderboard</a>
          <a href="#demo" className={activeSection === 'demo' ? 'nav-active' : ''}>Demo</a>
          <a href="#features" className={activeSection === 'features' ? 'nav-active' : ''}>Features</a>
        </div>
        <button className="ncta" onClick={() => window.location.href = '/login'}>
          <span className="ncta-text">Get Started</span>
        </button>
      </nav>

      <section id="hero" ref={heroRef}>
        <canvas id="bg-canvas" ref={canvasRef}></canvas>
        <div className="hero-glow-l"></div>
        <div className="hero-glow-r"></div>
        <div className="hero-vignette"></div>

        <div className="hc">
          <div className="hbadge">
            <span className="hbadge-dot"></span>AI-PS-1 · Smart ABES Hackathon 2.0
          </div>
          <div className="htitle-mono">TALENTSCOUT AI · Neural Extraction Engine Active</div>
          <h1 className="htitle">
            AI Resume<br />
            Screening,<br />
            <span className="type-decode" style={{ color: "var(--cyan)" }}>{typeText}</span>
          </h1>
          <p className="hsub">
            Upload your candidate resumes and let our AI instantly extract skills, calculate scores, and rank the best talent for you. Free of bias, full of insight.
          </p>
          <div className="hact">
            <button className="bp" onClick={() => window.location.href = '/dashboard'}>Upload Resumes</button>
            <button className="bg" onClick={() => document.getElementById('demo')?.scrollIntoView()}>Run Demo</button>
          </div>
          <div className="hstats">
            <div className="hstat">
              <span className="hstat-val">{heroStats.resumes}+</span>
              <span className="hstat-label">Resumes/batch</span>
            </div>
            <div className="hstat-sep"></div>
            <div className="hstat">
              <span className="hstat-val">{heroStats.avgTime}s</span>
              <span className="hstat-label">Avg per file</span>
            </div>
            <div className="hstat-sep"></div>
            <div className="hstat">
              <span className="hstat-val">{heroStats.accuracy}%</span>
              <span className="hstat-label">Accuracy</span>
            </div>
          </div>
        </div>

        <div id="resume-stage">
          <div className="resume-card">
            <div className="scan-beam"></div>
            <div className="scan-glow"></div>
            <div className="rc tl"></div>
            <div className="rc tr"></div>
            <div className="rc bl"></div>
            <div className="rc br"></div>

            <div className="resume-scroll-content">
              <div className="rv-header">
                <div className="rv-avatar">ST</div>
                <div>
                  <div className="rv-name">Shashank Tomar</div>
                  <div className="rv-role">Full Stack Developer · Bangalore</div>
                  <div className="rv-chips">
                    <span className="rv-chip">React</span>
                    <span className="rv-chip">Python</span>
                    <span className="rv-chip">Docker</span>
                    <span className="rv-chip">Node.js</span>
                  </div>
                </div>
              </div>

              <div className="rv-section-title">Education</div>
              <div className="rv-line active" style={{ width: "75%" }}>
                <div className="hl" style={{ background: "rgba(0,212,255,0.25)" }}></div>
              </div>
              <div className="rv-line" style={{ width: "55%" }}>
                <div className="hl" style={{ background: "rgba(0,212,255,0.15)" }}></div>
              </div>

              <div className="rv-section-title">Experience</div>
              <div className="rv-line active" style={{ width: "90%" }}>
                <div className="hl" style={{ background: "rgba(139,92,246,0.25)" }}></div>
              </div>
              <div className="rv-line" style={{ width: "80%" }}>
                <div className="hl" style={{ background: "rgba(139,92,246,0.15)" }}></div>
              </div>
              <div className="rv-line" style={{ width: "65%" }}>
                <div className="hl" style={{ background: "rgba(139,92,246,0.1)" }}></div>
              </div>

              <div className="rv-section-title">Projects</div>
              <div className="rv-line active" style={{ width: "85%" }}>
                <div className="hl" style={{ background: "rgba(0,255,163,0.2)" }}></div>
              </div>
              <div className="rv-line" style={{ width: "70%" }}>
                <div className="hl" style={{ background: "rgba(0,255,163,0.12)" }}></div>
              </div>
              <div className="rv-line" style={{ width: "60%" }}>
                <div className="hl" style={{ background: "rgba(0,255,163,0.08)" }}></div>
              </div>

              <div className="rv-section-title">Skills & Certifications</div>
              <div className="rv-line active" style={{ width: "95%" }}>
                <div className="hl" style={{ background: "rgba(251,191,36,0.2)" }}></div>
              </div>
              <div className="rv-line" style={{ width: "78%" }}>
                <div className="hl" style={{ background: "rgba(251,191,36,0.12)" }}></div>
              </div>
            </div>

            <div className="ex-popup" style={{ top: "36px", animationDelay: ".2s" }}>
              <div className="exp-key">CGPA Detected</div>
              <div className="exp-val">9.2 / 10.0</div>
              <div className="exp-conf">↑ confidence 98%</div>
            </div>
            <div className="ex-popup" style={{ top: "108px", animationDelay: ".8s" }}>
              <div className="exp-key">Internships</div>
              <div className="exp-val">3 verified</div>
              <div className="exp-conf">↑ weight: 20pts</div>
            </div>
            <div className="ex-popup" style={{ top: "168px", animationDelay: "1.4s" }}>
              <div className="exp-key">Projects</div>
              <div className="exp-val">5 detected</div>
              <div className="exp-conf">↑ weight: 15pts</div>
            </div>
            <div className="ex-popup" style={{ bottom: "48px", animationDelay: "2s" }}>
              <div className="exp-key">AI Score</div>
              <div className="exp-val" style={{ color: "var(--emerald)", fontSize: ".9rem", fontWeight: 800 }}>91 / 100</div>
              <div className="exp-conf" style={{ color: "var(--emerald)" }}>→ Rank #1</div>
            </div>
          </div>

          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem", color: "var(--muted2)" }}>talentscout.process(resume_001.pdf)</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: ".62rem", color: "var(--emerald)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "4px", height: "4px", background: "var(--emerald)", borderRadius: "50%", animation: "blink 1.2s infinite" }}></span>
              RUNNING
            </div>
          </div>
        </div>
      </section>

      <div className="sbar">
        <div className="strk">
          <div className="sti"><span className="v">25+</span>resumes/batch</div>
          <div className="sti"><span className="v">95%</span>extraction accuracy</div>
          <div className="sti"><span className="v">1.8s</span>avg time/resume</div>
          <div className="sti"><span className="v">12</span>scoring factors</div>
          <div className="sti"><span className="v">Max Score</span>100</div>
          <div className="sti"><span className="v">Fully</span>Automated</div>
          <div className="sti"><span className="v">PDF|DOC|DOCX</span>supported</div>
          <div className="sti"><span className="v">GitHub</span>Verified</div>
          <div className="sti"><span className="v">Anti-Overfitting</span>Active</div>
          <div className="sti"><span className="v">25+</span>resumes/batch</div>
          <div className="sti"><span className="v">95%</span>extraction accuracy</div>
          <div className="sti"><span className="v">1.8s</span>avg time/resume</div>
          <div className="sti"><span className="v">12</span>scoring factors</div>
          <div className="sti"><span className="v">Max Score</span>100</div>
          <div className="sti"><span className="v">Fully</span>Automated</div>
          <div className="sti"><span className="v">PDF|DOC|DOCX</span>supported</div>
          <div className="sti"><span className="v">GitHub</span>Verified</div>
          <div className="sti"><span className="v">Anti-Overfitting</span>Active</div>
        </div>
      </div>

      <section id="how" className="reveal-on-scroll">
        <div className="ctr">
          <div className="slabel">Pipeline</div>
          <div className="stitle">Four steps.<br />One ranked list.</div>
          <p className="ssub">Algorithmic pipeline converts unstructured documents into objective, reproducible rankings — every single time.</p>
          <div className="pipeline-grid">
            <div className="pip-card">
              <div className="pip-n">Step 01</div>
              <div className="pip-icon">📄</div>
              <div className="pip-t">Parse Resumes</div>
              <div className="pip-d">PDF, DOC, DOCX accepted. PyMuPDF + pdfplumber extract raw text from any layout — multi-column, scanned, or templated.</div>
            </div>
            <div className="pip-card">
              <div className="pip-n">Step 02</div>
              <div className="pip-icon">🧠</div>
              <div className="pip-t">Extract Data</div>
              <div className="pip-d">SpaCy NER + Groq llama-3.1-8b. Skills, CGPA, projects, internships converted to structured JSON. Hallucination-guarded.</div>
            </div>
            <div className="pip-card">
              <div className="pip-n">Step 03</div>
              <div className="pip-icon">⚖️</div>
              <div className="pip-t">Score Candidates</div>
              <div className="pip-d">12 factors × PS-defined weights. Anti-overfitting guards applied. Scores are deterministic and reproducible across runs.</div>
            </div>
            <div className="pip-card">
              <div className="pip-n">Step 04</div>
              <div className="pip-icon">🏆</div>
              <div className="pip-t">Rank Results</div>
              <div className="pip-d">Candidates sorted deterministically. Tie-breaking by sub-score hierarchy. Every point justified by extracted evidence.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="matrix-section" className="reveal-on-scroll">
        <div className="matrix-bg">
          <div className="matrix-grid-lines"></div>
          <div className="matrix-vignette"></div>
        </div>
        <div className="matrix-inner">
          <div className="matrix-header">
            <div className="matrix-label">Live Leaderboard</div>
            <div className="matrix-title">See how candidates<br />stack up instantly.</div>
            <div className="matrix-sub">AI processes 25 resumes in under 30 seconds — scores, ranks, and classifies every candidate automatically.</div>
          </div>

          <div className="lb-grid">
            {/* Left: Live Log Feed */}
            <div className="lb-log-panel">
              <div className="lb-panel-header">
                <span className="lb-dot" style={{ background: "var(--emerald)" }}></span>
                Live Processing Feed
              </div>
              <div id="log-container" ref={logRef} className="lb-log-body"></div>
              <div className="lb-metrics">
                <div className="lb-metric"><span className="lb-metric-val">{parsed}</span><span className="lb-metric-lbl">Parsed</span></div>
                <div className="lb-metric"><span className="lb-metric-val">{acc}%</span><span className="lb-metric-lbl">Accuracy</span></div>
                <div className="lb-metric"><span className="lb-metric-val">1.8s</span><span className="lb-metric-lbl">Avg Time</span></div>
                <div className="lb-metric"><span className="lb-metric-val">{ranked}</span><span className="lb-metric-lbl">Ranked</span></div>
              </div>
            </div>

            {/* Right: Candidate Leaderboard Cards */}
            <div className="lb-cards">
              {rankData.map((r, idx) => (
                <div key={idx} className={`lb-card ${idx === 0 ? 'lb-card-top' : ''}`} style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="lb-rank">#{r.rank}</div>
                  <div className="lb-avatar" style={{ background: r.c, color: r.cc, borderColor: r.cc }}>{r.i}</div>
                  <div className="lb-info">
                    <div className="lb-name">{r.n}</div>
                    <div className="lb-role">{r.r}</div>
                  </div>
                  <div className="lb-score-area">
                    <div className={`lb-score-num ${r.score >= 80 ? 'sc-hi' : r.score >= 60 ? 'sc-md' : 'sc-lo'}`}>{r.score}</div>
                    <div className="lb-score-bar"><div className="lb-score-fill" style={{ width: `${r.score}%`, background: r.score >= 80 ? 'var(--emerald)' : r.score >= 60 ? 'var(--amber)' : 'var(--rose)' }}></div></div>
                  </div>
                  <div className={`lb-badge ${r.bc}`}>{r.badge}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="scoring" className="reveal-on-scroll">
        <div className="ctr">
          <div className="slabel">Scoring Engine</div>
          <div className="stitle">Transparent scores.<br />No gaming allowed.</div>
          <p className="ssub">12 research-backed factors with fixed, publicly defined weights. Scores are deterministic, reproducible, and immune to resume padding.</p>

          <div className="compare-grid">
            {/* Candidate A - Top */}
            <div className="compare-card compare-top">
              <div className="cc-header">
                <div className="cc-avatar" style={{ background: "rgba(0,212,255,.13)", color: "var(--cyan)", borderColor: "rgba(0,212,255,.4)" }}>ST</div>
                <div className="cc-info">
                  <div className="cc-name">Shashank Tomar</div>
                  <div className="cc-role">Full Stack Developer</div>
                </div>
                <div className="cc-score-ring">
                  <svg viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--emerald)" strokeWidth="5" strokeDasharray={`${91 * 2.136} ${214 - 91 * 2.136}`} strokeLinecap="round" transform="rotate(-90 40 40)" className="cc-ring-fill" />
                  </svg>
                  <span className="cc-score-val sc-hi">91</span>
                </div>
              </div>
              <div className="cc-badge badge-hire">HIRE</div>
              <div className="cc-factors">
                {[
                  { n: "Internships", s: 20, m: 20, c: "var(--cyan)" },
                  { n: "Skills & Certs", s: 18, m: 20, c: "var(--violet2)" },
                  { n: "Projects", s: 15, m: 15, c: "var(--emerald)" },
                  { n: "CGPA", s: 9, m: 10, c: "var(--amber)" },
                  { n: "Achievements", s: 8, m: 10, c: "var(--rose)" },
                  { n: "Experience", s: 5, m: 5, c: "var(--cyan)" },
                  { n: "Extra-curricular", s: 4, m: 5, c: "var(--violet2)" },
                  { n: "Degree", s: 3, m: 3, c: "var(--emerald)" },
                  { n: "Online Presence", s: 3, m: 3, c: "var(--amber)" },
                  { n: "Languages", s: 3, m: 3, c: "var(--cyan)" },
                  { n: "College", s: 2, m: 2, c: "var(--violet2)" },
                  { n: "School", s: 1, m: 2, c: "var(--emerald)" },
                ].map((f, i) => (
                  <div key={i} className="cc-factor">
                    <div className="cc-f-row"><span className="cc-f-name">{f.n}</span><span className="cc-f-score">{f.s}/{f.m}</span></div>
                    <div className="cc-f-track"><div className="cc-f-fill" style={{ width: `${(f.s / f.m) * 100}%`, background: f.c }}></div></div>
                  </div>
                ))}
              </div>
            </div>

            {/* VS Divider */}
            <div className="compare-vs">
              <div className="vs-line"></div>
              <div className="vs-badge">VS</div>
              <div className="vs-line"></div>
            </div>

            {/* Candidate B - Lower */}
            <div className="compare-card">
              <div className="cc-header">
                <div className="cc-avatar" style={{ background: "rgba(255,77,109,.1)", color: "var(--rose)", borderColor: "rgba(255,77,109,.3)" }}>SM</div>
                <div className="cc-info">
                  <div className="cc-name">Sara Mehta</div>
                  <div className="cc-role">DevOps Engineer</div>
                </div>
                <div className="cc-score-ring">
                  <svg viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--rose)" strokeWidth="5" strokeDasharray={`${48 * 2.136} ${214 - 48 * 2.136}`} strokeLinecap="round" transform="rotate(-90 40 40)" className="cc-ring-fill" />
                  </svg>
                  <span className="cc-score-val sc-lo">48</span>
                </div>
              </div>
              <div className="cc-badge badge-pass">PASS</div>
              <div className="cc-factors">
                {[
                  { n: "Internships", s: 0, m: 20, c: "var(--cyan)" },
                  { n: "Skills & Certs", s: 10, m: 20, c: "var(--violet2)" },
                  { n: "Projects", s: 10, m: 15, c: "var(--emerald)" },
                  { n: "CGPA", s: 7, m: 10, c: "var(--amber)" },
                  { n: "Achievements", s: 2, m: 10, c: "var(--rose)" },
                  { n: "Experience", s: 0, m: 5, c: "var(--cyan)" },
                  { n: "Extra-curricular", s: 1, m: 5, c: "var(--violet2)" },
                  { n: "Degree", s: 2, m: 3, c: "var(--emerald)" },
                  { n: "Online Presence", s: 1, m: 3, c: "var(--amber)" },
                  { n: "Languages", s: 1, m: 3, c: "var(--cyan)" },
                  { n: "College", s: 0, m: 2, c: "var(--violet2)" },
                  { n: "School", s: 1, m: 2, c: "var(--emerald)" },
                ].map((f, i) => (
                  <div key={i} className="cc-factor">
                    <div className="cc-f-row"><span className="cc-f-name">{f.n}</span><span className="cc-f-score">{f.s}/{f.m}</span></div>
                    <div className="cc-f-track"><div className="cc-f-fill" style={{ width: `${(f.s / f.m) * 100}%`, background: f.c }}></div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2D Donut Chart - Score Distribution */}
          <div className="donut-section">
            <div className="donut-title">Score Distribution — 100 Points</div>
            <div className="donut-layout">
              <div className="donut-wrapper">
                <svg className="donut-svg" viewBox="0 0 200 200">
                  {(() => {
                    const data = [
                      { n: "Internships", v: 20, c: "#06B6D4" },
                      { n: "Skills", v: 20, c: "#7C3AED" },
                      { n: "Projects", v: 15, c: "#10B981" },
                      { n: "CGPA", v: 10, c: "#F59E0B" },
                      { n: "Achievements", v: 10, c: "#F43F5E" },
                      { n: "Experience", v: 5, c: "#0EA5E9" },
                      { n: "Extra-curricular", v: 5, c: "#A78BFA" },
                      { n: "Degree", v: 3, c: "#E879F9" },
                      { n: "Online Presence", v: 3, c: "#FB923C" },
                      { n: "Languages", v: 3, c: "#34D399" },
                      { n: "College", v: 2, c: "#67E8F9" },
                      { n: "School", v: 2, c: "#FDE68A" },
                    ];
                    const r = 80, cx = 100, cy = 100, circ = 2 * Math.PI * r;
                    const total = data.reduce((a, d) => a + d.v, 0);
                    let offset = 0;
                    return data.map((d, i) => {
                      const dash = (d.v / total) * circ;
                      const gap = circ - dash;
                      const el = (
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.c} strokeWidth="28"
                          strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
                          transform={`rotate(-90 ${cx} ${cy})`} style={{ opacity: 0.9 }} />
                      );
                      offset += dash;
                      return el;
                    });
                  })()}
                  <circle cx="100" cy="100" r="56" fill="var(--bg2)" />
                  <text x="100" y="95" textAnchor="middle" fill="var(--cyan)" fontFamily="var(--font-mono)" fontSize="22" fontWeight="800">100</text>
                  <text x="100" y="112" textAnchor="middle" fill="var(--muted2)" fontFamily="var(--font-mono)" fontSize="8" letterSpacing=".1em">POINTS</text>
                </svg>
              </div>
              <div className="donut-legend">
                {[
                  { n: "Internships", v: 20, c: "#06B6D4" },
                  { n: "Skills & Certs", v: 20, c: "#7C3AED" },
                  { n: "Projects", v: 15, c: "#10B981" },
                  { n: "CGPA", v: 10, c: "#F59E0B" },
                  { n: "Achievements", v: 10, c: "#F43F5E" },
                  { n: "Experience", v: 5, c: "#0EA5E9" },
                  { n: "Extra-curricular", v: 5, c: "#A78BFA" },
                  { n: "Degree Quality", v: 3, c: "#E879F9" },
                  { n: "Online Presence", v: 3, c: "#FB923C" },
                  { n: "Languages", v: 3, c: "#34D399" },
                  { n: "College Tier", v: 2, c: "#67E8F9" },
                  { n: "School Marks", v: 2, c: "#FDE68A" },
                ].map((item, idx) => (
                  <div key={idx} className="donut-legend-item">
                    <span className="donut-dot" style={{ background: item.c }}></span>
                    <span className="donut-legend-name">{item.n}</span>
                    <span className="donut-legend-val">{Math.round(item.v / 1.03)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <div className="aof">⚡ word_count is NOT a scoring signal — resume length cannot inflate scores</div>
          </div>
        </div>
      </section>

      <section id="demo" className="reveal-on-scroll">
        <div className="ctr">
          <div className="slabel">Interactive Demo</div>
          <div className="stitle">Select. Inspect. Decide.</div>
          <div className="dshell">
            <div className="dtop">
              <div className="ddot" style={{ background: "#ff4d6d" }}></div>
              <div className="ddot" style={{ background: "#fbbf24" }}></div>
              <div className="ddot" style={{ background: "#00ffa3" }}></div>
              <span className="dtitle">TalentScout AI — Dashboard Preview</span>
            </div>
            <div className="dbody">
              <div className="dsb">
                <div className="dsbl">Ranked Candidates</div>
                {demoCands.map((cand, idx) => (
                  <div key={idx} className={`cr ${selC === idx ? "ac" : ""}`} onClick={() => setSelC(idx)}>
                    <div className="ca" style={{ background: idx === 0 ? "rgba(0,212,255,.13)" : idx === 1 ? "rgba(139,92,246,.13)" : "rgba(251,191,36,.13)", color: idx === 0 ? "var(--cyan)" : idx === 1 ? "var(--violet2)" : "var(--amber)" }}>
                      {cand.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="ci">
                      <div className="cn">{cand.name}</div>
                      <div className="crole">{cand.role}</div>
                    </div>
                    <div className={`csm ${cand.score >= 80 ? 's-hi' : cand.score >= 60 ? 's-md' : 's-lo'}`}>{cand.score}</div>
                  </div>
                ))}
                <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid rgba(0,212,255,.06)" }}>
                  <div style={{ border: "1px dashed rgba(0,212,255,.2)", borderRadius: "5px", padding: "14px", textAlign: "center", cursor: "pointer" }} onClick={() => window.location.href = '/dashboard'}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: ".65rem", color: "var(--muted2)" }}><span style={{ color: "var(--cyan)" }}>Upload PDF</span></div>
                  </div>
                </div>
              </div>
              <div className="dm">
                <div className="dch">
                  <div>
                    <div className="dcn">{c.name}</div>
                    <div className="dcm">
                      <span className="mc2">{c.role}</span><span className="mc2">📍 {c.loc}</span>
                      <span className="mc2">cgpa={c.cgpa}</span><span className="mc2">internships={c.interns}</span><span className="mc2">projects={c.proj}</span>
                    </div>
                  </div>
                  <div className="sd2">
                    <div className="sn2" style={{ color: getScoreColor(c.score) }}>{c.score}</div>
                    <div className="sof">// score / 100 · rank #{c.rank}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem", color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "8px" }}>Detected Skills</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {c.skills.map((s, idx) => (
                      <span key={idx} style={{ padding: "2px 10px", borderRadius: "3px", background: "rgba(0,212,255,.06)", border: "1px solid rgba(0,212,255,.15)", fontFamily: "var(--font-mono)", fontSize: ".68rem", color: "var(--cyan)" }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: ".6rem", color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "8px" }}>Score Breakdown</div>
                  <div className="bgr">
                    {Object.entries(c.bk).map(([k, v]) => (
                      <div key={k} className="bi">
                        <div className="bl">{k}</div>
                        <div className="bv" style={{ color: getScoreColor((v.v / v.m) * 100) }}>{v.v}<span style={{ fontSize: ".58rem", color: "var(--muted2)" }}>/{v.m}</span></div>
                        <div className="bb"><div className="bf" style={{ width: `${(v.v / v.m) * 100}%` }}></div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="dact">
                  <button className="ab ah" onClick={() => window.location.href = '/dashboard'}>Hire Candidate</button>
                  <button className="ab ap" onClick={() => window.location.href = '/dashboard'}>Pass on Candidate</button>
                  <button className="ab ae" onClick={() => window.location.href = '/dashboard'}>Draft AI Email</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="reveal-on-scroll">
        <div className="ctr">
          <div className="slabel">Capabilities</div>
          <div className="stitle">Beyond ranking.<br />Full hiring intelligence.</div>
          <div className="fgrid">
            <div className="fcard"><div className="ficon"><div className="ficon-bg" style={{ background: "rgba(0,212,255,.09)" }}>🔬</div></div><div className="ftitle">Intelligient Extraction</div><div className="fdesc">Groq llama-3.1-8b converts unstructured text into structured JSON — skills, CGPA, internships, projects. Hallucination guards active.</div><div className="ftag" style={{ background: "rgba(0,212,255,.07)", border: "1px solid rgba(0,212,255,.18)", color: "var(--cyan)" }}>llama-3.1-8b</div></div>
            <div className="fcard"><div className="ficon"><div className="ficon-bg" style={{ background: "rgba(139,92,246,.09)" }}>🐙</div></div><div className="ftitle">GitHub Verification</div><div className="fdesc">Auto-detects GitHub usernames. Queries API for repos, commit activity, star count — cross-checking every claimed skill.</div><div className="ftag" style={{ background: "rgba(139,92,246,.07)", border: "1px solid rgba(139,92,246,.18)", color: "var(--violet2)" }}>GitHub API</div></div>
            <div className="fcard"><div className="ficon"><div className="ficon-bg" style={{ background: "rgba(0,255,163,.09)" }}>📋</div></div><div className="ftitle">JD Matching</div><div className="fdesc">Paste a JD and scores recalculate with keyword alignment. Missing skills flagged red. Matching skills boost ranked position.</div><div className="ftag" style={{ background: "rgba(0,255,163,.06)", border: "1px solid rgba(0,255,163,.18)", color: "var(--emerald)" }}>JD Matching</div></div>
            <div className="fcard"><div className="ficon"><div className="ficon-bg" style={{ background: "rgba(251,191,36,.09)" }}>💬</div></div><div className="ftitle">Chat with Resume (RAG)</div><div className="fdesc">Ask any question about any candidate. "Does Priya have Docker experience?" Answers grounded strictly in resume text via RAG.</div><div className="ftag" style={{ background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.18)", color: "var(--amber)" }}>RAG Pipeline</div></div>
            <div className="fcard"><div className="ficon"><div className="ficon-bg" style={{ background: "rgba(255,77,109,.09)" }}>✉️</div></div><div className="ftitle">AI Draft Emails</div><div className="fdesc">One-click accept/reject emails via Groq. Personalized with candidate highlights. Tone configurable. Ready to send.</div><div className="ftag" style={{ background: "rgba(255,77,109,.06)", border: "1px solid rgba(255,77,109,.18)", color: "var(--rose)" }}>AI Draft</div></div>
            <div className="fcard"><div className="ficon"><div className="ficon-bg" style={{ background: "rgba(0,212,255,.09)" }}>📡</div></div><div className="ftitle">Live Log Streaming</div><div className="fdesc">WebSocket-powered live log streaming. Every extraction step visible in real-time. Full pipeline transparency — zero black box.</div><div className="ftag" style={{ background: "rgba(0,212,255,.06)", border: "1px solid rgba(0,212,255,.15)", color: "var(--cyan)" }}>WebSocket</div></div>
          </div>
        </div>
      </section>

      <section id="stack" className="reveal-on-scroll">
        <div className="ctr">
          <div className="slabel" style={{ justifyContent: "center" }}>Stack</div>
          <div className="stitle" style={{ textAlign: "center" }}>Production-grade.<br />Hackathon-speed.</div>
          <div className="tcloud">
            {["Python 3.12", "FastAPI", "SQLite WAL", "SpaCy NER", "PyMuPDF", "pdfplumber", "python-docx", "Groq API", "llama-3.1-8b", "Next.js 15", "TypeScript", "Tailwind CSS", "Three.js", "Framer Motion", "Clerk Auth", "WebSocket", "GitHub API"].map((t) => (
              <span key={t} className="tpill">{t}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="free-cta">
        <div className="ctr" style={{ textAlign: "center" }}>
          <div className="slabel" style={{ justifyContent: "center" }}>100% Free</div>
          <div className="stitle" style={{ textAlign: "center" }}>No paywalls.<br />No limits. Just results.</div>
          <p className="ssub" style={{ textAlign: "center", maxWidth: 520, margin: "20px auto 32px" }}>TalentScout AI is completely free to use — unlimited uploads, full scoring, ranking, and all features included. Built for the hackathon, made for everyone.</p>
          <button className="bp" style={{ margin: "0 auto" }} onClick={() => window.location.href = '/dashboard'}>Start Screening — Free</button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="flogo">TALENTSCOUT AI</div>
              <p className="footer-tagline">AI-powered resume screening that's transparent, deterministic, and free. Upload once — get ranked candidates in seconds.</p>
              <button className="bp footer-cta" onClick={() => window.location.href = '/dashboard'}>Get Started Free</button>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <a href="#how">Pipeline</a>
              <a href="#scoring">Scoring Engine</a>
              <a href="#demo">Live Demo</a>
              <a href="#features">Features</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Stack</div>
              <a href="#stack">FastAPI + Python</a>
              <a href="#stack">Next.js 15</a>
              <a href="#stack">Groq AI (Llama 3.1)</a>
              <a href="#stack">GitHub API</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Hackathon</div>
              <span className="footer-info">Smart ABES Hackathon 2.0</span>
              <span className="footer-info">Problem Statement AI-PS-1</span>
              <span className="footer-info">Team: xnords</span>
              <span className="footer-info highlight">100% Free · Open Source</span>
            </div>
          </div>
          <div className="footer-divider"></div>
          <div className="footer-bottom">
            <span>© 2026 TalentScout AI · All rights reserved</span>
            <div className="footer-bottom-links">
              <span className="dev-credit">Developed by <a href="https://github.com/shashank-tomar0" target="_blank" rel="noopener noreferrer">Shashank Tomar</a></span>
              <a href="#hero">Back to top ↑</a>
            </div>
          </div>
        </div>
      </footer>
    </div >
  );
}
