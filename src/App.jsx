import React, { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Configurable Questions
   ========================= */
const QUESTIONS = [
  { id: "dob", type: "date", label: "Date of Birth", required: true },
  {
    id: "availability_days",
    type: "multi",
    label: "What days are you available to work?",
    options: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    required: true,
  },
  {
    id: "walk10mi",
    type: "single",
    label: "Are you comfortable walking long distances?",
    options: ["Yes","No"],
    required: true,
  },
  {
    id: "weather_ok",
    type: "single",
    label: "Are you comfortable delivering in rainy/cold conditions?",
    options: ["Yes","No"],
    required: true,
  },
  {
    id: "smartphone",
    type: "single",
    label: "Do you have a smartphone with mobile data for navigation during work?",
    options: ["Yes","No"],
    required: true,
  },
  {
    id: "experience",
    type: "longtext",
    label: "Have you any experience in a similar role? (Leaflet delivery, courier etc)",
    placeholder: "Briefly describe your experience",
  },
  {
    id: "nojunk",
    type: "longtext",
    label: "House with a 'No Junk Mail' sticker: what do you do?",
    placeholder: "Describe your approach",
    required: true,
  },
];

/* ============ Utils ============ */
const LS_PREFIX = "leaflet_q_";
const lsKey = (k) => `${LS_PREFIX}${k}`;
const saveLS = (k, v) => localStorage.setItem(lsKey(k), JSON.stringify(v));
const loadLS = (k, fallback) => {
  try { const raw = localStorage.getItem(lsKey(k)); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
};
const clearAllLS = () => {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LS_PREFIX)) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
};
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
const validatePhone = (phone) => /^(\+\d{7,15}|0\d{9,11}|\d{7,15})$/.test(phone);

/* ============ Map Sketch (Pen only) ============ */
function MapSketch({ value, onChange, title, helper, canvasId }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const [imageUrl, setImageUrl] = useState(value?.imageUrl || "");
  const [paths, setPaths] = useState(value?.paths || []);
  const [current, setCurrent] = useState([]);
  const [strokeWidth, setStrokeWidth] = useState(value?.strokeWidth || 4);

  // ✅ FIX: correctly pass new state up (no accidental prev())
  useEffect(() => {
    onChange?.((prev) => ({ ...prev, imageUrl, paths, strokeWidth }));
  }, [imageUrl, paths, strokeWidth, onChange]);

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const drawAll = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imgRef.current && imgRef.current.complete && imageUrl) {
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#ff6666";
    ctx.lineWidth = strokeWidth * dpr;

    const renderPath = (p) => {
      if (!p || !p.length) return;
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
      ctx.stroke();
    };

    paths.forEach(renderPath);
    renderPath(current);
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;

    const w = parent.clientWidth;
    const byAspect = Math.round(w * 0.9);               // wider/taller than before
    const byViewport = Math.round(window.innerHeight * 0.7); // up to 70% viewport height
    const h = Math.max(260, Math.min(byAspect, byViewport));

    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    drawAll();
  };

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, [dpr]);

  useEffect(() => { drawAll(); }, [imageUrl, paths, current, strokeWidth]);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = ("touches" in e ? e.touches[0].clientX : e.clientX);
    const cy = ("touches" in e ? e.touches[0].clientY : e.clientY);
    const x = cx - rect.left;
    const y = cy - rect.top;
    return { x: x * dpr, y: y * dpr };
  };

  const start = (e) => { e.preventDefault(); setCurrent([getPoint(e)]); };
  const move  = (e) => {
    if (!current.length) return;
    if ("touches" in e) e.preventDefault();   // stop the page from scrolling while drawing
    setCurrent((c)=>[...c, getPoint(e)]);
  };
  const end   = (e) => {
    if (current.length){
      if ("touches" in e) e.preventDefault();
      setPaths((p)=>[...p, current]);
      setCurrent([]);
    }
  };

  const undo = () => setPaths((p) => p.slice(0, -1));
  const clearAll = () => setPaths([]);

  const toPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  const downloadPNG = () => {
    const link = document.createElement("a");
    link.download = `${title?.toLowerCase().replace(/\s+/g, "-") || "map"}.png`;
    link.href = toPNG();
    link.click();
  };

  return (
    <div className="panel">
      <div className="toolbar">
        <div className="left">
          <div>
            <div style={{fontWeight:700}}>{title}</div>
            {helper && <div className="subtle" style={{marginTop:4}}>{helper}</div>}
          </div>
        </div>
        <div className="right">
          <div className="range">
            <span className="subtle">Width</span>
            <input type="range" min="2" max="14" value={strokeWidth}
                   onChange={(e)=>setStrokeWidth(parseInt(e.target.value,10))}/>
          </div>
          <button className="btn btn-outline" onClick={undo} title="Undo last stroke">Undo</button>
          <button className="btn btn-danger" onClick={clearAll} title="Clear drawing">Clear</button>
          <button className="btn btn-outline" onClick={downloadPNG} title="Download PNG">Download</button>
        </div>
      </div>

      {/* hidden image source */}
      <img ref={imgRef} src={imageUrl} onLoad={drawAll} onError={drawAll} alt="" style={{ display: "none" }} />

      <div className="canvas-wrap" onMouseLeave={end}>
        <canvas
          id={canvasId}
          ref={canvasRef}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
    </div>
  );
}

/* ===== Custom DOB Picker: Year → Month → Day ===== */
function DobPicker({ value, onChange }) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const minYear = 1940;
  const maxYear = currentYear;

  const parse = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return { y: "", m: "", d: "" };
    return { y: m[1], m: m[2], d: m[3] };
  };
  const [state, setState] = useState(parse(value));

  useEffect(() => {
    const { y, m, d } = state;
    if (y && m && d) onChange(`${y}-${m}-${d}`);
    else onChange("");
  }, [state, onChange]);

  const months = [
    ["01","Jan"],["02","Feb"],["03","Mar"],["04","Apr"],["05","May"],["06","Jun"],
    ["07","Jul"],["08","Aug"],["09","Sep"],["10","Oct"],["11","Nov"],["12","Dec"]
  ];

  const daysIn = (y, m) => {
    if (!y || !m) return 31;
    return new Date(parseInt(y,10), parseInt(m,10), 0).getDate();
  };

  const maxDay = daysIn(state.y, state.m);
  const dayOptions = Array.from({length:maxDay}, (_,i)=>String(i+1).padStart(2,"0"));

  return (
    <div className="dob-row">
      <div>
        <label className="block">Year</label>
        <select
          className="input"
          value={state.y}
          onChange={(e)=>setState(s=>({ ...s, y:e.target.value, d: s.d && parseInt(s.d,10) > daysIn(e.target.value, s.m) ? "" : s.d }))}
        >
          <option value="">Year…</option>
          {Array.from({length:(maxYear-minYear+1)}, (_,i)=>String(maxYear - i)).map(y=>(
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block">Month</label>
        <select
          className="input"
          value={state.m}
          onChange={(e)=>setState(s=>({ ...s, m:e.target.value, d: s.d && parseInt(s.d,10) > daysIn(s.y, e.target.value) ? "" : s.d }))}
        >
          <option value="">Month…</option>
          {months.map(([val, label])=>(
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block">Day</label>
        <select
          className="input"
          value={state.d}
          onChange={(e)=>setState(s=>({ ...s, d:e.target.value }))}
          disabled={!state.y || !state.m}
        >
          <option value="">{!state.y || !state.m ? "Select year & month first" : "Day…"}</option>
          {dayOptions.map(d=> <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </div>
  );
}

/* ============ Main App ============ */
export default function App() {
  const [step, setStep] = useState(loadLS("step", 0));
  const [contact, setContact] = useState(loadLS("contact", { name: "", phone: "", email: "" }));
  const [answers, setAnswers] = useState(loadLS("answers", {}));

  // keep a PNG snapshot so we can email it even when canvases are unmounted
  const [mapA, _setMapA] = useState(loadLS("mapA", {
    imageUrl: "/garden-city-map-with-x.png", paths: [], strokeWidth: 4, png: ""
  }));
  const [mapB, _setMapB] = useState(loadLS("mapB", {
    imageUrl: "/creggan-no-x.png", paths: [], strokeWidth: 4, png: ""
  }));

  const setMapA = (updater) => {
    _setMapA(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveLS("mapA", next);
      return next;
    });
  };
  const setMapB = (updater) => {
    _setMapB(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveLS("mapB", next);
      return next;
    });
  };

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => saveLS("step", step), [step]);
  useEffect(() => saveLS("contact", contact), [contact]);
  useEffect(() => saveLS("answers", answers), [answers]);

  const totalSteps = 1 + QUESTIONS.length + 2 + 1;

  const atContact = step === 0;
  const atQuestions = step > 0 && step <= QUESTIONS.length;
  const atMap1 = step === QUESTIONS.length + 1;
  const atMap2 = step === QUESTIONS.length + 2;
  const atReview = step === totalSteps - 1;

  const progressPct = Math.round(((step + 1) / totalSteps) * 100);

  const canContinue = useMemo(() => {
    if (submitted) return false;
    if (atContact) return (
      contact.name.trim().length > 1 &&
      validatePhone(contact.phone.trim()) &&
      validateEmail(contact.email.trim())
    );
    if (atQuestions) {
      const q = QUESTIONS[step - 1];
      if (!q.required) return true;
      const a = answers[q.id];
      if (q.type === "multi") return Array.isArray(a) && a.length > 0;
      return a !== undefined && a !== "";
    }
    return true;
  }, [step, contact, answers, submitted]);

  const onAnswer = (qid, val) => setAnswers((s) => ({ ...s, [qid]: val }));

  // capture PNG when leaving a map step
  const captureMapPNGIfNeeded = () => {
    if (atMap1) {
      const el = document.getElementById("mapA");
      if (el) setMapA(prev => ({ ...prev, png: el.toDataURL("image/png") }));
    }
    if (atMap2) {
      const el = document.getElementById("mapB");
      if (el) setMapB(prev => ({ ...prev, png: el.toDataURL("image/png") }));
    }
  };

  const goNext = () => { captureMapPNGIfNeeded(); setStep((s) => Math.min(totalSteps - 1, s + 1)); };
  const goBack = () => { captureMapPNGIfNeeded(); setStep((s) => Math.max(0, s - 1)); };

  const resetAll = () => {
    if (!confirm("Start again? This will clear all your answers and drawings.")) return;
    clearAllLS();
    setContact({ name: "", phone: "", email: "" });
    setAnswers({});
    setMapA({ imageUrl: "/garden-city-map-with-x.png", paths: [], strokeWidth: 4, png: "" });
    setMapB({ imageUrl: "/creggan-no-x.png", paths: [], strokeWidth: 4, png: "" });
    setSubmitted(false);
    setStep(0);
  };

  const submitEmail = async () => {
    captureMapPNGIfNeeded();
    const payload = {
      subject: `Bee Flyer Application - ${contact.name || "Unknown"}`,
      contact,
      answers,
      mapA,
      mapB,
    };
    try {
      const res = await fetch("/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Send failed");
      setSubmitted(true);
    } catch {
      alert("Could not send application automatically. Please try again later.");
    }
  };

  if (submitted) {
    return (
      <div className="app-wrap">
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <h1 style={{margin:0}}>Thank you</h1>
            <button className="btn btn-danger" onClick={resetAll}>Start again</button>
          </div>
          <p className="subtle">Thank you for your interest, we will contact you to proceed with your application in due course.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrap">
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div>
            <h1 style={{margin:0}}>Bee Flyer – Application</h1>
            <p className="subtle" style={{margin:'4px 0 0'}}>Mobile-friendly questionnaire. Your progress saves automatically.</p>
          </div>
          <button className="btn btn-danger" onClick={resetAll} title="Clear all and restart">Start again</button>
        </div>

        <div className="progress" aria-label={`Progress ${progressPct}%`}>
          <div style={{ width: `${progressPct}%` }} />
        </div>

        {atContact && (
          <section className="panel">
            <label className="block">Full name *</label>
            <input className="input" value={contact.name} onChange={(e)=>setContact({...contact,name:e.target.value})} placeholder="Jane Doe"/>

            <div className="row" style={{marginTop:12}}>
              <div>
                <label className="block">Phone number *</label>
                <input className="input" inputMode="tel" value={contact.phone} onChange={(e)=>setContact({...contact,phone:e.target.value})} placeholder="07… or +44…"/>
              </div>
              <div>
                <label className="block">Email address *</label>
                <input className="input" inputMode="email" value={contact.email} onChange={(e)=>setContact({...contact,email:e.target.value})} placeholder="you@example.com"/>
              </div>
            </div>
          </section>
        )}

        {atQuestions && (
          <QuestionStep
            question={QUESTIONS[step - 1]}
            answer={answers[QUESTIONS[step - 1].id]}
            onAnswer={onAnswer}
          />
        )}

        {atMap1 && (
          <MapSketch
            value={mapA}
            onChange={(updater)=>{ setMapA(prev => (typeof updater === 'function' ? updater(prev) : updater)); }}
            title="Map Task 1"
            helper="Draw a line for the route you would take to deliver to every house in the most efficient way. Start at the X."
            canvasId="mapA"
          />
        )}

        {atMap2 && (
          <MapSketch
            value={mapB}
            onChange={(updater)=>{ setMapB(prev => (typeof updater === 'function' ? updater(prev) : updater)); }}
            title="Map Task 2"
            helper="Draw your route again on this map. First, draw an X where you would start, then draw the route."
            canvasId="mapB"
          />
        )}

        {atReview && (
          <section className="panel">
            <h3 style={{marginTop:0}}>Review & Submit</h3>
            <SummaryCard contact={contact} answers={answers} />
            <div className="btn-group" style={{marginTop:12}}>
              <button className="btn btn-primary" onClick={submitEmail}>Submit Application (Email)</button>
            </div>
          </section>
        )}

        <hr className="sep" />

        <div className="btn-group">
          <button className="btn btn-outline" onClick={goBack} disabled={step===0}>Back</button>
          <button className="btn btn-primary" disabled={!canContinue} onClick={goNext}>
            {atReview ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ Question / Summary ============ */
function QuestionStep({ question, answer, onAnswer }) {
  if (question.id === "dob" && question.type === "date") {
    return (
      <section className="panel">
        <div style={{fontWeight:700, marginBottom:8}}>{question.label}{question.required && " *"}</div>
        <DobPicker value={answer || ""} onChange={(val) => onAnswer(question.id, val)} />
      </section>
    );
  }

  return (
    <section className="panel">
      <div style={{fontWeight:700, marginBottom:8}}>{question.label}{question.required && " *"}</div>

      {question.type === "single" && (
        <div className="btn-group">
          {question.options.map((opt) => (
            <button
              key={opt}
              className={`badge ${answer === opt ? "active" : ""}`}
              onClick={() => onAnswer(question.id, opt)}
              type="button"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "multi" && (
        <div className="btn-group">
          {question.options.map((opt) => {
            const checked = Array.isArray(answer) && answer.includes(opt);
            return (
              <button
                key={opt}
                className={`badge ${checked ? "active" : ""}`}
                onClick={() => {
                  onAnswer(
                    question.id,
                    checked ? answer.filter((x) => x !== opt) : [...(answer || []), opt]
                  );
                }}
                type="button"
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "longtext" && (
        <textarea
          rows={5}
          className="input"
          value={answer || ""}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          placeholder={question.placeholder}
        />
      )}
    </section>
  );
}

function SummaryCard({ contact, answers }) {
  return (
    <div className="panel">
      <div style={{fontWeight:700, marginBottom:8}}>Contact</div>
      <div className="subtle">{contact.name} • {contact.phone} • {contact.email}</div>
      <div style={{fontWeight:700, margin: '14px 0 6px'}}>Answers</div>
      <ul className="list">
        {QUESTIONS.map((q) => (
          <li key={q.id}>
            <span style={{opacity:.9}}>{q.label}:</span>{" "}
            {Array.isArray(answers[q.id]) ? answers[q.id].join(", ") : (answers[q.id] || "—")}
          </li>
        ))}
      </ul>
    </div>
  );
}
