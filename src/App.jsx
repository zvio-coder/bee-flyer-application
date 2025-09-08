import React, { useEffect, useMemo, useRef, useState } from "react";

// -----------------------
// Configurable Questions
// -----------------------
const QUESTIONS = [
  {
    id: "dob",
    type: "date",
    label: "Date of Birth",
    required: true,
  },
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
    required: false,
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
    label: "A resident is angry about receiving a leaflet and tries to hand it back to you; what do you do?",
    placeholder: "Describe how you would handle this",
    required: true,
  },
];

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

function MapSketch({ value, onChange, title, helper, canvasId }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(value?.imageUrl || "");
  const [paths, setPaths] = useState(value?.paths || []);
  const [current, setCurrent] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(value?.strokeWidth || 3);

  useEffect(() => {
    onChange?.({ imageUrl, paths, strokeWidth });
  }, [imageUrl, paths, strokeWidth]);

  const devicePixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imgRef.current && imgRef.current.complete && imageUrl) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = strokeWidth * devicePixelRatio;
    const renderPath = (p) => {
      if (!p.length) return;
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
    const h = Math.round(w * 0.66);
    canvas.width = Math.max(1, Math.floor(w * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(h * devicePixelRatio));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    draw();
  };

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, [devicePixelRatio]);

  useEffect(() => { draw(); }, [imageUrl, paths, current, strokeWidth]);

  const pointFromEvent = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: x * devicePixelRatio, y: y * devicePixelRatio };
  };

  const onDown = (e) => { e.preventDefault(); setIsDrawing(true); setCurrent([pointFromEvent(e)]); };
  const onMove = (e) => { if (isDrawing) setCurrent((c) => [...c, pointFromEvent(e)]); };
  const onUp = () => { if (isDrawing) { setIsDrawing(false); setPaths((p) => (current.length ? [...p, current] : p)); setCurrent([]);} };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {helper && <p className="text-sm text-gray-600">{helper}</p>}
        </div>
      </div>
      <img ref={imgRef} src={imageUrl} onLoad={draw} style={{ display: "none" }} />
      <div className="rounded-2xl overflow-hidden border border-gray-200 touch-none select-none" onMouseLeave={onUp}>
        <canvas
          id={canvasId}
          ref={canvasRef}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />
      </div>
    </div>
  );
}

export default function LeafletDeliveryQuestionnaire() {
  const [step, setStep] = useState(loadLS("step", 0));
  const [contact, setContact] = useState(loadLS("contact", { name: "", phone: "", email: "" }));
  const [answers, setAnswers] = useState(loadLS("answers", {}));
  const [mapA, setMapA] = useState(loadLS("mapA", { imageUrl: "/garden-city-map-with-x.png", paths: [], strokeWidth: 3 }));
  const [mapB, setMapB] = useState(loadLS("mapB", { imageUrl: "/creggan-no-x.png", paths: [], strokeWidth: 3 }));
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

  const canContinue = useMemo(() => {
    if (atContact) return validateEmail(contact.email) && validatePhone(contact.phone) && contact.name.trim().length > 1;
    if (atQuestions) { const q = QUESTIONS[step-1]; const a = answers[q.id]; if (!q.required) return true; if (q.type==="multi") return a?.length>0; return a!==undefined && a!==""; }
    return true;
  }, [step, contact, answers]);

  const onAnswer = (qid, val) => setAnswers((s) => ({ ...s, [qid]: val }));

  const submitEmail = async () => {
    const mapACanvas = document.getElementById("mapA");
    const mapBCanvas = document.getElementById("mapB");
    const payload = {
      to: 'zvio@hotmail.co.uk',
      subject: `Bee Flyer Application - ${contact.name || 'Unknown'}`,
      contact, answers,
      mapA: { ...mapA, png: mapACanvas?.toDataURL("image/png") },
      mapB: { ...mapB, png: mapBCanvas?.toDataURL("image/png") },
    };
    try {
      const res = await fetch('/.netlify/functions/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch (e) { alert('Could not send application automatically'); }
  };

  if (submitted) {
    return <div className="max-w-2xl mx-auto p-6"><h2 className="text-lg font-semibold">Thank you</h2><p>Thank you for your interest, we will contact you to proceed with your application in due course.</p></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {atContact && (<section><h2>Your Details</h2><input value={contact.name} onChange={(e)=>setContact({...contact,name:e.target.value})} placeholder="Full name"/><input value={contact.phone} onChange={(e)=>setContact({...contact,phone:e.target.value})} placeholder="Phone"/><input value={contact.email} onChange={(e)=>setContact({...contact,email:e.target.value})} placeholder="Email"/></section>)}
      {atQuestions && (<QuestionStep question={QUESTIONS[step-1]} answer={answers[QUESTIONS[step-1].id]} onAnswer={onAnswer}/>)}
      {atMap1 && (<MapSketch value={mapA} onChange={setMapA} title="Map Task A" helper="Draw your delivery route starting at the X" canvasId="mapA"/>)}
      {atMap2 && (<MapSketch value={mapB} onChange={setMapB} title="Map Task B" helper="Draw your delivery route and mark your own start point" canvasId="mapB"/>)}
      {atReview && (<section><h2>Review & Submit</h2><SummaryCard contact={contact} answers={answers}/><button onClick={submitEmail}>Submit Application</button></section>)}
      <div className="flex gap-2 mt-4"><button onClick={()=>setStep((s)=>Math.max(0,s-1))}>Back</button><button disabled={!canContinue} onClick={()=>setStep((s)=>Math.min(totalSteps-1,s+1))}>{atReview?"Finish":"Continue"}</button></div>
    </div>
  );
}

function QuestionStep({ question, answer, onAnswer }) {
  return <div><p>{question.label}</p>{question.type==="single"&&question.options.map(opt=><label key={opt}><input type="radio" checked={answer===opt} onChange={()=>onAnswer(question.id,opt)}/>{opt}</label>)}{question.type==="multi"&&question.options.map(opt=>{const checked=answer?.includes(opt);return <label key={opt}><input type="checkbox" checked={checked} onChange={()=>onAnswer(question.id,checked?answer.filter(x=>x!==opt):[...(answer||[]),opt])}/>{opt}</label>})}{question.type==="longtext"&&<textarea value={answer||""} onChange={(e)=>onAnswer(question.id,e.target.value)}/>}{question.type==="date"&&<input type="date" value={answer||""} onChange={(e)=>onAnswer(question.id,e.target.value)}/>}</div>;
}

function SummaryCard({ contact, answers }) {
  return <div><h3>Summary</h3><p>{contact.name} - {contact.phone} - {contact.email}</p><ul>{QUESTIONS.map(q=><li key={q.id}>{q.label}: {Array.isArray(answers[q.id])?answers[q.id].join(", "):answers[q.id]}</li>)}</ul></div>;
}
