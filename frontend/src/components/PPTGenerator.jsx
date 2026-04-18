import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { useUser } from '@clerk/clerk-react';
import { FiArrowLeft, FiDownload, FiLoader, FiCheck, FiX, FiTrash2, FiFileText, FiBook, FiPlay } from 'react-icons/fi';
import ThemeSelector from './ThemeSelector';
import '../styles/PPTGenerator.css';

const PPTGenerator = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useUser();
  const [generatedContent, setGeneratedContent] = useState(location.state?.generatedContent || "");

  const [fileName, setFileName] = useState("AI_Generated_Presentation");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('modern_blue');
  const [customizations, setCustomizations] = useState({
    font_size: 18,
    slide_count: 5,
    theme: 'modern_blue'
  });
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [generatedPpt, setGeneratedPpt] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (location.state?.generatedContent) {
      setGeneratedContent(location.state.generatedContent);
    } else {
      const saved = localStorage.getItem('eduface_ppt_gen');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.generatedContent) setGeneratedContent(parsed.generatedContent);
          if (parsed.fileName) setFileName(parsed.fileName);
          if (parsed.generatedPpt) setGeneratedPpt(parsed.generatedPpt);
          if (parsed.status) setStatus(parsed.status);
        } catch (e) {}
      }
    }
  }, [location.state]);

  useEffect(() => {
    localStorage.setItem('eduface_ppt_gen', JSON.stringify({
      generatedContent, fileName, generatedPpt, status
    }));
  }, [generatedContent, fileName, generatedPpt, status]);

  useEffect(() => {
    setCustomizations(prev => ({ ...prev, theme: selectedTheme }));
  }, [selectedTheme]);

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
  };

  const handleCustomizationChange = (key, value) => {
    if (key === 'slide_count') {
      const minRequired = Math.ceil((generatedContent?.length || 0) / 600) || 3;
      if (value < minRequired) {
        setCustomizations(prev => ({ ...prev, [key]: minRequired }));
        return;
      }
    }
    setCustomizations(prev => ({ ...prev, [key]: value }));
  };

  const minSlides = Math.max(3, Math.ceil((generatedContent?.length || 0) / 600));

  useEffect(() => {
    if (customizations.slide_count < minSlides) {
      setCustomizations(prev => ({ ...prev, slide_count: minSlides }));
    }
  }, [generatedContent, minSlides]);

  const handleClear = () => {
    localStorage.removeItem('eduface_ppt_gen');
    setGeneratedContent("");
    setStatus('idle');
    window.history.replaceState({}, document.title);
  };

  const handleGeneratePPT = async () => {
    if (!generatedContent) return;

    setIsGenerating(true);
    setStatus('generating');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => (prev >= 90 ? prev : prev + Math.random() * 10));
    }, 300);

    try {
      const pptData = {
        content: generatedContent,
        title: fileName,
        filename: fileName,
        userId: user?.id,
        customizations: {
          ...customizations,
          theme: selectedTheme
        }
      };

      const response = await axios.post('http://localhost:5000/api/generate-ppt', pptData, {
        responseType: 'blob',
        timeout: 120000
      });

      setProgress(100);

      const pptPath = response.headers['x-ppt-path'];
      const pptFilename = response.headers['x-ppt-filename'];
      
      if (pptPath) {
        setGeneratedPpt({ path: pptPath, filename: pptFilename });
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });

      saveAs(blob, `${fileName}.pptx`);
      setStatus('success');
    } catch (error) {
      console.error('PPT generation failed:', error);
      setStatus('error');
    } finally {
      setIsGenerating(false);
      clearInterval(progressInterval);
    }
  };

  const handleUseForVideo = () => {
    if (!generatedPpt) return;
    navigate('/video-generator', { 
      state: { 
        passedPpt: {
          path: generatedPpt.path,
          name: generatedPpt.filename
        }
      } 
    });
  };

  return (
    <div className="ppt-root-container">
      {/* Header */}
      <div className="ppt-header">
        <div className="ppt-header-brand">
          <FiFileText style={{ color: 'var(--cyan-primary)' }} />
          <span>Presentation Builder</span>
        </div>
        <button className="ppt-back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft size={16} />
          Go Back
        </button>
      </div>

      {/* Main Grid */}
      <div className="ppt-main-content">
        <div className="ppt-grid-wrapper">
          {/* LEFT — Content Preview */}
          <div className="ppt-left-panel">
            <div className="ppt-preview-header">
              <div className="ppt-header-title">
                <FiBook className="title-icon" />
                <span>Content Preview</span>
              </div>
              <div className="ppt-toggle-group">
                <button 
                  className={`ppt-toggle-btn ${!isEditing ? 'active' : ''}`}
                  onClick={() => setIsEditing(false)}
                >
                  Read
                </button>
                <button 
                  className={`ppt-toggle-btn ${isEditing ? 'active' : ''}`}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="ppt-preview-card">
              <div className="ppt-content-box">
                {isEditing ? (
                  <textarea
                    className="ppt-edit-area"
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    placeholder="Paste or refine your content here..."
                  />
                ) : (
                  <p className="ppt-preview-text">
                    {generatedContent || "No content available. Switch to Edit mode to paste content."}
                  </p>
                )}
              </div>
              
              <div className="ppt-content-info">
                <span className="ppt-info-badge">
                  <FiFileText size={14} />
                  {Math.ceil((generatedContent?.length || 0) / 500)} Estimated Slides
                </span>
                <button onClick={handleClear} className="ppt-mini-clear">
                  <FiTrash2 size={13} /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — Settings */}
          <div className="ppt-right-panel">
            {/* Theme */}
            <div className="ppt-settings-card">
              <h3 className="ppt-card-title">Design Theme</h3>
              <ThemeSelector selectedTheme={selectedTheme} onThemeSelect={handleThemeSelect} />
            </div>

            {/* Customization */}
            <div className="ppt-settings-card">
              <h3 className="ppt-card-title">Customization</h3>
              
              <div className="ppt-form-group">
                <label className="ppt-form-label">Number of Slides</label>
                <div className="ppt-slider-container">
                  <input
                    type="range"
                    min={minSlides}
                    max="20"
                    value={customizations.slide_count}
                    onChange={e => handleCustomizationChange('slide_count', parseInt(e.target.value))}
                    className="ppt-slider"
                  />
                  <span className="ppt-slider-value">{customizations.slide_count} Slides</span>
                </div>
              </div>

              <div className="ppt-form-group">
                <label className="ppt-form-label">Font Size</label>
                <div className="ppt-slider-container">
                  <input
                    type="range"
                    min="14"
                    max="28"
                    value={customizations.font_size}
                    onChange={e => handleCustomizationChange('font_size', parseInt(e.target.value))}
                    className="ppt-slider"
                  />
                  <span className="ppt-slider-value">{customizations.font_size}px</span>
                </div>
              </div>
            </div>

            {/* Filename */}
            <div className="ppt-settings-card">
              <h3 className="ppt-card-title">File Name</h3>
              <div className="ppt-form-group">
                <input
                  type="text"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder="Enter presentation name"
                  className="ppt-text-input"
                />
                <small className="ppt-input-hint">.pptx will be added automatically</small>
              </div>
            </div>

            {/* Progress */}
            {status === 'generating' && (
              <div className="ppt-progress-card">
                <div className="ppt-progress-content">
                  <FiLoader size={22} className="ppt-progress-spinner" />
                  <div className="ppt-progress-text">
                    <p className="ppt-progress-title">Building Presentation...</p>
                    <p className="ppt-progress-subtitle">{Math.round(progress)}% complete</p>
                  </div>
                </div>
                <div className="ppt-progress-bar">
                  <div className="ppt-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Status */}
            {status === 'success' && (
              <div className="ppt-status-card ppt-status-success">
                <FiCheck size={22} className="ppt-status-icon" />
                <div>
                  <p className="ppt-status-title">Presentation Ready</p>
                  <p className="ppt-status-message">Your .pptx file has been downloaded</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="ppt-status-card ppt-status-error">
                <FiX size={22} className="ppt-status-icon" />
                <div>
                  <p className="ppt-status-title">Generation Failed</p>
                  <p className="ppt-status-message">Something went wrong. Please try again.</p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="ppt-actions-wrapper">
              <button
                className="ppt-generate-btn"
                onClick={handleGeneratePPT}
                disabled={isGenerating || !generatedContent}
              >
                <FiDownload size={18} />
                {isGenerating ? 'Generating...' : status === 'success' ? 'Regenerate PPT' : 'Generate Presentation'}
              </button>

              {status === 'success' && generatedPpt && (
                <button className="ppt-use-btn" onClick={handleUseForVideo}>
                  <FiPlay size={18} />
                  Use for Video Generation
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PPTGenerator;
