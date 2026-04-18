import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './QuizStyles.css';

const API_BASE_URL = 'http://localhost:5000';

const QuizAttempt = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { lessonContent, quiz, numQuestions, difficulty } = location.state || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!quiz || !lessonContent) {
      navigate('/video-gen');
    }
  }, [quiz, lessonContent, navigate]);

  if (!quiz) return null;

  const currentQuestion = quiz[currentIndex];
  const totalQuestions = quiz.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handleSelectOption = (key) => {
    setCurrentAnswers({
      ...currentAnswers,
      [currentQuestion.id]: key
    });
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
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
        const evaluation = response.data.data.evaluation;
        
        // Fetch detailed evaluations
        try {
          const detailResponse = await axios.post(`${API_BASE_URL}/api/quiz/evaluate`, {
            questions: quiz.map(q => ({
              question: q.question,
              options: q.options,
              correctAnswer: q.correct_answer,
              userAnswer: currentAnswers[q.id]
            }))
          });
          
          navigate('/quiz/result', {
            state: {
              evaluation,
              detailedReviews: detailResponse.data.success ? detailResponse.data.evaluations : null,
              lessonContent
            }
          });
        } catch (detailError) {
          console.error("Detailed evaluation failed", detailError);
          navigate('/quiz/result', {
            state: { evaluation, lessonContent }
          });
        }
      }
    } catch (error) {
      console.error("Quiz submission failed", error);
    } finally {
      setLoading(false);
    }
  };

  const answeredCount = Object.keys(currentAnswers).length;
  const remainingCount = totalQuestions - answeredCount;
  const progressPercentage = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="qc-page-root ld-root" data-theme="dark">
      <div className="qc-attempt-container animate-fade">
        <div className="qc-progress-header">
           <div className="qc-stats-row">
             <div className="qc-stat-group">
               <span className="qc-stat-val primary">{answeredCount}</span>
               <span className="qc-stat-lab">Attempted</span>
             </div>
             <div className="qc-stat-group">
               <span className="qc-stat-val warning">{remainingCount}</span>
               <span className="qc-stat-lab">Remaining</span>
             </div>
           </div>
           <div className="qc-progress-track">
             <div 
               className="qc-progress-fill" 
               style={{ width: `${progressPercentage}%` }}
             ></div>
           </div>
           <div className="qc-step-info">Question {currentIndex + 1} of {totalQuestions}</div>
        </div>

        <div className="qc-question-section">
          <div className="qc-q-meta">
             <span className="qc-q-concept">{currentQuestion?.concept || 'Core Concept'}</span>
          </div>
          <h2 className="qc-question-text">{currentQuestion?.question}</h2>
          <div className="qc-options-list">
            {currentQuestion?.options && Object.entries(currentQuestion.options).map(([key, val]) => {
              const  isSelected = currentAnswers[currentQuestion.id] === key;
              return (
                <button
                  key={key}
                  className={`qc-option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(key)}
                  disabled={loading}
                >
                  <span className="qc-opt-marker">{key}</span>
                  <span className="qc-opt-val">{val}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="qc-footer-nav">
          <button 
            className="qc-nav-arrow-btn" 
            onClick={handlePrevious}
            disabled={loading || currentIndex === 0}
          >
            Previous
          </button>
          
          {isLastQuestion ? (
            <button 
              className="qc-final-submit-btn" 
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Finish Assessment'}
            </button>
          ) : (
            <button 
              className="qc-nav-arrow-btn primary" 
              onClick={handleNext}
              disabled={loading}
            >
              Next Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizAttempt;
