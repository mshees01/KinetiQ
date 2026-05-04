import { useState, useEffect, useRef } from "react";
import "./App.css";
import { MUSCLE_GROUPS, EXERCISES } from "./exercises.js";
import DietPlanner from "./DietPlanner.jsx";

// ─── ANGLE CALCULATOR ───────────────────────────────────────────────
function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c[1] - b[1], c[0] - b[0]) -
    Math.atan2(a[1] - b[1], a[0] - b[0]);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

// ─── CONSTANTS ──────────────────────────────────────────────────────
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [15, 17], [15, 19], [15, 21],
  [16, 18], [16, 20], [16, 22],
  [17, 19], [19, 21], [18, 20], [20, 22],
  [23, 25], [24, 26],
  [25, 27], [26, 28],
  [27, 29], [28, 30],
  [29, 31], [30, 32],
];

const LM = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_PINKY: 17,    RIGHT_PINKY: 18,
  LEFT_INDEX: 19,    RIGHT_INDEX: 20,
  LEFT_THUMB: 21,    RIGHT_THUMB: 22,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,     RIGHT_HEEL: 30,
  LEFT_FOOT: 31,     RIGHT_FOOT: 32,
};

// ─── FORM CHECKERS ──────────────────────────────────────────────────
function checkBicepForm(lm) {
  const warnings = [];
  const ls = [lm[LM.LEFT_SHOULDER].x,  lm[LM.LEFT_SHOULDER].y];
  const le = [lm[LM.LEFT_ELBOW].x,     lm[LM.LEFT_ELBOW].y];
  const lw = [lm[LM.LEFT_WRIST].x,     lm[LM.LEFT_WRIST].y];
  const lh = [lm[LM.LEFT_HIP].x,       lm[LM.LEFT_HIP].y];
  const rs = [lm[LM.RIGHT_SHOULDER].x, lm[LM.RIGHT_SHOULDER].y];
  const re = [lm[LM.RIGHT_ELBOW].x,    lm[LM.RIGHT_ELBOW].y];
  const rw = [lm[LM.RIGHT_WRIST].x,    lm[LM.RIGHT_WRIST].y];
  const rh = [lm[LM.RIGHT_HIP].x,      lm[LM.RIGHT_HIP].y];
  const lsa = calculateAngle(lh, ls, le);
  const rsa = calculateAngle(rh, rs, re);
  const lea = calculateAngle(ls, le, lw);
  const rea = calculateAngle(rs, re, rw);
  if (lsa > 40)              warnings.push("LEFT: Elbow flaring out!");
  if (rsa > 40)              warnings.push("RIGHT: Elbow flaring out!");
  if (lea < 150 && lea > 30) warnings.push("LEFT: Fully extend arm!");
  if (rea < 150 && rea > 30) warnings.push("RIGHT: Fully extend arm!");
  return warnings;
}

function checkDeadliftForm(lm) {
  const warnings = [];
  const ls = [lm[LM.LEFT_SHOULDER].x,  lm[LM.LEFT_SHOULDER].y];
  const lh = [lm[LM.LEFT_HIP].x,       lm[LM.LEFT_HIP].y];
  const lk = [lm[LM.LEFT_KNEE].x,      lm[LM.LEFT_KNEE].y];
  const la = [lm[LM.LEFT_ANKLE].x,     lm[LM.LEFT_ANKLE].y];
  const rs = [lm[LM.RIGHT_SHOULDER].x, lm[LM.RIGHT_SHOULDER].y];
  const rh = [lm[LM.RIGHT_HIP].x,      lm[LM.RIGHT_HIP].y];
  const rk = [lm[LM.RIGHT_KNEE].x,     lm[LM.RIGHT_KNEE].y];
  const ra = [lm[LM.RIGHT_ANKLE].x,    lm[LM.RIGHT_ANKLE].y];
  const lBackAngle = calculateAngle(ls, lh, lk);
  const rBackAngle = calculateAngle(rs, rh, rk);
  const lKneeAngle = calculateAngle(lh, lk, la);
  const rKneeAngle = calculateAngle(rh, rk, ra);
  if (lBackAngle < 150) warnings.push("Keep your back straight!");
  if (rBackAngle < 150) warnings.push("Keep your back straight!");
  if (lKneeAngle < 80)  warnings.push("LEFT: Knees caving in!");
  if (rKneeAngle < 80)  warnings.push("RIGHT: Knees caving in!");
  if (lh[1] < ls[1] - 0.1) warnings.push("Hips too high — risk of back injury!");
  return warnings;
}

// ─── DRAW ON CANVAS ─────────────────────────────────────────────────
function drawPose(ctx, landmarks, W, H, warnings) {
  ctx.clearRect(0, 0, W, H);
  const bodyColor = warnings.length > 0 ? "#ff4444" : "#00e5ff";
  POSE_CONNECTIONS.forEach(([i, j]) => {
    if (!landmarks[i] || !landmarks[j]) return;
    const isFace = i <= 10 && j <= 10;
    ctx.strokeStyle = isFace ? "rgba(255,255,255,0.7)" : bodyColor;
    ctx.lineWidth = isFace ? 2 : 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(landmarks[i].x * W, landmarks[i].y * H);
    ctx.lineTo(landmarks[j].x * W, landmarks[j].y * H);
    ctx.stroke();
  });
  landmarks.forEach((lm, idx) => {
    if (!lm) return;
    const isFace = idx <= 10;
    const r = isFace ? 3 : 5;
    ctx.beginPath();
    ctx.arc(lm.x * W, lm.y * H, r, 0, 2 * Math.PI);
    if (isFace)                      ctx.fillStyle = "#ffffff";
    else if (idx >= 15 && idx <= 22) ctx.fillStyle = "#facc15";
    else if (idx >= 11 && idx <= 14) ctx.fillStyle = "#00e5ff";
    else if (idx >= 23 && idx <= 32) ctx.fillStyle = "#a78bfa";
    else                             ctx.fillStyle = "#ffffff";
    ctx.fill();
  });
}

// ─── BICEP CURL TRACKER ─────────────────────────────────────────────
function BicepCurl({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    leftCounter: 0, rightCounter: 0,
    leftStage: null, rightStage: null,
    leftCooldown: false, rightCooldown: false,
    leftAngles: [], rightAngles: [],
  });
  const [stats, setStats] = useState({ leftCounter: 0, rightCounter: 0, leftStage: null, rightStage: null });
  const [warnings, setWarnings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream;
    async function init() {
      try {
        const { PoseLandmarker, FilesetResolver } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", delegate: "GPU" },
          runningMode: "VIDEO", numPoses: 1,
        });
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => { videoRef.current.onloadedmetadata = () => videoRef.current.play().then(resolve).catch(resolve); });
        setLoaded(true);
        detect();
      } catch (e) { setError("Camera or model failed: " + e.message); }
    }
    function detect() {
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas || !landmarkerRef.current) return;
      if (video.readyState < 2 || video.videoWidth === 0) { animRef.current = requestAnimationFrame(detect); return; }
      const W = video.videoWidth, H = video.videoHeight;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      const ctx = canvas.getContext("2d");
      const result = landmarkerRef.current.detectForVideo(video, performance.now());
      if (result.landmarks?.length > 0) {
        const lm = result.landmarks[0];
        const ls = [lm[LM.LEFT_SHOULDER].x, lm[LM.LEFT_SHOULDER].y];
        const le = [lm[LM.LEFT_ELBOW].x,    lm[LM.LEFT_ELBOW].y];
        const lw = [lm[LM.LEFT_WRIST].x,    lm[LM.LEFT_WRIST].y];
        const rs = [lm[LM.RIGHT_SHOULDER].x, lm[LM.RIGHT_SHOULDER].y];
        const re = [lm[LM.RIGHT_ELBOW].x,    lm[LM.RIGHT_ELBOW].y];
        const rw = [lm[LM.RIGHT_WRIST].x,    lm[LM.RIGHT_WRIST].y];
        const la = calculateAngle(ls, le, lw), ra = calculateAngle(rs, re, rw);
        const s = stateRef.current;
        s.leftAngles.push(la); s.rightAngles.push(ra);
        if (s.leftAngles.length > 5)  s.leftAngles.shift();
        if (s.rightAngles.length > 5) s.rightAngles.shift();
        const smoothL = s.leftAngles.reduce((a, b) => a + b, 0) / s.leftAngles.length;
        const smoothR = s.rightAngles.reduce((a, b) => a + b, 0) / s.rightAngles.length;
        if (smoothL > 150) { s.leftStage = "down"; s.leftCooldown = false; }
        if (smoothL < 50 && s.leftStage === "down" && !s.leftCooldown) { s.leftStage = "up"; s.leftCounter++; s.leftCooldown = true; }
        if (smoothR > 150) { s.rightStage = "down"; s.rightCooldown = false; }
        if (smoothR < 50 && s.rightStage === "down" && !s.rightCooldown) { s.rightStage = "up"; s.rightCounter++; s.rightCooldown = true; }
        const w = checkBicepForm(lm);
        setWarnings(w); setStats({ ...s });
        ctx.font = "bold 16px monospace"; ctx.fillStyle = "#fff"; ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
        ctx.strokeText(`${Math.round(smoothL)}°`, le[0] * W + 10, le[1] * H);
        ctx.fillText(`${Math.round(smoothL)}°`,   le[0] * W + 10, le[1] * H);
        ctx.strokeText(`${Math.round(smoothR)}°`, re[0] * W + 10, re[1] * H);
        ctx.fillText(`${Math.round(smoothR)}°`,   re[0] * W + 10, re[1] * H);
        drawPose(ctx, lm, W, H, w);
      }
      animRef.current = requestAnimationFrame(detect);
    }
    init();
    return () => { cancelAnimationFrame(animRef.current); stream?.getTracks().forEach(t => t.stop()); landmarkerRef.current?.close(); };
  }, []);

  return (
    <div className="tracker-page">
      <div className="top-bar">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h2 className="exercise-title">💪 Bicep Curl Tracker</h2>
      </div>
      {error && <div className="error-box">{error}</div>}
      {!loaded && !error && <div className="loading-box">Loading camera & AI model...</div>}
      <div className="main-layout">
        <div className="video-wrapper">
          <video ref={videoRef} className="video-feed" muted playsInline />
          <canvas ref={canvasRef} className="pose-canvas" />
        </div>
        <div className="stats-panel">
          <div className="stat-card blue">
            <div className="stat-label">LEFT ARM</div>
            <div className="stat-rep">{stats.leftCounter}</div>
            <div className="stat-stage">{stats.leftStage?.toUpperCase() || "—"}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">RIGHT ARM</div>
            <div className="stat-rep">{stats.rightCounter}</div>
            <div className="stat-stage">{stats.rightStage?.toUpperCase() || "—"}</div>
          </div>
          <div className={`warning-box ${warnings.length > 0 ? "alert" : "good"}`}>
            <div className="warning-title">{warnings.length > 0 ? "⚠ FORM ALERT" : "✅ GOOD FORM"}</div>
            {warnings.map((w, i) => <div key={i} className="warning-text">{w}</div>)}
          </div>
          <button className="reset-btn" onClick={() => {
            stateRef.current = { leftCounter: 0, rightCounter: 0, leftStage: null, rightStage: null, leftCooldown: false, rightCooldown: false, leftAngles: [], rightAngles: [] };
            setStats({ leftCounter: 0, rightCounter: 0, leftStage: null, rightStage: null });
          }}>🔄 Reset Counters</button>
        </div>
      </div>
    </div>
  );
}

// ─── DEADLIFT TRACKER ───────────────────────────────────────────────
function Deadlift({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({ counter: 0, stage: null });
  const [stats, setStats] = useState({ counter: 0, stage: null });
  const [warnings, setWarnings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream;
    async function init() {
      try {
        const { PoseLandmarker, FilesetResolver } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm");
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", delegate: "GPU" },
          runningMode: "VIDEO", numPoses: 1,
        });
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => { videoRef.current.onloadedmetadata = () => videoRef.current.play().then(resolve).catch(resolve); });
        setLoaded(true);
        detect();
      } catch (e) { setError("Camera or model failed: " + e.message); }
    }
    function detect() {
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas || !landmarkerRef.current) return;
      if (video.readyState < 2 || video.videoWidth === 0) { animRef.current = requestAnimationFrame(detect); return; }
      const W = video.videoWidth, H = video.videoHeight;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      const ctx = canvas.getContext("2d");
      const result = landmarkerRef.current.detectForVideo(video, performance.now());
      if (result.landmarks?.length > 0) {
        const lm = result.landmarks[0];
        const lh = [lm[LM.LEFT_HIP].x, lm[LM.LEFT_HIP].y];
        const lk = [lm[LM.LEFT_KNEE].x, lm[LM.LEFT_KNEE].y];
        const hipAngle = calculateAngle([lm[LM.LEFT_SHOULDER].x, lm[LM.LEFT_SHOULDER].y], lh, lk);
        const s = stateRef.current;
        if (hipAngle < 60) s.stage = "down";
        if (hipAngle > 160 && s.stage === "down") { s.stage = "up"; s.counter++; }
        const w = checkDeadliftForm(lm);
        setWarnings(w); setStats({ ...s });
        ctx.font = "bold 16px monospace"; ctx.fillStyle = "#fff"; ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
        ctx.strokeText(`${Math.round(hipAngle)}°`, lh[0] * W + 10, lh[1] * H);
        ctx.fillText(`${Math.round(hipAngle)}°`,   lh[0] * W + 10, lh[1] * H);
        drawPose(ctx, lm, W, H, w);
      }
      animRef.current = requestAnimationFrame(detect);
    }
    init();
    return () => { cancelAnimationFrame(animRef.current); stream?.getTracks().forEach(t => t.stop()); landmarkerRef.current?.close(); };
  }, []);

  return (
    <div className="tracker-page">
      <div className="top-bar">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h2 className="exercise-title">🏋️ Deadlift Tracker</h2>
      </div>
      {error && <div className="error-box">{error}</div>}
      {!loaded && !error && <div className="loading-box">Loading camera & AI model...</div>}
      <div className="main-layout">
        <div className="video-wrapper">
          <video ref={videoRef} className="video-feed" muted playsInline />
          <canvas ref={canvasRef} className="pose-canvas" />
        </div>
        <div className="stats-panel">
          <div className="stat-card amber">
            <div className="stat-label">DEADLIFT REPS</div>
            <div className="stat-rep">{stats.counter}</div>
            <div className="stat-stage">{stats.stage?.toUpperCase() || "—"}</div>
          </div>
          <div className={`warning-box ${warnings.length > 0 ? "alert" : "good"}`}>
            <div className="warning-title">{warnings.length > 0 ? "⚠ FORM ALERT" : "✅ GOOD FORM"}</div>
            {warnings.map((w, i) => <div key={i} className="warning-text">{w}</div>)}
          </div>
          <button className="reset-btn" onClick={() => { stateRef.current = { counter: 0, stage: null }; setStats({ counter: 0, stage: null }); }}>
            🔄 Reset Counter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI TRACKER SELECTION PAGE ──────────────────────────────────────
function TrackerSelect({ onSelect, onBack }) {
  return (
    <div className="tracker-select-page">
      <div className="ts-bg-grid" />
      <div className="ts-content">
        <button onClick={onBack} className="back-btn ts-back">← Back to Home</button>

        <div className="ts-header">
          <div className="ts-badge">🤖 AI POWERED</div>
          <h2 className="ts-title">Live Form Tracker</h2>
          <p className="ts-subtitle">Camera will activate — stand in frame and start your set</p>
        </div>

        <div className="ts-card-row">
          {/* Bicep Curl Card */}
          <div className="ts-card ts-bicep" onClick={() => onSelect("bicep")}>
            <div className="ts-card-glow" />
            <div className="ts-card-icon">💪</div>
            <div className="ts-card-info">
              <h3 className="ts-card-name">Bicep Curl</h3>
              <p className="ts-card-desc">Both arms tracked simultaneously</p>
              <div className="ts-card-tags">
                <span className="ts-tag">Rep Counter</span>
                <span className="ts-tag">Elbow Angle</span>
                <span className="ts-tag">Form Alerts</span>
              </div>
            </div>
            <div className="ts-start-btn ts-start-blue">START TRACKING →</div>
          </div>

          {/* Deadlift Card */}
          <div className="ts-card ts-deadlift" onClick={() => onSelect("deadlift")}>
            <div className="ts-card-glow" />
            <div className="ts-card-icon">🏋️</div>
            <div className="ts-card-info">
              <h3 className="ts-card-name">Deadlift</h3>
              <p className="ts-card-desc">Hip hinge & back posture analysis</p>
              <div className="ts-card-tags">
                <span className="ts-tag">Rep Counter</span>
                <span className="ts-tag">Hip Angle</span>
                <span className="ts-tag">Spine Check</span>
              </div>
            </div>
            <div className="ts-start-btn ts-start-amber">START TRACKING →</div>
          </div>
        </div>

        <div className="ts-note">
          <span className="ts-note-icon">📷</span>
          Make sure your full body is visible in the camera for best results
        </div>
      </div>
    </div>
  );
}

// ─── EXERCISE DETAIL MODAL ──────────────────────────────────────────
function ExerciseModal({ exercise, onClose, onStartTracker }) {
  const mg = MUSCLE_GROUPS.find(m => m.id === exercise.muscle);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header" style={{ borderColor: mg?.color }}>
          <div className="modal-title-row">
            <h2 className="modal-title">{exercise.name}</h2>
            <div className="modal-badges">
              <span className="modal-badge difficulty">{exercise.difficulty}</span>
              <span className="modal-badge equipment">{exercise.equipment}</span>
              {exercise.hasTracker && <span className="modal-badge ai-badge">🤖 AI Tracking</span>}
            </div>
          </div>
        </div>

        <div className="modal-body">
          {/* GIF */}
          <div className="modal-gif-wrap">
            <img
              src={exercise.gif}
              alt={exercise.name}
              className="modal-gif"
              onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
            />
            <div className="modal-gif-fallback" style={{ display: "none" }}>
              <span style={{ fontSize: 48 }}>🏋️</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>GIF unavailable</span>
            </div>
          </div>

          {/* Sets / Reps */}
          <div className="modal-stats-row">
            <div className="modal-stat-box" style={{ borderColor: mg?.color }}>
              <div className="modal-stat-val" style={{ color: mg?.color }}>{exercise.sets}</div>
              <div className="modal-stat-label">SETS</div>
            </div>
            <div className="modal-stat-box" style={{ borderColor: mg?.color }}>
              <div className="modal-stat-val" style={{ color: mg?.color }}>{exercise.reps}</div>
              <div className="modal-stat-label">REPS</div>
            </div>
            <div className="modal-stat-box" style={{ borderColor: mg?.color }}>
              <div className="modal-stat-val" style={{ color: mg?.color, fontSize: 14 }}>60s</div>
              <div className="modal-stat-label">REST</div>
            </div>
          </div>

          {/* Muscles */}
          <div className="modal-section">
            <div className="modal-section-title">Muscles Worked</div>
            <div className="modal-muscle-tags">
              {exercise.muscles.map(m => (
                <span key={m} className="modal-muscle-tag" style={{ background: `${mg?.color}22`, border: `1px solid ${mg?.color}55`, color: mg?.color }}>{m}</span>
              ))}
            </div>
          </div>

          {/* Cues */}
          <div className="modal-section">
            <div className="modal-section-title">Form Cues</div>
            <div className="modal-cues">
              {exercise.cues.map((cue, i) => (
                <div key={i} className="modal-cue">
                  <span className="modal-cue-num" style={{ color: mg?.color }}>{i + 1}</span>
                  <span className="modal-cue-text">{cue}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {exercise.hasTracker ? (
            <button
              className="modal-track-btn"
              style={{ background: mg?.color }}
              onClick={() => { onClose(); onStartTracker(exercise.trackerId); }}
            >
              🤖 Start AI Live Tracking
            </button>
          ) : (
            <button className="modal-close-btn" onClick={onClose}>
              Got It — Let's Work Out!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MUSCLE DIAGRAM SVG ─────────────────────────────────────────────
function MuscleDiagram({ activeMuscle, onSelect }) {
  const muscles = [
    { id: "chest",     label: "CHEST",     color: "#ef4444", path: "M 135 105 Q 120 100 112 115 Q 108 130 118 140 Q 128 148 140 145 Q 150 140 152 130 Q 153 115 135 105 Z M 165 105 Q 180 100 188 115 Q 192 130 182 140 Q 172 148 160 145 Q 150 140 148 130 Q 147 115 165 105 Z" },
    { id: "shoulders", label: "SHOULDERS", color: "#8b5cf6", path: "M 100 95 Q 88 88 85 100 Q 83 112 92 118 Q 102 122 108 112 Q 114 100 100 95 Z M 200 95 Q 212 88 215 100 Q 217 112 208 118 Q 198 122 192 112 Q 186 100 200 95 Z" },
    { id: "arms",      label: "ARMS",      color: "#00e5ff", path: "M 82 122 Q 72 135 70 150 Q 68 165 75 175 Q 82 182 90 175 Q 98 165 98 148 Q 98 132 90 122 Z M 218 122 Q 228 135 230 150 Q 232 165 225 175 Q 218 182 210 175 Q 202 165 202 148 Q 202 132 210 122 Z M 72 175 Q 65 185 63 198 Q 61 210 68 218 Q 75 224 83 218 Q 90 210 91 197 Q 92 183 84 175 Z M 228 175 Q 235 185 237 198 Q 239 210 232 218 Q 225 224 217 218 Q 210 210 209 197 Q 208 183 216 175 Z" },
    { id: "core",      label: "CORE",      color: "#f59e0b", path: "M 138 148 Q 130 152 128 162 Q 126 172 128 182 Q 130 190 138 192 Q 150 194 162 192 Q 170 190 172 182 Q 174 172 172 162 Q 170 152 162 148 Q 155 145 138 148 Z M 132 193 Q 128 200 128 210 Q 128 220 132 228 Q 137 234 150 235 Q 163 234 168 228 Q 172 220 172 210 Q 172 200 168 193 Q 160 196 150 196 Q 140 196 132 193 Z" },
    { id: "back",      label: "BACK",      color: "#3b82f6", path: "M 138 95 Q 128 92 122 102 Q 118 112 122 122 Q 126 130 135 132 Q 142 133 148 130 L 148 95 Z M 162 95 Q 172 92 178 102 Q 182 112 178 122 Q 174 130 165 132 Q 158 133 152 130 L 152 95 Z M 130 132 Q 120 138 118 152 Q 116 165 120 175 Q 125 183 135 185 Q 142 186 148 183 L 148 130 Z M 170 132 Q 180 138 182 152 Q 184 165 180 175 Q 175 183 165 185 Q 158 186 152 183 L 152 130 Z" },
    { id: "legs",      label: "LEGS",      color: "#10b981", path: "M 128 238 Q 120 248 118 265 Q 116 282 120 298 Q 125 312 134 318 Q 142 322 148 316 Q 153 308 153 290 Q 153 268 148 248 Q 143 238 128 238 Z M 172 238 Q 180 248 182 265 Q 184 282 180 298 Q 175 312 166 318 Q 158 322 152 316 Q 147 308 147 290 Q 147 268 152 248 Q 157 238 172 238 Z M 120 320 Q 114 332 113 348 Q 112 362 117 374 Q 122 384 131 386 Q 140 387 146 380 Q 151 371 151 356 Q 151 338 146 322 Z M 180 320 Q 186 332 187 348 Q 188 362 183 374 Q 178 384 169 386 Q 160 387 154 380 Q 149 371 149 356 Q 149 338 154 322 Z" },
  ];

  return (
    <div className="muscle-diagram-wrap">
      <svg viewBox="0 0 300 420" className="muscle-svg" xmlns="http://www.w3.org/2000/svg">
        {/* Body silhouette */}
        <ellipse cx="150" cy="68" rx="28" ry="32" fill="#1a2535" stroke="#2a3a50" strokeWidth="1.5"/>
        {/* Neck */}
        <rect x="143" y="95" width="14" height="14" rx="4" fill="#1a2535" stroke="#2a3a50" strokeWidth="1"/>
        {/* Torso */}
        <path d="M 108 108 Q 95 118 90 135 L 88 240 L 212 240 L 210 135 Q 205 118 192 108 Q 175 100 150 98 Q 125 100 108 108 Z" fill="#1a2535" stroke="#2a3a50" strokeWidth="1.5"/>
        {/* Left arm */}
        <path d="M 90 122 Q 75 132 68 155 Q 62 175 63 200 Q 64 218 72 228 L 85 228 Q 90 215 92 195 Q 94 172 98 150 Q 100 132 95 122 Z" fill="#1a2535" stroke="#2a3a50" strokeWidth="1"/>
        {/* Right arm */}
        <path d="M 210 122 Q 225 132 232 155 Q 238 175 237 200 Q 236 218 228 228 L 215 228 Q 210 215 208 195 Q 206 172 202 150 Q 200 132 205 122 Z" fill="#1a2535" stroke="#2a3a50" strokeWidth="1"/>
        {/* Legs */}
        <path d="M 112 238 Q 108 260 107 290 Q 106 320 110 350 Q 114 378 124 392 L 148 392 L 150 238 Z" fill="#1a2535" stroke="#2a3a50" strokeWidth="1"/>
        <path d="M 188 238 Q 192 260 193 290 Q 194 320 190 350 Q 186 378 176 392 L 152 392 L 150 238 Z" fill="#1a2535" stroke="#2a3a50" strokeWidth="1"/>

        {/* Muscle groups — clickable */}
        {muscles.map(m => (
          <path
            key={m.id}
            d={m.path}
            fill={activeMuscle === m.id ? m.color : `${m.color}44`}
            stroke={m.color}
            strokeWidth={activeMuscle === m.id ? 2 : 1}
            style={{ cursor: "pointer", transition: "all 0.2s ease", filter: activeMuscle === m.id ? `drop-shadow(0 0 8px ${m.color})` : "none" }}
            onClick={() => onSelect(activeMuscle === m.id ? null : m.id)}
          />
        ))}

        {/* Labels */}
        {muscles.map(m => {
          const labelPos = {
            chest:     { x: 150, y: 138 },
            shoulders: { x: 150, y: 85 },
            arms:      { x: 150, y: 170 },
            core:      { x: 150, y: 198 },
            back:      { x: 150, y: 155 },
            legs:      { x: 150, y: 310 },
          };
          return null; // labels shown outside diagram
        })}
      </svg>

      {/* Muscle labels beside diagram */}
      <div className="muscle-labels">
        {muscles.map(m => (
          <button
            key={m.id}
            className={`muscle-label-btn ${activeMuscle === m.id ? "active" : ""}`}
            style={{
              "--mlabel-color": m.color,
              borderColor: activeMuscle === m.id ? m.color : "rgba(255,255,255,0.1)",
              color: activeMuscle === m.id ? m.color : "rgba(255,255,255,0.6)",
              background: activeMuscle === m.id ? `${m.color}15` : "transparent",
            }}
            onClick={() => onSelect(activeMuscle === m.id ? null : m.id)}
          >
            <span className="mlabel-dot" style={{ background: m.color }} />
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── GENDER SELECT SCREEN ───────────────────────────────────────────
function GenderSelect({ onSelect }) {
  return (
    <div className="gender-page">
      <div className="bg-grid" />
      <div className="gender-content">
        <div className="badge">KINETIQ — AI POWERED FITNESS</div>
        <h1 className="home-title">KINETI<span className="accent">Q</span></h1>
        <p className="gender-subtitle">Select your gender to get a personalised exercise plan</p>

        <div className="gender-card-row">
          {/* Male */}
          <div className="gender-card gender-male" onClick={() => onSelect("male")}>
            <div className="gender-card-glow" />
            <div className="gender-icon">♂</div>
            <div className="gender-label">Male</div>
            <div className="gender-desc">
              Strength-focused workouts — barbell compounds, heavy lifts & muscle building
            </div>
            <div className="gender-cta gender-cta-male">SELECT →</div>
          </div>

          {/* Female */}
          <div className="gender-card gender-female" onClick={() => onSelect("female")}>
            <div className="gender-card-glow" />
            <div className="gender-icon">♀</div>
            <div className="gender-label">Female</div>
            <div className="gender-desc">
              Toning & sculpting workouts — glutes, core, flexibility & bodyweight training
            </div>
            <div className="gender-cta gender-cta-female">SELECT →</div>
          </div>
        </div>

        <p className="gender-note">
          Exercises marked <strong>"both"</strong> will appear for all genders
        </p>
      </div>
    </div>
  );
}

// ─── HOME PAGE ──────────────────────────────────────────────────────
function HomePage({ onNavigate, gender, onChangeGender }) {
  const [activeMuscle, setActiveMuscle] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);

  // Filter by gender ("both" always shows) then optionally by muscle
  const genderFiltered = EXERCISES.filter(e => e.gender === gender || e.gender === "both");
  const filteredExercises = activeMuscle
    ? genderFiltered.filter(e => e.muscle === activeMuscle)
    : genderFiltered;

  const activeMG = MUSCLE_GROUPS.find(m => m.id === activeMuscle);

  const genderLabel  = gender === "male" ? "♂ Male" : "♀ Female";
  const genderClass  = gender === "male" ? "gender-pill-male" : "gender-pill-female";

  return (
    <div className="home-page">
      <div className="bg-grid" />

      <div className="home-content">
        {/* ── Header ── */}
        <div className="home-header">
          <div className="badge">KINETIQ — AI POWERED FITNESS</div>
          <h1 className="home-title">KINETI<span className="accent">Q</span></h1>
          <p className="home-subtitle">Real-time pose detection & exercise coaching</p>

          {/* Gender pill */}
          <button className={`gender-pill ${genderClass}`} onClick={onChangeGender}>
            {genderLabel} &nbsp;·&nbsp; Change
          </button>
        </div>

        {/* ── AI Live Tracker CTA ── */}
        <div className="live-tracker-banner" onClick={() => onNavigate("tracker-select")}>
          <div className="ltb-pulse" />
          <div className="ltb-left">
            <div className="ltb-label">🤖 AI LIVE TRACKER</div>
            <div className="ltb-title">Real-Time Form Analysis</div>
            <div className="ltb-desc">Camera-powered rep counting & injury prevention</div>
          </div>
          <div className="ltb-right">
            <div className="ltb-exercises">
              <span className="ltb-ex">💪 Bicep Curl</span>
              <span className="ltb-ex">🏋️ Deadlift</span>
            </div>
            <div className="ltb-cta">LAUNCH →</div>
          </div>
        </div>

        {/* ── AI Diet Planner CTA ── */}
        <div className="diet-banner" onClick={() => onNavigate("diet")}>
          <div className="diet-banner-left">
            <div className="diet-banner-icon">🥗</div>
            <div>
              <div className="diet-banner-label">AI DIET PLANNER</div>
              <div className="diet-banner-title">Personalised Meal Plan</div>
              <div className="diet-banner-desc">Enter weight & height — get a full day diet chart powered by AI</div>
            </div>
          </div>
          <div className="diet-banner-pills">
            <span className="diet-pill">🔥 Calories</span>
            <span className="diet-pill">💪 Macros</span>
            <span className="diet-pill">💧 Hydration</span>
            <div className="diet-banner-cta">PLAN MY DIET →</div>
          </div>
        </div>

        {/* ── Exercise Library ── */}
        <div className="library-section">
          <div className="library-header">
            <h2 className="library-title">Exercise Library</h2>
            <p className="library-subtitle">
              Showing <strong style={{ color: gender === "male" ? "#3b82f6" : "#f472b6" }}>{genderLabel}</strong> exercises — tap a muscle group to filter
            </p>
          </div>

          <div className="library-main">
            <MuscleDiagram activeMuscle={activeMuscle} onSelect={setActiveMuscle} />

            <div className="exercise-library">
              {activeMuscle && (
                <div className="library-filter-bar">
                  <span className="library-filter-label" style={{ color: activeMG?.color }}>
                    ● {activeMG?.label} — {filteredExercises.length} exercises
                  </span>
                  <button className="library-clear-btn" onClick={() => setActiveMuscle(null)}>
                    Clear ✕
                  </button>
                </div>
              )}

              <div className="ex-card-grid">
                {filteredExercises.map(ex => {
                  const mg = MUSCLE_GROUPS.find(m => m.id === ex.muscle);
                  return (
                    <div
                      key={ex.id}
                      className="ex-card"
                      style={{ "--ex-color": mg?.color, "--ex-glow": mg?.glow }}
                      onClick={() => setSelectedExercise(ex)}
                    >
                      <div className="ex-card-gif-wrap">
                        <img src={ex.gif} alt={ex.name} className="ex-card-gif" loading="lazy"
                          onError={e => { e.target.style.opacity = 0; }} />
                        <div className="ex-card-gif-overlay" />
                        {ex.hasTracker && <div className="ex-ai-badge">🤖 AI</div>}
                        {ex.gender === "both" && <div className="ex-both-badge">♂♀</div>}
                      </div>
                      <div className="ex-card-body">
                        <div className="ex-card-muscle" style={{ color: mg?.color }}>{mg?.label}</div>
                        <div className="ex-card-name">{ex.name}</div>
                        <div className="ex-card-meta">
                          <span>{ex.sets} sets</span>
                          <span className="ex-dot">·</span>
                          <span>{ex.reps} reps</span>
                          <span className="ex-dot">·</span>
                          <span>{ex.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedExercise && (
        <ExerciseModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
          onStartTracker={(id) => onNavigate(id)}
        />
      )}
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("gender-select");
  const [gender, setGender] = useState(null);

  function handleGenderSelect(g) {
    setGender(g);
    setScreen("home");
  }

  return (
    <div className="app">
      {screen === "gender-select" && <GenderSelect onSelect={handleGenderSelect} />}
      {screen === "home"          && <HomePage onNavigate={setScreen} gender={gender} onChangeGender={() => setScreen("gender-select")} />}
      {screen === "tracker-select"&& <TrackerSelect onSelect={setScreen} onBack={() => setScreen("home")} />}
      {screen === "diet"          && <DietPlanner onBack={() => setScreen("home")} />}
      {screen === "bicep"         && <BicepCurl  onBack={() => setScreen("home")} />}
      {screen === "deadlift"      && <Deadlift   onBack={() => setScreen("home")} />}
    </div>
  );
}