import { useState, useRef, useCallback } from "react";

const C = {
  bg:"#080C10", surface:"#0E1520", card:"#131D2B", border:"#1E2D42",
  accent:"#00E5C3", accentDim:"#00B89A", gold:"#F5A623", red:"#FF4D6A",
  text:"#E8EDF5", muted:"#6B7E96", hover:"#1A2840",
};

let userStore = [];

async function analyzeResume(resumeText, jobDesc) {
  const prompt = `You are an expert ATS (Applicant Tracking System) and resume coach.
Analyze the following resume${jobDesc ? " against the provided job description" : ""}.

RESUME:
${resumeText}
${jobDesc ? `\nJOB DESCRIPTION:\n${jobDesc}\n` : ""}

Respond ONLY with a valid JSON object — no markdown fences, no extra text — using exactly this structure:
{
  "atsScore": <integer 0-100>,
  "overallGrade": "<A+|A|B+|B|C+|C|D|F>",
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<s1>","<s2>","<s3>"],
  "improvements": ["<i1>","<i2>","<i3>"],
  "keywords": {
    "found":   ["<k1>","<k2>","<k3>","<k4>","<k5>"],
    "missing": ["<k1>","<k2>","<k3>","<k4>"],
    "density": <integer 0-100>
  },
  "sections": {
    "contactInfo": <integer 0-100>,
    "summary":     <integer 0-100>,
    "experience":  <integer 0-100>,
    "skills":      <integer 0-100>,
    "education":   <integer 0-100>,
    "formatting":  <integer 0-100>
  },
  "readabilityScore": <integer 0-100>,
  "impactScore":      <integer 0-100>,
  "topSuggestion":    "<single most important action>"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

function ScoreRing({ score, size = 120, label }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? C.accent : score >= 60 ? C.gold : C.red;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ marginTop:-(size/2)-20, textAlign:"center", zIndex:1 }}>
        <div style={{ fontSize:size*0.28, fontWeight:800, color, fontFamily:"'Space Mono',monospace" }}>{score}</div>
        <div style={{ fontSize:10, color:C.muted, letterSpacing:1, textTransform:"uppercase" }}>{label}</div>
      </div>
    </div>
  );
}

function Bar({ label, value }) {
  const c = value >= 80 ? C.accent : value >= 60 ? C.gold : C.red;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontSize:13, color:C.muted }}>{label}</span>
        <span style={{ fontSize:13, color:c, fontFamily:"'Space Mono',monospace", fontWeight:700 }}>{value}</span>
      </div>
      <div style={{ height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${value}%`, height:"100%", background:c, borderRadius:3, transition:"width 1.2s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

function Tag({ text, type }) {
  const s = type === "found"
    ? { bg:"#0A2E25", border:C.accent, color:C.accent }
    : { bg:"#2E1020", border:C.red, color:C.red };
  return (
    <span style={{ display:"inline-block", padding:"4px 10px", borderRadius:4, background:s.bg, border:`1px solid ${s.border}`, color:s.color, fontSize:12, fontFamily:"'Space Mono',monospace", margin:"3px", letterSpacing:.5 }}>
      {text}
    </span>
  );
}

function Input({ label, type = "text", value, onChange, placeholder }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:6, letterSpacing:1, textTransform:"uppercase" }}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ width:"100%", padding:"12px 14px", background:C.bg, border:`1px solid ${focus ? C.accent : C.border}`, borderRadius:8, color:C.text, fontSize:14, outline:"none", fontFamily:"inherit", boxSizing:"border-box", transition:"border-color .2s", boxShadow:focus ? `0 0 0 3px ${C.accent}20` : "none" }} />
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", style, disabled }) {
  const [hover, setHover] = useState(false);
  const base = { padding:"12px 24px", borderRadius:8, border:"none", cursor:disabled?"not-allowed":"pointer", fontSize:14, fontWeight:700, letterSpacing:.5, fontFamily:"inherit", transition:"all .2s", opacity:disabled?.5:1, ...style };
  const vars = {
    primary: { background:hover?C.accentDim:C.accent, color:"#000" },
    outline: { background:hover?C.hover:"transparent", color:C.accent, border:`1px solid ${C.accent}` },
    ghost:   { background:hover?C.hover:"transparent", color:C.muted },
  };
  return (
    <button onClick={disabled?undefined:onClick} style={{...base,...vars[variant]}}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {children}
    </button>
  );
}

// ── AUTH PAGE ─────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode,    setMode]    = useState("login");
  const [form,    setForm]    = useState({ name:"", email:"", password:"" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setError("");
    if (!form.email || !form.password) return setError("Please fill all required fields.");
    setLoading(true);
    if (mode === "signup") {
      if (!form.name) { setLoading(false); return setError("Full name is required."); }
      if (userStore.find(u => u.email === form.email)) { setLoading(false); return setError("Email already exists."); }
      await new Promise(r => setTimeout(r, 700));
      userStore.push({ name:form.name, email:form.email, password:form.password });
      onAuth({ name:form.name, email:form.email });
    } else {
      await new Promise(r => setTimeout(r, 500));
      const user = userStore.find(u => u.email === form.email && u.password === form.password);
      if (!user) { setLoading(false); return setError("Invalid email or password."); }
      onAuth({ name:user.name, email:user.email });
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Sora','Segoe UI',sans-serif", padding:20, backgroundImage:`radial-gradient(ellipse at 20% 50%,${C.accent}08 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,#5B67F530 0%,transparent 50%)` }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');*{box-sizing:border-box;}body{margin:0;}input::placeholder,textarea::placeholder{color:#6B7E96;}`}</style>
      <div style={{ width:"100%", maxWidth:440 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:44, height:44, background:`linear-gradient(135deg,${C.accent},#5B67F5)`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, boxShadow:`0 0 30px ${C.accent}40` }}>📄</div>
            <span style={{ fontSize:26, fontWeight:800, color:C.text, letterSpacing:-.5 }}>AIresume<span style={{color:C.accent}}>Prompt</span></span>
          </div>
          <p style={{ color:C.muted, fontSize:14, margin:0 }}>Beat the ATS. Land the interview.</p>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:18, padding:"36px 32px", boxShadow:"0 24px 80px #00000080" }}>
          <div style={{ display:"flex", background:C.bg, borderRadius:10, padding:4, marginBottom:28 }}>
            {["login","signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex:1, padding:"10px 0", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:14, transition:"all .2s", background:mode===m?C.card:"transparent", color:mode===m?C.text:C.muted }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>
          {mode === "signup" && <Input label="Full Name" value={form.name} onChange={set("name")} placeholder="Jane Smith" />}
          <Input label="Email" type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" />
          <Input label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" />
          {error && <div style={{ background:"#2E1020", border:`1px solid ${C.red}`, borderRadius:8, padding:"10px 14px", marginBottom:16, color:C.red, fontSize:13 }}>⚠️ {error}</div>}
          <Btn onClick={submit} disabled={loading} style={{ width:"100%", marginTop:4 }}>
            {loading ? "⏳ Please wait…" : mode === "login" ? "Sign In  →" : "Create Account  →"}
          </Btn>
          <p style={{ textAlign:"center", color:C.muted, fontSize:13, marginTop:20, marginBottom:0 }}>
            {mode === "login" ? "No account? " : "Already have one? "}
            <span onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ color:C.accent, cursor:"pointer", fontWeight:600 }}>
              {mode === "login" ? "Sign Up" : "Sign In"}
            </span>
          </p>
        </div>
        <p style={{ textAlign:"center", color:C.muted, fontSize:12, marginTop:20 }}>🔒 Resume data is processed securely and never stored.</p>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ user, onNewScan, analyses }) {
  const avg = analyses.length ? Math.round(analyses.reduce((a,b) => a+b.atsScore, 0) / analyses.length) : 0;
  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{ marginBottom:32 }}>
        <h2 style={{ margin:"0 0 4px", fontSize:22, color:C.text }}>Welcome back, {user.name.split(" ")[0]} 👋</h2>
        <p style={{ margin:0, color:C.muted, fontSize:14 }}>Track your resume performance and improvements over time.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:16, marginBottom:32 }}>
        {[
          { label:"Resumes Analyzed", value:analyses.length, icon:"📄" },
          { label:"Avg ATS Score",    value:avg||"—",         icon:"🎯" },
          { label:"Best Score",       value:analyses.length?Math.max(...analyses.map(a=>a.atsScore)):"—", icon:"⭐" },
          { label:"Keywords Found",   value:analyses.length?analyses.at(-1)?.keywords?.found?.length??0:"—", icon:"🔑" },
        ].map(s => (
          <div key={s.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 20px 16px" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:28, fontWeight:800, color:C.text, fontFamily:"'Space Mono',monospace" }}>{s.value}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background:`linear-gradient(135deg,${C.accent}15,#5B67F515)`, border:`1px solid ${C.accent}30`, borderRadius:16, padding:"28px 32px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16, marginBottom:32 }}>
        <div>
          <h3 style={{ margin:"0 0 6px", color:C.text, fontSize:18 }}>Analyze Your Resume</h3>
          <p style={{ margin:0, color:C.muted, fontSize:14 }}>Instant ATS score, keyword analysis, and actionable feedback.</p>
        </div>
        <Btn onClick={onNewScan}>🚀 Start New Analysis</Btn>
      </div>
      {analyses.length > 0 && (
        <div>
          <h3 style={{ margin:"0 0 16px", color:C.text, fontSize:16 }}>Recent Analyses</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[...analyses].reverse().map((a,i) => {
              const col = a.atsScore>=80?C.accent:a.atsScore>=60?C.gold:C.red;
              return (
                <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:14, color:C.text, fontWeight:600 }}>{a.fileName}</div>
                    <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{a.date} · Grade: {a.overallGrade}</div>
                  </div>
                  <div style={{ fontSize:26, fontWeight:800, color:col, fontFamily:"'Space Mono',monospace" }}>{a.atsScore}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── UPLOAD PAGE ───────────────────────────────────────────────────────────────
function UploadPage({ onResult }) {
  const [file,    setFile]    = useState(null);
  const [text,    setText]    = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [drag,    setDrag]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [step,    setStep]    = useState("Ready to analyze…");
  const fileRef = useRef();

  const readFile = f => { setFile(f); const r = new FileReader(); r.onload = e => setText(e.target.result); r.readAsText(f); };
  const onDrop = useCallback(e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if(f) readFile(f); }, []);

  const analyze = async () => {
    if (!text.trim()) return setError("Please upload a resume or paste text first.");
    setError(""); setLoading(true);
    try {
      setStep("Parsing resume structure…");   await new Promise(r => setTimeout(r,600));
      setStep("Running ATS simulation…");     await new Promise(r => setTimeout(r,400));
      setStep("Analyzing keywords & impact…");
      const result = await analyzeResume(text, jobDesc);
      onResult(result, file?.name || "Pasted Resume");
    } catch { setError("Analysis failed. Please check your input and try again."); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:720, margin:"0 auto", paddingBottom:40 }}>
      <div style={{ marginBottom:28 }}>
        <h2 style={{ margin:"0 0 6px", fontSize:22, color:C.text }}>Resume Analyzer</h2>
        <p style={{ margin:0, color:C.muted, fontSize:14 }}>Upload or paste your resume for instant ATS scoring and keyword analysis.</p>
      </div>
      <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={onDrop} onClick={()=>fileRef.current.click()}
        style={{ border:`2px dashed ${drag?C.accent:file?C.accentDim:C.border}`, borderRadius:16, padding:"44px 24px", textAlign:"center", background:drag?`${C.accent}08`:file?`${C.accent}05`:C.card, cursor:"pointer", transition:"all .2s", marginBottom:20 }}>
        <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx" onChange={e=>e.target.files[0]&&readFile(e.target.files[0])} style={{display:"none"}} />
        <div style={{ fontSize:44, marginBottom:12 }}>{file?"✅":"📂"}</div>
        {file ? (
          <><div style={{ fontSize:15, fontWeight:700, color:C.accent }}>{file.name}</div><div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{text.length.toLocaleString()} characters · click to replace</div></>
        ) : (
          <><div style={{ fontSize:15, fontWeight:700, color:C.text }}>Drop your resume here</div><div style={{ fontSize:13, color:C.muted, marginTop:6 }}>TXT · PDF · DOC · DOCX &nbsp;or&nbsp; click to browse</div></>
        )}
      </div>
      <div style={{ marginBottom:20 }}>
        <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:6, letterSpacing:1, textTransform:"uppercase" }}>Or paste resume text</label>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Paste the full text of your resume here…"
          style={{ width:"100%", minHeight:140, padding:"12px 14px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, outline:"none", fontFamily:"'Space Mono',monospace", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }} />
      </div>
      <div style={{ marginBottom:28 }}>
        <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:6, letterSpacing:1, textTransform:"uppercase" }}>Job Description <span style={{color:C.border,textTransform:"none",letterSpacing:0}}>— optional, improves accuracy</span></label>
        <textarea value={jobDesc} onChange={e=>setJobDesc(e.target.value)} placeholder="Paste the job description for tailored keyword matching…"
          style={{ width:"100%", minHeight:100, padding:"12px 14px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, outline:"none", fontFamily:"inherit", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }} />
      </div>
      {error && <div style={{ background:"#2E1020", border:`1px solid ${C.red}`, borderRadius:8, padding:"12px 16px", marginBottom:16, color:C.red, fontSize:13 }}>⚠️ {error}</div>}
      {loading && (
        <div style={{ background:C.card, border:`1px solid ${C.accent}30`, borderRadius:12, padding:"20px 24px", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:20, height:20, border:`3px solid ${C.accent}30`, borderTop:`3px solid ${C.accent}`, borderRadius:"50%", animation:"spin .8s linear infinite", flexShrink:0 }} />
            <span style={{ color:C.accent, fontSize:14, fontWeight:600 }}>{step}</span>
          </div>
        </div>
      )}
      <Btn onClick={analyze} disabled={loading} style={{ width:"100%" }}>
        {loading ? "Analyzing…" : "🔍  Analyze Resume"}
      </Btn>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

// ── RESULTS PAGE ──────────────────────────────────────────────────────────────
function ResultsPage({ result, fileName, onBack, onNewScan }) {
  const sections = result.sections || {};
  const labels = { contactInfo:"Contact Info", summary:"Summary / Objective", experience:"Work Experience", skills:"Skills", education:"Education", formatting:"Formatting" };
  const gradeColor = result.atsScore>=80?C.accent:result.atsScore>=60?C.gold:C.red;
  return (
    <div style={{ maxWidth:820, margin:"0 auto", paddingBottom:60 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize:22, color:C.text }}>Analysis Complete</h2>
          <p style={{ margin:0, color:C.muted, fontSize:13 }}>{fileName}</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={onBack} variant="ghost">← Dashboard</Btn>
          <Btn onClick={onNewScan} variant="outline">+ New Scan</Btn>
        </div>
      </div>
      {/* Hero */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:"32px 28px", marginBottom:20, backgroundImage:`radial-gradient(ellipse at top right,${C.accent}08,transparent 60%)` }}>
        <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:32 }}>
          <ScoreRing score={result.atsScore} size={130} label="ATS Score" />
          <div style={{ flex:1, minWidth:220 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
              <span style={{ fontSize:38, fontWeight:900, color:gradeColor, fontFamily:"'Space Mono',monospace" }}>{result.overallGrade}</span>
              <span style={{ color:C.muted, fontSize:14 }}>Overall Grade</span>
            </div>
            <p style={{ margin:"0 0 16px", color:C.text, fontSize:14, lineHeight:1.75 }}>{result.summary}</p>
            <div style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}30`, borderRadius:10, padding:"12px 16px", fontSize:13, color:C.accent }}>
              💡 <strong>Top Action:</strong> {result.topSuggestion}
            </div>
          </div>
        </div>
      </div>
      {/* Mini scores */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
        {[{label:"Readability",score:result.readabilityScore,icon:"📖"},{label:"Impact",score:result.impactScore,icon:"⚡"},{label:"Keyword Density",score:result.keywords?.density,icon:"🔑"}].map(s => {
          const c = s.score>=80?C.accent:s.score>=60?C.gold:C.red;
          return (
            <div key={s.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"18px 20px", textAlign:"center" }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontSize:28, fontWeight:800, color:c, fontFamily:"'Space Mono',monospace" }}>{s.score}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
      {/* Strengths + Improvements */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16, marginBottom:16 }}>
        {[{title:"✅ Strengths",items:result.strengths,color:C.accent},{title:"🔧 Improvements",items:result.improvements,color:C.gold}].map(col => (
          <div key={col.title} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"22px" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:15, color:C.text }}>{col.title}</h3>
            {(col.items||[]).map((s,i) => (
              <div key={i} style={{ display:"flex", gap:10, marginBottom:12 }}>
                <span style={{ color:col.color, flexShrink:0 }}>◆</span>
                <span style={{ color:C.muted, fontSize:13, lineHeight:1.65 }}>{s}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Section breakdown */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"22px 24px", marginBottom:16 }}>
        <h3 style={{ margin:"0 0 20px", fontSize:15, color:C.text }}>📊 Section Breakdown</h3>
        {Object.entries(sections).map(([k,v]) => <Bar key={k} label={labels[k]||k} value={v} />)}
      </div>
      {/* Keywords */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"22px 24px" }}>
        <h3 style={{ margin:"0 0 16px", fontSize:15, color:C.text }}>🔑 Keyword Analysis</h3>
        <div style={{ marginBottom:16 }}>
          <p style={{ margin:"0 0 10px", fontSize:13, color:C.muted }}><span style={{color:C.accent}}>✔ Found</span> in your resume:</p>
          <div>{(result.keywords?.found||[]).map(k => <Tag key={k} text={k} type="found" />)}</div>
        </div>
        <div>
          <p style={{ margin:"0 0 10px", fontSize:13, color:C.muted }}><span style={{color:C.red}}>✘ Missing</span> — consider adding:</p>
          <div>{(result.keywords?.missing||[]).map(k => <Tag key={k} text={k} type="missing" />)}</div>
        </div>
      </div>
    </div>
  );
}

// ── SIDEBAR LAYOUT ────────────────────────────────────────────────────────────
function Sidebar({ user, page, setPage, hasResult, onLogout }) {
  const navItems = [
    { id:"dashboard", label:"Dashboard", icon:"⊞" },
    { id:"upload",    label:"Analyze",   icon:"🔍" },
    ...(hasResult ? [{ id:"results", label:"Results", icon:"📊" }] : []),
  ];
  return (
    <div style={{ position:"fixed", top:0, left:0, bottom:0, width:224, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", zIndex:100 }}>
      <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, background:`linear-gradient(135deg,${C.accent},#5B67F5)`, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:`0 0 20px ${C.accent}30` }}>📄</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:C.text, letterSpacing:-.3 }}>AIresume</div>
            <div style={{ fontSize:11, color:C.accent, fontWeight:700, letterSpacing:1.5 }}>PROMPT</div>
          </div>
        </div>
      </div>
      <nav style={{ flex:1, padding:"16px 12px" }}>
        {navItems.map(n => {
          const active = page===n.id;
          return (
            <div key={n.id} onClick={() => setPage(n.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 13px", borderRadius:10, cursor:"pointer", marginBottom:4, transition:"all .18s", background:active?`${C.accent}18`:"transparent", border:`1px solid ${active?C.accent+"40":"transparent"}`, color:active?C.accent:C.muted, fontSize:14, fontWeight:active?700:400 }}>
              <span style={{fontSize:16}}>{n.icon}</span><span>{n.label}</span>
            </div>
          );
        })}
      </nav>
      <div style={{ padding:"16px 16px 22px", borderTop:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},#5B67F5)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#000", fontSize:15, flexShrink:0 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow:"hidden" }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.name}</div>
            <div style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.email}</div>
          </div>
        </div>
        <Btn onClick={onLogout} variant="ghost" style={{ width:"100%", fontSize:12, padding:"8px 12px" }}>Sign Out</Btn>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,     setUser]     = useState(null);
  const [page,     setPage]     = useState("dashboard");
  const [result,   setResult]   = useState(null);
  const [analyses, setAnalyses] = useState([]);

  const onAuth   = u => setUser(u);
  const onLogout = () => { setUser(null); setPage("dashboard"); setResult(null); };
  const onResult = (r, name) => {
    const rec = { ...r, fileName:name, date:new Date().toLocaleDateString() };
    setResult(rec);
    setAnalyses(p => [...p, rec]);
    setPage("results");
  };

  if (!user) return <AuthPage onAuth={onAuth} />;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Sora','Segoe UI',sans-serif", color:C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');*{box-sizing:border-box;}body{margin:0;}::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}input::placeholder,textarea::placeholder{color:#6B7E96;}`}</style>
      <Sidebar user={user} page={page} setPage={setPage} hasResult={!!result} onLogout={onLogout} />
      <div style={{ marginLeft:224, padding:"32px 36px", minHeight:"100vh" }}>
        {page==="dashboard" && <Dashboard user={user} onNewScan={()=>setPage("upload")} analyses={analyses} />}
        {page==="upload"    && <UploadPage onResult={onResult} />}
        {page==="results"   && result && <ResultsPage result={result} fileName={result.fileName} onBack={()=>setPage("dashboard")} onNewScan={()=>setPage("upload")} />}
      </div>
    </div>
  );
}
