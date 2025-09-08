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
    label: "Are you comfortable walking 10 miles per shift?",
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
  {
    id: "angry_resident",
    type: "longtext",
    label:
      "A resident is angry about receiving a leaflet and tries to hand it back to you; what do you do?",
    placeholder: "Describe how you would handle this",
    required: true,
  },
];

/* ============ Utils ============ */
const lsKey = (k) => `leaflet_q_${k}`;
const saveLS = (k, v) => localStorage.setItem(lsKey(k), JSON.stringify(v));
const loadLS = (k, fallback) => {
  try {
    const raw = localStorage.getItem(lsKey(k));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
const validatePhone = (phone) => /^(\+\d{7,15}|0\d{9,11}|\d{7,15})$/.test(phone);

/* ============ Map Sketch ============ 
   Tool supports 'pen' and 'eraser' via globalCompositeOperation */
function MapSketch({ value, onChange, title, helper, canvasId }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const [imageUrl, setImageUrl] = useState(value?.imageUrl || "");
  const [paths, setPaths] = useState(value?.paths || []); // each: {tool:'pen'|'eraser', width:number, points:[{x,y},...]}
  const [current, setCurrent] = useState(null);           // {tool,width,points:[]}
  const [tool, setTool] = useState("pen");                // 'pen' | 'eraser'
  const [strokeWidth, setStrokeWidth] = useState(value?.strokeWidth || 4);

  useEffect(() => onChange?.({ imageUrl, paths, strokeWidth }), [imageUrl, paths, strokeWidth]);

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const drawAll = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    // clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imgRef.current && imgRef.current.complete && imageUrl) {
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    }

    const renderPath = (p) => {
      if (!p || !p.points?.length) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = (p.width || strokeWidth) * dpr;
      if (p.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "#ff6666";
      }
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y);
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
    const h = Math.round(w * 0.66);
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

  useEffect(() => { drawAll(); }, [imageUrl, paths, current, strokeWidth, tool]);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: x * dpr, y: y * dpr };
  };

  const start = (e) => {
    e.preventDefault();
    setCurrent({ tool, width: strokeWidth, points: [getPoint(e)] });
  };
  const move = (e) => {
    if (!current) return;
    setCurrent((c) => ({ ...c, points: [...c.points, getPoint(e)] }));
  };
  const end = () => {
    if (!current) return;
    setPaths((p) => [...p, current]);
    setCurrent(null);
  };

  const undo = () => setPaths((p) => p.slice(0, -1));
  const clearAll = () => setPaths([]);

  const downloadPNG = () => {
    const link = document.createElement("a");
    link.download = `${title?.toLowerCase().replace(/\s+/g, "-") || "map"}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
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
          <div className="tool-toggle" role="tablist" aria-label="Tool">
            <button
              aria-pressed={tool==='pen'}
              className={tool==='pen' ? 'active' : ''}
              onClick={() => setTool('pen')}
              title="Pen"
            >
              ✏️ Pen
            </button>
            <button
              aria-pressed={tool==='eraser'}
              className={tool==='eraser' ? 'active' : ''}
              onClick={() => setTool('eraser')}
              title="Eraser"
            >
              🧽 Eraser
            </button>
          </div>

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
      <img
        ref={imgRef}
        src={imageUrl}
        onLoad={drawAll}
        onError={drawAll}
        alt=""
        style={{ display: "none" }}
      />

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

/* ============ Main App ============ */
export default function App() {
  const [step, setStep] = useState(loadLS("step", 0));
  const [contact, setContact] = useState(loadLS("contact", { name: "", phone: "", email: "" }));
  const [answers, setAnswers] = useState(loadLS("answers", {}));
  const [mapA, setMapA] = useState(loadLS("mapA", { imageUrl: "/garden-city-map-with-x.png", paths: [], strokeWidth: 4 }));
  const [mapB, setMapB] = useState(loadLS("mapB", { imageUrl: "/creggan-no-x.png", paths: [], strokeWidth: 4 }));
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => saveLS("step", step), [step]);
  useEffect(() => saveLS("contact", contact), [contact]);
  useEffect(() => saveLS("answers", answers), [answers]);
  useEffect(() => saveLS("mapA", mapA), [mapA]);
  useEffect(() => saveLS("mapB", mapB), [mapB]);

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

  const submitEmail = async () => {
    const mapACanvas = document.getElementById("mapA");
    const mapBCanvas = document.getElementById("mapB");
    const payload = {
      to: "zvio@hotmail.co.uk",
      subject: `Bee Flyer Application - ${contact.name || "Unknown"}`,
      contact,
      answers,
      mapA: { ...mapA, png: mapACanvas?.toDataURL("image/png") },
      mapB: { ...mapB, png: mapBCanvas?.toDataURL("image/png") },
    };
    try {
      const res = await fetch("/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Send failed");
      setSubmitted(true);
    } catch (e) {
      alert("Could not send application automatically. Please try again later.");
    }
  };

  if (submitted) {
    return (
      <div className="app-wrap">
        <div className="card">
          <h1>Thank you</h1>
          <p className="subtle">Thank you for your interest, we will contact you to proceed with your application in due course.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrap">
      <div className="card">
        <h1>Bee Flyer – Application</h1>
        <p className="subtle">Mobile-friendly questionnaire. Your progress saves automatically.</p>

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
            onChange={setMapA}
            title="Map Task 1"
            helper="Draw a line for the route you would take to deliver to every house in the most efficient way. Start at the X."
            canvasId="mapA"
          />
        )}

        {atMap2 && (
          <MapSketch
            value={mapB}
            onChange={setMapB}
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
          <button className="btn btn-outline" onClick={()=>setStep((s)=>Math.max(0,s-1))} disabled={step===0}>Back</button>
          <button className="btn btn-primary" disabled={!canContinue} onClick={()=>setStep((s)=>Math.min(totalSteps-1,s+1))}>
            {atReview ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ Question / Summary ============ */
function QuestionStep({ question, answer, onAnswer }) {
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

      {question.type === "date" && (
        <input
          type="date"
          className="input"
          value={answer || ""}
          onChange={(e) => onAnswer(question.id, e.target.value)}
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
