import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiX, FiChevronLeft, FiChevronRight, FiPlay } from 'react-icons/fi';
import '../styles/PPTPresentation.css';

const PPTPresentation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const rawContent = location.state?.content || "";
  
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [visibleBullets, setVisibleBullets] = useState(0);

  // Parse Markdown into structured slides
  useEffect(() => {
    if (!rawContent) return;

    const lines = rawContent.split('\n');
    const parsedSlides = [];
    let currentSlide = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('## ')) {
        // New Slide
        if (currentSlide) parsedSlides.push(currentSlide);
        currentSlide = {
          title: trimmed.replace('## ', '').trim(),
          bullets: []
        };
      } else if (trimmed.startsWith('# ')) {
        // Main Title (treat as first slide if no slides yet)
        if (!currentSlide) {
          currentSlide = {
            title: trimmed.replace('# ', '').trim(),
            bullets: ["Presentation Overview"]
          };
        }
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        if (currentSlide) {
          currentSlide.bullets.push(trimmed.replace(/^[*\-•]\s*/, '').trim());
        }
      } else if (trimmed.length > 10) {
        // Regular text paragraph - treat as a major point if it's long enough
        if (currentSlide) {
          currentSlide.bullets.push(trimmed);
        }
      }
    });

    if (currentSlide) parsedSlides.push(currentSlide);
    
    // Fallback if no markdown H2s were found
    if (parsedSlides.length === 0 && rawContent) {
      parsedSlides.push({
        title: "Presentation Content",
        bullets: rawContent.split('\n').filter(l => l.trim().length > 5).slice(0, 6)
      });
    }

    setSlides(parsedSlides);
  }, [rawContent]);

  // Handle sequential bullet reveal
  useEffect(() => {
    setVisibleBullets(0);
    if (!slides[currentSlideIndex]) return;

    const animateBullets = () => {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setVisibleBullets(count);
        if (count >= slides[currentSlideIndex].bullets.length) {
          clearInterval(interval);
        }
      }, 500); // 500ms delay between each bullet reveal
      return interval;
    };

    const intervalId = animateBullets();
    return () => clearInterval(intervalId);
  }, [currentSlideIndex, slides]);

  // Navigation handlers
  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides]);

  const currentSlide = slides[currentSlideIndex];

  if (slides.length === 0) {
    return (
      <div className="presentation-overlay">
        <div className="pres-header">
          <span className="pres-logo">EDURFACE AI</span>
          <button className="pres-close-btn" onClick={() => navigate(-1)}>Exit</button>
        </div>
        <div className="pres-slide-container">
          <h2>No content found for presentation.</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="presentation-overlay">
      <div className="pres-header">
        <div className="pres-brand">
          <FiPlay size={20} style={{ color: '#38bdf8', marginRight: '0.75rem' }} />
          <span style={{ fontWeight: 800, letterSpacing: '1px' }}>EDUFACE PRESENTATION MODE</span>
        </div>
        <div className="pres-controls">
          <span className="pres-slide-counter">Slide {currentSlideIndex + 1} of {slides.length}</span>
          <button className="pres-close-btn" onClick={() => navigate(-1)}>
            <FiX size={18} style={{ marginRight: '0.5rem' }} /> EXIT
          </button>
        </div>
      </div>

      <div className="pres-slide-container">
        <div className="pres-slide-card" key={currentSlideIndex}>
          <h1 className="slide-title">{currentSlide?.title}</h1>
          <ul className="pres-content-list">
            {currentSlide?.bullets.map((bullet, idx) => (
              <li 
                key={idx} 
                className={`pres-bullet ${idx < visibleBullets ? 'reveal' : ''}`}
              >
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        <div className="pres-navigation">
          <button 
            className="nav-btn" 
            onClick={prevSlide} 
            disabled={currentSlideIndex === 0}
            title="Previous (Left Arrow)"
          >
            <FiChevronLeft size={24} />
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="pres-progress-dots">
              {slides.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`dot ${idx === currentSlideIndex ? 'active' : ''}`} 
                />
              ))}
            </div>
          </div>

          <button 
            className="nav-btn" 
            onClick={nextSlide} 
            disabled={currentSlideIndex === slides.length - 1}
            title="Next (Right Arrow / Space)"
          >
            <FiChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="pres-footer">
        © 2026 Eduface AI Presentation Engine • Professional Standard
      </div>
    </div>
  );
};

export default PPTPresentation;
