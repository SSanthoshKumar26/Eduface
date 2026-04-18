import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, 
  XCircle, BookOpen, ExternalLink, BrainCircuit, AlertCircle
} from 'lucide-react';
import './QuizReview.css';

const QuizReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { detailedReviews, evaluation } = location.state || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!detailedReviews || detailedReviews.length === 0) {
    return (
      <div className="qr-page-root" data-theme="dark">
        <div className="qr-empty-state">
          <h2>No review data available.</h2>
          <button className="qr-primary-btn mt-4" onClick={() => navigate(-1)}>Return</button>
        </div>
      </div>
    );
  }

  const review = detailedReviews[currentIndex];
  const total = detailedReviews.length;
  
  // Normalize result check (handles casing and spaces)
  const resultStr = review.result?.toLowerCase().trim() || 'not attempted';
  const isCorrect = resultStr === 'correct';
  const isWrong = resultStr === 'incorrect' || resultStr === 'wrong';
  const isSkipped = resultStr === 'not attempted' || resultStr === 'not_attempted' || !review.userAnswer;

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsExpanded(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsExpanded(false);
    }
  };

  const getStatusConfig = () => {
    if (isCorrect) return { label: 'CORRECT', color: 'bg-success', icon: <CheckCircle size={16} />, glow: 'correct-glow' };
    if (isWrong) return { label: 'WRONG', color: 'bg-error', icon: <XCircle size={16} />, glow: 'wrong-glow' };
    return { label: 'SKIPPED', color: 'bg-neutral', icon: <AlertCircle size={16} />, glow: 'skipped-glow' };
  };

  const status = getStatusConfig();

  return (
    <div className="qr-page-root" data-theme="dark">
      
      {/* Top Header Navigation */}
      <header className="qr-top-nav">
        <button className="qr-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back to Insights
        </button>
        <div className="qr-progress-indicator">
          Question {currentIndex + 1} of {total}
        </div>
      </header>

      <main className="qr-main-container">
        
        {/* Left Side: Question & User Choices */}
        <section className={`qr-question-panel ${status.glow}`}>
          <div className="qr-badge-container">
            <span className={`qr-status-badge ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>

          <h2 className="qr-question-text">
            {currentIndex + 1}. {review.question}
          </h2>

          <div className="qr-choice-box">
            <div className="qr-choice-header">Your Selection:</div>
            <div className={`qr-choice-content ${isCorrect ? 'text-success' : isSkipped ? 'text-neutral' : 'text-error'}`}>
              {isSkipped ? '— Question Skipped —' : review.userAnswer}
              {isCorrect && <CheckCircle size={18} className="qr-choice-icon" />}
              {isWrong && <XCircle size={18} className="qr-choice-icon" />}
              {isSkipped && <AlertCircle size={18} className="qr-choice-icon" />}
            </div>
          </div>

          {(!isCorrect) && (
            <div className="qr-choice-box qr-correct-box">
              <div className="qr-choice-header">Correct Path:</div>
              <div className="qr-choice-content text-success">
                {review.correctAnswer}
                <CheckCircle size={18} className="qr-choice-icon" />
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="qr-pagination-controls">
            <button 
              className="qr-nav-btn" 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={20} /> Previous
            </button>
            <div className="qr-dots">
              {detailedReviews.map((r, idx) => {
                const res = r.result?.toLowerCase().trim() || 'not attempted';
                const dotClass = res === 'correct' ? 'dot-success' : (res === 'incorrect' || res === 'wrong') ? 'dot-wrong' : 'dot-skipped';
                return (
                  <span 
                    key={idx} 
                    className={`qr-dot ${idx === currentIndex ? 'active' : ''} ${dotClass}`}
                    onClick={() => setCurrentIndex(idx)}
                  />
                );
              })}
            </div>
            <button 
              className="qr-nav-btn qr-nav-next" 
              onClick={handleNext} 
              disabled={currentIndex === total - 1}
            >
              {currentIndex === total - 1 ? 'Finish' : 'Next'} <ChevronRight size={20} />
            </button>
          </div>
        </section>

        {/* Right Side: AI Deep Analysis */}
        <section className="qr-analysis-panel">
          
          <div className="qr-analysis-card">
            <h3 className="qr-card-title">
              <BrainCircuit size={18} className="text-primary"/> AI Tutor Explanation
            </h3>
            <div className={`qr-card-text-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
              <p className="qr-card-text">{review.explanation}</p>
            </div>
            {review.explanation && review.explanation.length > 150 && (
              <button 
                className="qr-expand-btn" 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Show Less' : 'Dive Deeper'}
              </button>
            )}
          </div>

          {review.mistakeExplanation && !isCorrect && (
            <div className="qr-analysis-card mistake-card">
              <h3 className="qr-card-title error-title">
                <AlertCircle size={18} /> Misconception Detection
              </h3>
              <p className="qr-card-text">{review.mistakeExplanation}</p>
            </div>
          )}

          <div className="qr-analysis-card resources-card">
            <h3 className="qr-card-title">
              <BookOpen size={18} className="text-secondary" /> Recommend Learning Resources
            </h3>
            {review.additionalResources && review.additionalResources.length > 0 ? (
              <ul className="qr-resource-list">
                {review.additionalResources.map((res, i) => {
                  const parts = res.split(' - ');
                  const title = parts[0] || res;
                  const desc = parts[1] || "";
                  return (
                    <li key={i} className="qr-resource-item">
                      <ExternalLink size={16} className="qr-link-icon"/>
                      <div className="qr-resource-content">
                        <strong>{title}</strong>
                        {desc && <span>{desc}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="qr-card-text" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                Reviewing the core documentation on this topic will reinforce the learning outcomes.
              </p>
            )}
          </div>

        </section>
      </main>
    </div>
  );
};

export default QuizReview;
