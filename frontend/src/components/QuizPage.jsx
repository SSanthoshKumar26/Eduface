import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Brain, List, Timer, ChevronRight, Settings, Sparkles, ArrowLeft,
  BarChart3, TrendingUp, Award, CheckCircle2,
  AlertTriangle, BookOpen
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import axios from 'axios';
import '../styles/QuizPage.css';

const API_BASE_URL = 'http://127.0.0.1:5000';

const QuizPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { lessonContent, numQuestions: initialNum, difficulty: initialDiff } = location.state || {};

  const [step, setStep] = useState('form');
  const [numQuestions, setNumQuestions] = useState(initialNum || 5);
  const [difficulty, setDifficulty] = useState(initialDiff || 'medium');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState([]);
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [evaluation, setEvaluation] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!lessonContent) navigate('/video-gen');
  }, [lessonContent, navigate]);

  // Combined Chart and Feedback Logic
  const analytics = useMemo(() => {
    if (!evaluation) return null;

    const score = evaluation.score;
    const isPerfect = score.correct === score.total;

    // Feedback messaging based on score
    let feedback = {
      title: "Good effort! Keep improving.",
      message: "You're on the right track! Review missed concepts to improve.",
      type: "neutral"
    };

    if (isPerfect) {
      feedback = {
        title: "Outstanding! Perfect Score 🎉",
        message: "You’ve mastered this topic! Excellent work.",
        type: "perfect"
      };
    } else if (parseInt(score.accuracy) >= 70) {
      feedback = {
        title: "Great Job!",
        message: "You've shown a strong grasp of the material. A bit more review and you'll be perfect!",
        type: "good"
      };
    } else if (parseInt(score.accuracy) < 40) {
      feedback = {
        title: "Learning takes practice.",
        message: "Don’t worry — review the lesson and try again. Practice makes perfect!",
        type: "low"
      };
    }

    return {
      feedback,
      isPerfect,
      chart: {
        bar: evaluation.concept_analysis.map(c => ({
          name: c.concept.length > 15 ? c.concept.substring(0, 15) + '...' : c.concept,
          accuracy: parseInt(c.accuracy.replace('%', '')),
          full: 100
        })),
        pie: [
          { name: 'Correct', value: score.correct, color: '#10b981' },
          { name: 'Wrong', value: score.wrong, color: '#ef4444' },
          { name: 'Not Attempted', value: score.not_attempted, color: '#64748b' }
        ]
      }
    };
  }, [evaluation]);

  const handleGenerateQuiz = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/quiz`, {
        lesson_content: lessonContent,
        num_questions: numQuestions,
        difficulty: difficulty,
        user_answers: {}
      });
      if (response.data.success) {
        setQuiz(response.data.data.quiz);
        setStep('attempt');
        toast.info("Quiz generated! Good luck.", { theme: 'dark' });
      }
    } catch (error) {
      console.error("Quiz generation failed", error);
      toast.error("Failed to build quiz. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/quiz`, {
        lesson_content: lessonContent,
        num_questions: numQuestions,
        difficulty: difficulty,
        user_answers: currentAnswers,
        full_quiz: quiz
      });
      if (response.data.success) {
        const evalData = response.data.data.evaluation;
        setEvaluation(evalData);
        setStep('analytics');

        if (evalData.score.correct === evalData.score.total) {
          setShowCelebration(true);
          toast.success("PERFECT SCORE! Outstanding!", { position: 'top-center' });
          setTimeout(() => setShowCelebration(false), 5000);
        } else {
          toast.success("Quiz submitted successfully!");
        }
      }
    } catch (error) {
      console.error("Quiz submission failed", error);
      toast.error("Error submitting quiz results.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="quiz-page-root ld-root" data-theme="dark">
        <div className="loader-container">
          <div className="loader-spinner"></div>
          <h2 style={{ marginTop: '20px' }}>Analyzing Progress...</h2>
        </div>
      </div>
    );
  }

  // FORM STEP
  if (step === 'form') {
    return (
      <div className="quiz-page-root ld-root" data-theme="dark">
        <div className="quiz-nav-header">
          <button className="back-nav-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Exit Quiz
          </button>
        </div>
        <div className="quiz-card-premium animate-fade-in">
          <div className="quiz-card-header">
            <div className="icon-badge"><Brain size={32} /></div>
            <h1>Knowledge Check</h1>
            <p>Customize your assessment to match your learning pace.</p>
          </div>
          <div className="quiz-form-body">
            <div className="config-section">
              <label><Settings size={18} /> Difficulty Level</label>
              <div className="difficulty-grid">
                {['easy', 'medium', 'hard'].map((d) => (
                  <div
                    key={d}
                    className={`diff-option ${difficulty === d ? 'active' : ''}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
            <div className="config-section">
              <label><List size={18} /> Questions: <strong>{numQuestions}</strong></label>
              <input
                type="range"
                min="3"
                max="15"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                className="premium-range"
              />
            </div>
            <button className="primary-action-btn" onClick={handleGenerateQuiz}>
              Start Assessment <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ATTEMPT STEP
  if (step === 'attempt') {
    const answeredCount = Object.keys(currentAnswers).length;
    const progressPercent = (answeredCount / quiz.length) * 100;

    return (
      <div className="quiz-page-root ld-root" data-theme="dark">
        <div className="quiz-progress-fixed">
          <div className="progress-content">
            <div className="progress-stats">
              <span className="count-pill">{answeredCount} / {quiz.length} Attempted</span>
              <span className="left-pill">{quiz.length - answeredCount} Remaining</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="quiz-attempt-wrapper animate-slide-up" style={{ marginTop: '100px' }}>
          <div className="questions-scroll-area">
            {quiz.map((q, idx) => (
              <div key={q.id || idx} className="modern-q-card">
                <div className="q-head">
                  <span className="q-index">Question {idx + 1}</span>
                  {currentAnswers[q.id] && <CheckCircle2 size={16} color="#10b981" />}
                </div>
                <h2 className="q-statement">{q.question}</h2>
                <div className="options-vertical-grid">
                  {Object.entries(q.options).map(([key, val]) => (
                    <button
                      key={key}
                      className={`modern-opt-btn ${currentAnswers[q.id] === key ? 'selected' : ''}`}
                      onClick={() => setCurrentAnswers({ ...currentAnswers, [q.id]: key })}
                    >
                      <div className="opt-marker">{key}</div>
                      <div className="opt-content">{val}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="quiz-submit-bar-sticky">
            <button className="submit-sequence-btn" onClick={handleSubmitQuiz}>
              Finish & View Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ANALYTICS / RESULTS STEP
  if (step === 'analytics') {
    return (
      <div className="quiz-page-root ld-root" data-theme="dark">
        {showCelebration && (
          <div className="celebration-fullscreen">
            <div className="confetti-cannon left" />
            <div className="confetti-cannon right" />
            <div className="celebration-content">
              <Award size={80} color="#fbbf24" strokeWidth={1} />
              <h1>Outstanding! Perfect Score 🎉</h1>
              <p>You’ve mastered every concept in this lesson!</p>
            </div>
          </div>
        )}

        <div className="quiz-nav-header">
          <button className="back-nav-btn" onClick={() => setStep('form')}>
            <ArrowLeft size={16} /> Start Over
          </button>
          <h2 className="page-title">Performance Analytics</h2>
        </div>

        <div className="analytics-layout animate-fade-in">
          <aside className="analytics-sidebar">
            <div className="sidebar-header">
              <div className={`score-circle ${analytics?.isPerfect ? 'perfect' : ''}`}>
                <span className="accuracy-val">{evaluation?.score?.accuracy}</span>
                <span className="label">Accuracy</span>
              </div>
              <div className="learning-level-pill">{evaluation?.learning_level}</div>
            </div>

            <div className="score-breakdown-grid">
              <div className="stat-card total">
                <span className="val">{evaluation?.score?.total}</span>
                <span className="lab">Questions</span>
              </div>
              <div className="stat-card correct">
                <span className="val">{evaluation?.score?.correct}</span>
                <span className="lab">Correct</span>
              </div>
              <div className="stat-card wrong">
                <span className="val">{evaluation?.score?.wrong}</span>
                <span className="lab">Wrong</span>
              </div>
              <div className="stat-card unattempted">
                <span className="val">{evaluation?.score?.not_attempted}</span>
                <span className="lab">Skipped</span>
              </div>
            </div>

            <div className="feedback-highlight-box" data-type={analytics?.feedback.type}>
              <h4>{analytics?.feedback.title}</h4>
              <p>{analytics?.feedback.message}</p>
            </div>

            <div className="sidebar-actions">
              <button className="review-btn-large" onClick={() => setStep('review')}>
                <BookOpen size={18} /> Detailed Question Review
              </button>
              <button className="end-btn-large" onClick={() => navigate('/video-gen')}>
                Exit to Dashboard
              </button>
            </div>
          </aside>

          <main className="analytics-main">
            <div className="dashboard-card">
              <div className="card-head"><BarChart3 size={18} /> <h3>Mastery by Concept</h3></div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={analytics?.chart.bar}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Bar dataKey="accuracy" fill="var(--ld-accent)" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="insights-flex">
              <div className="insight-box strength">
                <div className="insight-head"><Award size={14} /> Strengths</div>
                <ul>{evaluation?.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div className="insight-box weakness">
                <div className="insight-head"><AlertTriangle size={14} /> Weak Areas</div>
                <ul>{evaluation?.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            </div>

            <div className="dashboard-card suggestion-card">
              <div className="card-head"><TrendingUp size={18} /> <h3>Next Steps for Improvement</h3></div>
              <div className="suggestions-grid">
                {evaluation?.suggestions.map((s, i) => (
                  <div key={i} className="suggestion-item">
                    <div className="s-dot" />
                    <p>{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // REVIEW STEP
  if (step === 'review') {
    return (
      <div className="quiz-page-root ld-root" data-theme="dark">
        <div className="quiz-nav-header">
          <button className="back-nav-btn" onClick={() => setStep('analytics')}>
            <ArrowLeft size={16} /> Back to Results
          </button>
          <h2 className="page-title">Detailed Question Review</h2>
        </div>

        <div className="review-list-container animate-slide-up">
          {evaluation?.detailed_evaluations.map((evalItem, idx) => {
            const questionData = quiz.find(q => q.id === evalItem.question_id) || quiz[idx];
            return (
              <div key={idx} className={`review-card ${evalItem.status}`}>
                <div className="review-card-header">
                  <span className="q-num">Question {idx + 1}</span>
                  <div className={`status-badge ${evalItem.status}`}>
                    {evalItem.status === 'correct' && <><CheckCircle2 size={14} /> Correct</>}
                    {evalItem.status === 'wrong' && <><X size={14} /> Wrong</>}
                    {evalItem.status === 'not_attempted' && <><AlertTriangle size={14} /> Not Attempted</>}
                  </div>
                </div>

                <h3 className="review-question">{questionData?.question}</h3>

                <div className="review-answers-grid">
                  <div className="answer-box user">
                    <label>Your Answer</label>
                    <div className="answer-content">
                      {evalItem.user_answer ? (
                        <div className="opt-val"><strong>{evalItem.user_answer}</strong>: {questionData?.options?.[evalItem.user_answer]}</div>
                      ) : (
                        <span className="skipped-text">You did not attempt this question</span>
                      )}
                    </div>
                  </div>
                  <div className="answer-box correct">
                    <label>Correct Answer</label>
                    <div className="answer-content">
                      <div className="opt-val"><strong>{evalItem.correct_answer}</strong>: {questionData?.options?.[evalItem.correct_answer]}</div>
                    </div>
                  </div>
                </div>

                <div className="review-explanation-box">
                  <div className="exp-icon"><Sparkles size={16} /></div>
                  <div className="exp-content">
                    <h4>Explanation</h4>
                    <p>{evalItem.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="review-footer-actions">
          <button className="primary-action-btn" onClick={() => setStep('form')}>Retake Quiz</button>
          <button className="secondary-action-btn" onClick={() => navigate('/video-gen')}>Return to Lesson</button>
        </div>
      </div>
    );
  }

  return null;
};

export default QuizPage;


