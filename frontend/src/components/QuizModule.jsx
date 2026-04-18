import React, { useState } from 'react';
import { RefreshCcw, CheckCircle, XCircle, BarChart2, BookOpen, AlertCircle, Award } from 'lucide-react';
import '../styles/QuizModule.css';

const API_BASE_URL = 'http://localhost:5000';

const QuizModule = ({ lessonContent }) => {
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [evaluation, setEvaluation] = useState(null);
  const [detailedReviews, setDetailedReviews] = useState([]);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');

  const generateQuiz = async () => {
    if (!lessonContent) return;
    setLoading(true);
    setEvaluation(null);
    setUserAnswers({});
    try {
      const response = await fetch(`${API_BASE_URL}/api/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_content: lessonContent,
          num_questions: numQuestions,
          difficulty: difficulty,
          user_answers: {}
        })
      });
      const data = await response.json();
      if (data.success && data.data && data.data.quiz) {
        setQuizData(data.data.quiz);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_content: lessonContent,
          num_questions: numQuestions,
          difficulty: difficulty,
          user_answers: userAnswers
        })
      });
      const data = await response.json();
      if (data.success && data.data && data.data.evaluation) {
        setEvaluation(data.data.evaluation);
        if (data.data.quiz) {
            setQuizData(data.data.quiz);
        }

        // 2. Fetch Detailed per-question review
        try {
          const reviewResponse = await fetch(`${API_BASE_URL}/api/quiz/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questions: (data.data.quiz || quizData).map(q => ({
                question: q.question,
                options: q.options,
                correctAnswer: q.correct_answer,
                userAnswer: userAnswers[q.id]
              }))
            })
          });
          const reviewData = await reviewResponse.json();
          if (reviewData.success) {
            setDetailedReviews(reviewData.evaluations);
          }
        } catch (reviewErr) {
          console.error("Error fetching detailed reviews", reviewErr);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (qId, optionKey) => {
    if (evaluation) return; // Prevent changing after submission
    setUserAnswers(prev => ({ ...prev, [qId]: optionKey }));
  };

  if (!quizData && !loading) {
    return (
      <div className="quiz-setup">
        <h3><BookOpen size={18} /> Test Your Knowledge</h3>
        <p>Generate a customized quiz based on this video lesson to test your understanding.</p>
        <div className="quiz-controls">
          <label>Difficulty:</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <label>Questions:</label>
          <select value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))}>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
          <button onClick={generateQuiz} className="quiz-btn primary">
            Generate Quiz
          </button>
        </div>
      </div>
    );
  }

  if (loading && !quizData) {
    return (
      <div className="quiz-loading">
        <RefreshCcw className="quiz-spin" size={24} />
        <p>AI is generating your quiz...</p>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <h3><BookOpen size={18} /> Lesson Quiz</h3>
      
      {!evaluation ? (
        <div className="quiz-list">
          {quizData.map((q, idx) => (
            <div key={q.id} className="quiz-card">
              <h4>{idx + 1}. {q.question}</h4>
              <p className="quiz-concept">Concept: {q.concept}</p>
              <div className="quiz-options">
                {Object.entries(q.options).map(([key, val]) => (
                  <button 
                    key={key} 
                    className={`quiz-opt-btn ${userAnswers[q.id] === key ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(q.id, key)}
                  >
                    <span className="opt-key">{key}</span> {val}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button 
            className="quiz-btn primary full-width" 
            onClick={submitQuiz}
            disabled={Object.keys(userAnswers).length !== quizData.length || loading}
          >
            {loading ? <RefreshCcw className="quiz-spin" size={18} /> : 'Submit Answers'}
          </button>
        </div>
      ) : (
        <div className="quiz-evaluation">
          <div className="eval-summary">
            <div className="eval-score-card">
               <h2>{evaluation.score?.accuracy || '0%'}</h2>
               <p>Score</p>
            </div>
            <div className="eval-stats">
               <p><CheckCircle size={16} color="green"/> Correct: {evaluation.score?.correct}</p>
               <p><XCircle size={16} color="red"/> Wrong: {evaluation.score?.wrong}</p>
               <p><Award size={16} color="var(--primary-color)"/> Level: {evaluation?.learning_level}</p>
            </div>
          </div>
          
          <div className="eval-feedback">
             <p><em>{evaluation.engagement_feedback}</em></p>
          </div>

          <div className="eval-details-split">
             <div className="eval-strengths">
                <h4>Strengths</h4>
                <ul>
                  {evaluation.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
             </div>
             <div className="eval-weaknesses">
                <h4>Areas to Improve</h4>
                <ul>
                  {evaluation.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
            </div>
          </div>

          <div className="eval-suggestions">
             <h4><AlertCircle size={16}/> Suggestions for You</h4>
             <ul>
               {evaluation.improvement_suggestions?.map((s, i) => <li key={i}>{s}</li>)}
             </ul>
          </div>

          <div className="eval-concept-analysis">
             <h4><BarChart2 size={16}/> Concept Analysis</h4>
             {evaluation.concept_analysis?.map((c, i) => (
               <div key={i} className="concept-bar-container">
                 <div className="concept-bar-header">
                    <span>{c.concept}</span>
                    <span>{c.accuracy}</span>
                 </div>
                 <div className="concept-bar-bg">
                    <div 
                      className={`concept-bar-fill ${c.level.toLowerCase()}`}
                      style={{ width: c.accuracy }}
                    ></div>
                 </div>
               </div>
             ))}
          </div>

          <div className="quiz-review">
            <h4><BarChart2 size={16}/> AI Learning Review</h4>
            <p className="review-intro">Deep analysis of your performance across each concept.</p>
            
            {quizData.map((q, idx) => {
              const uAns = userAnswers[q.id];
              const isCorrect = uAns === q.correct_answer;
              const review = detailedReviews[idx];

              return (
                <div key={q.id} className={`quiz-review-card ${isCorrect ? 'correct' : 'wrong'}`}>
                  <header className="review-card-header">
                    <span className="review-badge">{isCorrect ? 'Correct' : 'Needs Review'}</span>
                    <h5>{idx + 1}. {q.question}</h5>
                  </header>
                  
                  <div className="review-choices">
                    <div className="choice-row">
                      <span className="choice-label">Your Selection:</span>
                      <span className={`choice-value ${!isCorrect ? 'text-error' : 'text-success'}`}>
                         {q.options[uAns]} {!isCorrect && <XCircle size={14} />}
                      </span>
                    </div>
                    {!isCorrect && (
                      <div className="choice-row">
                        <span className="choice-label">Correct Answer:</span>
                        <span className="choice-value text-success">
                          {q.options[q.correct_answer]} <CheckCircle size={14} />
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="quiz-review-details">
                    <span className="review-label">Tutor Explanation:</span>
                    <p className="review-text">{review ? review.explanation : q.explanation}</p>
                    
                    {review && review.mistakeExplanation && !isCorrect && (
                      <div className="mistake-analysis">
                         <span className="review-label">Misconception Detection:</span>
                         <p className="review-text">{review.mistakeExplanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button className="quiz-btn secondary" onClick={() => { setQuizData(null); setEvaluation(null); }}>
             Take Another Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizModule;
