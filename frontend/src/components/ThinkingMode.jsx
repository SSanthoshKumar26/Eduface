import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Brain, Flame, Target, Zap, Activity, Search, ClipboardList, Timer, CheckCircle2, AlertTriangle, Wrench, Trophy, RefreshCcw, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import '../styles/ThinkingMode.css';

const API_BASE_URL = 'http://127.0.0.1:5000';

// ─── All Robot Messages Per Phase ────────────────────────────────
const BUDDY_MESSAGES = {
  welcome: [
    "Welcome back. Ready to push your technical limits today?",
    "Great to see you. Systematic thinking is the core of engineering.",
    "Technical excellence requires deep analysis. Let's begin.",
    "Challenge accepted. Select your difficulty and we'll start the audit.",
  ],
  loading: [
    "Establishing neural link with architectural patterns...",
    "Scanning documentation and calibrating audit protocols...",
    "Synchronizing diagnostic tools for deep system analysis...",
    "System check complete. Initiating architectural probe...",
  ],
  active_start: [
    "Analyze the requirements thoroughly before documenting your logic.",
    "Focus on architectural fundamentals—build your case layer by layer.",
    "Deconstruct complex requirements into modular components.",
    "Format your response as a structured technical specification.",
  ],
  active_nudge: [
    "Strong technical progression. Maintain focus on constraints.",
    "Every design choice is a step toward architectural mastery.",
    "Telemetry indicates high-fidelity reasoning patterns.",
    "Address edge cases—reliability is central to premium engineering.",
    "Consider horizontal scalability—evaluate high-traffic scenarios.",
    "Technical trade-offs are essential to a robust architecture.",
    "Evaluate fault tolerance and potential failover scenarios.",
    "Identify data flow bottlenecks in your proposed design.",
  ],
  keyword_detected: [
    "Core concept identified. Expand on the implementation details.",
    "Technical terminology matched. Provide the underlying rationale.",
    "Key architectural pattern detected. Your design vocabulary is precise.",
    "Crucial concept spotted. Ensure clear connectivity between modules.",
  ],
  evaluating: [
    "Analyzing your architectural logic against technical benchmarks...",
    "Cross-referencing logic patterns with master-level protocols...",
    "Diagnostic pattern matching in progress. Finalizing report...",
    "Stress-testing your design against edge-case scenarios...",
    "Calculating rigor metrics across all technical dimensions...",
  ],
  result_good: [
    "Outstanding architectural thinking. Audit successfully passed.",
    "Master-level response. Technical proficiency confirmed.",
    "Exceptional depth and clarity. Your reasoning is elite.",
    "Top-tier reasoning. Your system design skills are validated.",
  ],
  result_average: [
    "Analysis complete. Core patterns identified but gaps persist.",
    "Foundational logic established. Review benchmarks to optimize.",
    "Diagnostic complete. Focus on technical depth to improve rigor.",
    "Technical Edge: Attempt validated. Review corrections to improve.",
  ],
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── Floating Robot Buddy Component ──────────────────────────────
function RobotBuddy({ message, visible, position = 'bottom-right' }) {
  return (
    <div className={`tm-buddy-wrapper ${position} ${visible ? 'buddy-visible' : 'buddy-hidden'}`}>
      <div className="tm-buddy-bubble">
        <div className="tm-buddy-bubble-tail" />
        <p>{message}</p>
      </div>
      <img
        src="https://img.icons8.com/3d-fluency/94/ai-robot--v3.png"
        className="tm-buddy-robot"
        alt="Eduface AI"
      />
      <div className="tm-buddy-name">EDUFACE AI</div>
    </div>
  );
}

export default function ThinkingMode() {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('selection');
  const [difficulty, setDifficulty] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [question, setQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [goldStandard, setGoldStandard] = useState("");
  const [streak, setStreak] = useState(0);
  const [showTopAnswer, setShowTopAnswer] = useState(false);
  const [lessonContext, setLessonContext] = useState("");

  const [isScanning, setIsScanning] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [activeAuditLine, setActiveAuditLine] = useState(-1);
  const [liveMetrics, setLiveMetrics] = useState({ accuracy: 0, depth: 0, rigor: 0 });
  const [evalCards, setEvalCards] = useState([]);
  const [revealedCount, setRevealedCount] = useState(0);

  // ─── Buddy State ───────────────────────────────────────────────
  const [buddyVisible, setBuddyVisible] = useState(false);
  const [buddyMsg, setBuddyMsg] = useState("");
  const buddyTimerRef = useRef(null);
  const nudgeIntervalRef = useRef(null);
  const timerRef = useRef(null);

  const keywordsToWatch = ["tcp/ip", "latency", "throughput", "bandwidth", "protocol", "architecture", "scaling", "buffer", "congestion", "handshake", "packet", "layer", "http", "load balancer"];
  const prevKeywordCountRef = useRef(0);

  // ─── Trigger Buddy Pop-up ──────────────────────────────────────
  const triggerBuddy = useCallback((msg, duration = 5000) => {
    if (buddyTimerRef.current) clearTimeout(buddyTimerRef.current);
    setBuddyMsg(msg);
    setBuddyVisible(true);
    if (duration !== Infinity) {
      buddyTimerRef.current = setTimeout(() => setBuddyVisible(false), duration);
    }
  }, []);

  // ─── Phase-based buddy appearances ────────────────────────────
  useEffect(() => {
    const savedStreak = localStorage.getItem('eduface_thinking_streak') || 4;
    setStreak(parseInt(savedStreak));

    const loadContext = async () => {
      let context = "";
      const savedSession = localStorage.getItem('eduface_video_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          if (session.scriptUrl) {
            const res = await fetch(session.scriptUrl);
            context = await res.text();
          } else if (session.transcript) context = session.transcript;
        } catch (e) {}
      }
      if (!context) context = "Computer networking, architecture, and system design.";
      setLessonContext(context);
    };
    loadContext();
  }, [videoId]);

  // Show welcome buddy on selection phase
  useEffect(() => {
    if (phase === 'selection') {
      setTimeout(() => triggerBuddy(getRandom(BUDDY_MESSAGES.welcome), 7000), 800);
    }
    if (phase === 'loading') {
      triggerBuddy(getRandom(BUDDY_MESSAGES.loading), Infinity);
    }
    if (phase === 'active') {
      // First: start message
      setTimeout(() => triggerBuddy(getRandom(BUDDY_MESSAGES.active_start), 6000), 1000);

      // Then: nudge every 30s while user is typing
      nudgeIntervalRef.current = setInterval(() => {
        triggerBuddy(getRandom(BUDDY_MESSAGES.active_nudge), 6000);
      }, 30000);
    }
    if (phase === 'evaluating') {
      triggerBuddy(getRandom(BUDDY_MESSAGES.evaluating), Infinity);
      // Rotate evaluating messages every 5s
      nudgeIntervalRef.current = setInterval(() => {
        triggerBuddy(getRandom(BUDDY_MESSAGES.evaluating), Infinity);
      }, 5000);
    }
    if (phase === 'result') {
      const score = liveMetrics.accuracy;
      const msgs = score >= 65 ? BUDDY_MESSAGES.result_good : BUDDY_MESSAGES.result_average;
      setTimeout(() => triggerBuddy(getRandom(msgs), 8000), 800);
    }

    return () => {
      if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
    };
  }, [phase]);

  // Keyword detection — buddy pops up when a new technical keyword is typed
  useEffect(() => {
    if (phase !== 'active') return;
    const detectedCount = keywordsToWatch.filter(kw => userAnswer.toLowerCase().includes(kw)).length;
    if (detectedCount > prevKeywordCountRef.current) {
      triggerBuddy(getRandom(BUDDY_MESSAGES.keyword_detected), 5000);
      prevKeywordCountRef.current = detectedCount;
    }
  }, [userAnswer, phase]);

  // Timer countdown
  useEffect(() => {
    if (phase === 'active' && timeLeft !== null && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
      }, 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [phase, timeLeft]);

  const startTest = async (diff) => {
    setDifficulty(diff);
    setPhase('loading');
    let timerValue = diff === 'difficult' ? 7 * 60 : diff === 'normal' ? 15 * 60 : null;
    setTimeLeft(timerValue);
    try {
      const qPrompt = `Topic: ${lessonContext.substring(0, 3000)}\n\nGenerate ONE technically accurate ${diff} difficulty question.
Output ONLY the question text. 
Rules:
- NO markdown (# or * symbols)
- NO intro/outro (e.g. "Here is a question...")
- NO multiple options or lists.
- Keep it short and professionally worded.`;

      const res = await fetch(`${API_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: qPrompt, mode: "Quick Response", context: "" })
      });
      const data = await res.json();
      let rawQ = data.output.replace(/\[CHAT\]|\[DOCUMENT\]/gi, '').trim();
      
      // Strict cleaning: remove any leading #, *, or multiple questions
      rawQ = rawQ.replace(/^(Certainly|Sure|Okay|Great|Here is a question|Based on the context|Let's dive into).*?[:.!?*]\s*/gi, '').trim();
      rawQ = rawQ.replace(/[#*]/g, '').trim(); // Remove # and *
      rawQ = rawQ.split('\n')[0].trim(); // Take only the first line if multiple
      
      setQuestion(rawQ);
      setPhase('active');
    } catch (err) {
      setQuestion("Design a fault-tolerant distributed system with high availability. Describe the core architecture components and trade-offs.");
      setPhase('active');
    }
  };

  const handleSubmit = async () => {
    if (!userAnswer.trim()) return;
    if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
    setPhase('evaluating');
    setIsScanning(true);
    setAuditProgress(0);
    setEvalCards([]);
    setRevealedCount(0);

    let progressInt = setInterval(() => {
      setAuditProgress(p => p < 85 ? p + 1.5 : p);
    }, 200);

    // Structured prompt — forces parseable sections
    const promptRaw = `You are a CRITICAL TECHNICAL AUDITOR. Perform a RUTHLESS architectural audit.
Be exceptionally strict. If any core concept is missing, mark it as a GAP.

QUESTION: ${question}
USER ANSWER: ${userAnswer}

Respond in EXACTLY this format — no extra text outside these sections:

## OVERALL_SCORE
[number]/100 (Be strict. 100 is for master-level perfection. Basic correct but shallow = 60-70.)

## GAP_1
ISSUE: [be technical and precise]
FIX: [exactly what to add to fix this specific issue]

## GAP_2
ISSUE: [be technical and precise]
FIX: [exactly what to add to fix this specific issue]

## GAP_3
ISSUE: [be technical and precise]
FIX: [exactly what to add to fix this specific issue]

## STRENGTH
[1-2 sentences on exactly what technical pattern was identified correctly]

## ACCURACY_SCORE
[number]/10

## DEPTH_SCORE
[number]/10

## GOLD_STANDARD
[Complete benchmark answer as 5-7 technical bullet points]`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptRaw, mode: "Detailed", context: "" })
      });
      const data = await response.json();
      const rawOutput = data.output.replace(/\[CHAT\]|\[DOCUMENT\]/gi, '').trim();
      setEvaluation(rawOutput);

      // ── Parse structured sections ────────────────────────────────
      const getSection = (tag) => {
        const re = new RegExp(`##\\s*${tag}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
        const m = rawOutput.match(re);
        return m ? m[1].trim() : '';
      };

      const accRaw = parseInt(getSection('ACCURACY_SCORE').match(/(\d+)/)?.[1] || '7');
      const depRaw = parseInt(getSection('DEPTH_SCORE').match(/(\d+)/)?.[1] || '6');
      const scoreRaw = getSection('OVERALL_SCORE').match(/(\d+)/)?.[1] || String(Math.round((accRaw + depRaw) * 5));
      const gold = getSection('GOLD_STANDARD');
      const strength = getSection('STRENGTH');
      setGoldStandard(gold || rawOutput);

      const acc = Math.min(accRaw * 10, 100);
      const dep = Math.min(depRaw * 10, 100);
      setLiveMetrics({ accuracy: acc, depth: dep, rigor: parseFloat(((acc + dep) / 2).toFixed(1)) });

      // ── Build evaluation cards ────────────────────────────────────
      const cards = [];
      if (strength) cards.push({ type: 'strength', title: '✅ What You Got Right', body: strength });

      ['GAP_1', 'GAP_2', 'GAP_3'].forEach((tag, i) => {
        const raw = getSection(tag);
        if (!raw) return;
        const issueM = raw.match(/ISSUE:\s*(.+)/i);
        const fixM   = raw.match(/FIX:\s*(.+)/i);
        if (issueM && fixM) {
          cards.push({
            type: 'gap',
            title: `⚠️ Gap ${i + 1} — Missing Concept`,
            issue: issueM[1].trim(),
            fix: fixM[1].trim(),
          });
        }
      });

      cards.push({ type: 'score', title: '📊 Final Score', score: scoreRaw, acc, dep });
      setEvalCards(cards);

      clearInterval(progressInt);
      setAuditProgress(100);

      // Show all cards immediately instead of one-by-one
      setRevealedCount(cards.length);
      
      if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
      setTimeout(() => { 
        setPhase('result'); 
        setIsScanning(false);
      }, 1500); // Brief pause to see the scan hit 100% before transition

    } catch (err) {
      clearInterval(progressInt);
      setPhase('result');
      setIsScanning(false);
    }
  };


  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="tm-main-wrapper">
      {/* ── Floating Robot Buddy (always present) ── */}
      <RobotBuddy message={buddyMsg} visible={buddyVisible} />

      <div className="tm-container">

        {/* Header removed as requested */}


        {/* SELECTION PHASE */}
        {phase === 'selection' && (
          <div className="tm-hologram-selection animate-fade">
            <div className="tm-selection-unit">
              <div className="tm-scan-ring" />
              <div className="tm-robot-wrapper">
                <img
                  src="https://img.icons8.com/3d-fluency/188/ai-robot--v3.png"
                  className="tm-master-robot"
                  alt="Eduface AI Robot"
                />
                <div className="tm-robot-label">EDUFACE AI</div>
              </div>

              <div className="tm-hologram-msg">
                <h2>How challenging should this technical audit be?</h2>
                <div className="tm-hologram-options">
                  <button className="tm-holo-btn" onClick={() => startTest('easy')}>
                    <Activity size={18} /> I'm just starting
                  </button>
                  <button className="tm-holo-btn" onClick={() => startTest('normal')}>
                    <Zap size={18} /> Balanced challenge
                  </button>
                  <button className="tm-holo-btn" onClick={() => startTest('difficult')}>
                    <Target size={18} /> Push to my limits
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOADING PHASE */}
        {phase === 'loading' && (
          <div className="tm-loading-phase animate-fade">
            <div className="tm-loading-robot">
              <img src="https://img.icons8.com/3d-fluency/188/ai-robot--v3.png" className="tm-master-robot" alt="AI" />
              <div className="tm-loading-dots"><span /><span /><span /></div>
              <p>Calibrating challenge...</p>
            </div>
          </div>
        )}

        {/* DEEP SCAN HUD — only during evaluating phase */}
        {phase === 'evaluating' && (
          <div className="tm-scan-fullscreen animate-fade">
            {/* Progress bar HUD */}
            <div className="tm-scan-hud">
              <div className="tm-hud-top">
                <div className="tm-hud-info">
                  <Search size={18} className="tm-spin" color="#8b5cf6" />
                  <div>
                    <h3>AUDIT SCAN: {Math.round(auditProgress)}%</h3>
                    <span>EDUFACE-AI V4 PRO | DEEP_LOGIC_PROTOCOL</span>
                  </div>
                </div>
                <div className="tm-hud-percent">{Math.round(auditProgress)}%</div>
              </div>
              <div className="tm-hud-progress-bar">
                <div className="fill" style={{ width: `${auditProgress}%` }} />
              </div>
              <div className="tm-hud-metrics">
                <div className="tm-metric-box">
                  <label>ACCURACY</label>
                  <div className="val">{liveMetrics.accuracy || '—'}%</div>
                </div>
                <div className="tm-metric-box">
                  <label>DEPTH</label>
                  <div className="val">{liveMetrics.depth || '—'}%</div>
                </div>
                <div className="tm-metric-box">
                  <label>RIGOR</label>
                  <div className="val">{liveMetrics.rigor || '—'}</div>
                </div>
              </div>
            </div>

            {/* Live evaluation card reveal */}
            <div className="tm-eval-cards-area">
              {evalCards.length === 0 && (
                <div className="tm-eval-waiting">
                  <div className="tm-loading-dots"><span /><span /><span /></div>
                  <p>Initializing deep system audit...</p>
                </div>
              )}
              {evalCards.slice(0, revealedCount).map((card, i) => (
                <div
                  key={i}
                  className={`tm-eval-card tm-eval-card--${card.type} animate-card-in`}
                >
                  <div className="tm-eval-card-title">{card.title}</div>
                  {card.type === 'strength' && (
                    <div className="tm-eval-card-body">{card.body}</div>
                  )}
                  {card.type === 'gap' && (
                    <div className="tm-eval-gap-content">
                      <div className="tm-eval-issue">
                        <span className="lbl"><AlertTriangle size={11} /> Issue</span>
                        <p>{card.issue}</p>
                      </div>
                      <div className="tm-eval-fix">
                        <span className="lbl"><Wrench size={11} /> How to Fix</span>
                        <p>{card.fix}</p>
                      </div>
                    </div>
                  )}
                  {card.type === 'score' && (
                    <div className="tm-eval-score-row">
                      <div className="tm-eval-score-big">{card.score}<span>/100</span></div>
                      <div className="tm-eval-score-bars">
                        <div className="sb-row"><span>Accuracy</span><div className="sb"><div className="sb-fill" style={{ width: `${card.acc}%` }} /></div><b>{card.acc}%</b></div>
                        <div className="sb-row"><span>Depth</span><div className="sb"><div className="sb-fill depth" style={{ width: `${card.dep}%` }} /></div><b>{card.dep}%</b></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ACTIVE PHASE */}
        {phase === 'active' && (
          <div className="tm-two-column animate-slide">
            <div className="tm-left-panel">
              <div className="tm-question-card">
                <div className="tm-q-top">
                  <div className="tm-q-label">SYSTEM CHALLENGE · {difficulty?.toUpperCase()}</div>
                  {timeLeft !== null && (
                    <div className="tm-timer-capsule">
                      <Timer size={12} /> {formatTime(timeLeft)}
                    </div>
                  )}
                </div>
                <div className="tm-q-text">{question}</div>
              </div>

              <div className="tm-confidence-section">
                <div className="tm-conf-title">ARCHITECTURAL CONFIDENCE</div>
                <div className="tm-conf-buttons">
                  <button 
                    className={`tm-conf-btn low ${confidence === 'low' ? 'active' : ''}`}
                    onClick={() => setConfidence('low')}
                  >
                    <span className="emoji">🫠</span>
                    <span className="lbl">LOW</span>
                  </button>
                  <button 
                    className={`tm-conf-btn medium ${confidence === 'medium' ? 'active' : ''}`}
                    onClick={() => setConfidence('medium')}
                  >
                    <span className="emoji">🧐</span>
                    <span className="lbl">MEDIUM</span>
                  </button>
                  <button 
                    className={`tm-conf-btn high ${confidence === 'high' ? 'active' : ''}`}
                    onClick={() => setConfidence('high')}
                  >
                    <span className="emoji">😎</span>
                    <span className="lbl">HIGH</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="tm-right-panel">
              <div className="tm-editor-wrapper">
                <textarea
                  className="tm-textarea"
                  placeholder="Log your architectural reasoning here..."
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                />
              </div>
              <div className="tm-keyword-cloud">
                {keywordsToWatch.map(kw => (
                  <span key={kw} className={`tm-kw-badge ${userAnswer.toLowerCase().includes(kw) ? 'active' : ''}`}>
                    {kw}
                  </span>
                ))}
              </div>
              <button
                className="tm-submit-btn premium"
                onClick={handleSubmit}
                disabled={!userAnswer.trim() || !confidence}
              >
                <ClipboardList size={16} /> INITIATE DEEP SYSTEM AUDIT
              </button>
            </div>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === 'result' && (
          <div className="tm-result-fullscreen animate-fade">

            {/* ── Score Banner with actions top-right ── */}
            <div className="tm-result-banner">
              <div className="tm-result-score-block">
                <div className="tm-score-orbit">
                  <div className="tm-score-ring" />
                  <div className="tm-score-display">
                    {evalCards.find(c => c.type === 'score')?.score ?? liveMetrics.accuracy}
                  </div>
                </div>
                <div className="tm-result-score-label">/ 100</div>
              </div>

              <div className="tm-result-meta">
                <div className="tm-meta-badge">{difficulty?.toUpperCase()} · AUDIT COMPLETE</div>
                <h1 className="tm-result-title">Evaluation Report</h1>
                <div className="tm-meta-stats">
                  <div className="tm-stat-chip">
                    <span className="chip-label">ACCURACY</span>
                    <span className="chip-val">{liveMetrics.accuracy}%</span>
                  </div>
                  <div className="tm-stat-chip">
                    <span className="chip-label">DEPTH</span>
                    <span className="chip-val">{liveMetrics.depth}%</span>
                  </div>
                  <div className="tm-stat-chip">
                    <span className="chip-label">RIGOR</span>
                    <span className="chip-val">{liveMetrics.rigor}</span>
                  </div>
                </div>
              </div>

              {/* Actions – top-right */}
              <div className="tm-banner-actions">
                <button className="tm-action-btn primary" onClick={() => {
                  setPhase('selection');
                  setUserAnswer('');
                  setConfidence(null);
                  setEvaluation(null);
                  setEvalCards([]);
                  setRevealedCount(0);
                  setAuditProgress(0);
                  prevKeywordCountRef.current = 0;
                }}>
                  <RefreshCcw size={14} /> New Session
                </button>
                <button className="tm-action-btn ghost" onClick={() => navigate(-1)}>
                  <LogOut size={14} /> Exit
                </button>
              </div>
            </div>

            {/* ── Strength Strip ── */}
            {evalCards.find(c => c.type === 'strength') && (
              <div className="tm-strength-strip">
                <CheckCircle2 size={18} color="#10b981" className="tm-strip-icon-svg" />
                <div>
                  <div className="tm-strip-label">WHAT YOU GOT RIGHT</div>
                  <div className="tm-strip-text">{evalCards.find(c => c.type === 'strength')?.body}</div>
                </div>
              </div>
            )}

            {/* ── Gap Cards Row ── */}
            <div className="tm-gaps-row">
              {evalCards.filter(c => c.type === 'gap').map((card, i) => (
                <div key={i} className="tm-gap-card">
                  <div className="tm-gap-num">GAP {i + 1}</div>
                  <div className="tm-gap-issue">
                    <span className="tm-gap-lbl red"><AlertTriangle size={11} /> ISSUE</span>
                    <p>{card.issue}</p>
                  </div>
                  <div className="tm-gap-fix">
                    <span className="tm-gap-lbl green"><Wrench size={11} /> HOW TO FIX</span>
                    <p>{card.fix}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Two-column: Your answer + Score bars ── */}
            <div className="tm-result-two-col">
              <div className="tm-result-panel">
                <div className="tm-panel-label">YOUR RESPONSE</div>
                <div className="tm-panel-body">{userAnswer}</div>
              </div>
              <div className="tm-result-panel">
                <div className="tm-panel-label">PERFORMANCE BREAKDOWN</div>
                <div className="tm-perf-bars">
                  {[
                    { label: 'Accuracy', val: liveMetrics.accuracy, color: '#8b5cf6' },
                    { label: 'Depth',    val: liveMetrics.depth,    color: '#22d3ee' },
                    { label: 'Rigor',    val: liveMetrics.rigor,    color: '#10b981' },
                  ].map(m => (
                    <div key={m.label} className="tm-perf-row">
                      <div className="tm-perf-meta">
                        <span>{m.label}</span>
                        <b style={{ color: m.color }}>{m.val}%</b>
                      </div>
                      <div className="tm-perf-track">
                        <div className="tm-perf-fill" style={{ width: `${m.val}%`, background: m.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Gold Standard ── */}
            <div className="tm-gold-section">
              <button className="tm-benchmark-toggle" onClick={() => setShowTopAnswer(!showTopAnswer)}>
                <Trophy size={14} />
                {showTopAnswer ? 'Hide' : 'View'} Gold Standard Benchmark
                {showTopAnswer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showTopAnswer && (
                <div className="tm-gold-card animate-fade">
                  <div className="tm-panel-label">MASTER REFERENCE ANSWER</div>
                  <div className="tm-gold-body">
                    <ReactMarkdown>{goldStandard}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

