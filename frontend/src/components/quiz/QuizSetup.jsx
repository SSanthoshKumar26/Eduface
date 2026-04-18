import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './QuizStyles.css';

const API_BASE_URL = 'http://localhost:5000';

const QuizSetup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { lessonContent } = location.state || {};

  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lessonContent) navigate('/video-generator');
  }, [lessonContent, navigate]);

  const handleStartQuiz = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/quiz`, {
        lesson_content: lessonContent,
        num_questions: numQuestions,
        difficulty: difficulty,
        user_answers: {}
      });
      if (response.data.success) {
        navigate('/quiz/attempt', { 
          state: { 
            lessonContent,
            quiz: response.data.data.quiz,
            numQuestions,
            difficulty
          } 
        });
      }
    } catch (error) {
      console.error("Quiz generation failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qc-page-root ld-root" data-theme="dark">
      <div className="qc-centered-container">
        <h1 className="qc-title">Quiz Setup</h1>
        
        <div className="qc-form-section">
          <label className="qc-label">Number of Questions: <span className="qc-value">{numQuestions}</span></label>
          <input
            type="range"
            min="3"
            max="15"
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            className="qc-slider"
          />
        </div>

        <div className="qc-form-section">
          <label className="qc-label">Difficulty Level</label>
          <div className="qc-segmented-control">
            {['easy', 'medium', 'hard'].map((d) => (
              <button 
                key={d}
                className={`qc-segment-btn ${difficulty === d ? 'active' : ''}`}
                onClick={() => setDifficulty(d)}
                disabled={loading}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button 
          className="qc-primary-btn mt-6" 
          onClick={handleStartQuiz}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizSetup;
