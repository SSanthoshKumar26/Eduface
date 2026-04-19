import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Download, LogOut, Lightbulb, Sparkles, Maximize, Maximize2, Minimize2, PlusCircle, CheckCircle2, ChevronRight, Clock, MessageSquare, FileText, Share2, PlayCircle, Volume2, VolumeX, X, Play as PlayIcon, BookOpen, RefreshCcw, Layers, Eye, Mic2, Settings
} from 'lucide-react';
import TutorPanel from './dashboard/TutorPanel';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/LearningDashboard.css';

const API_BASE_URL = 'http://127.0.0.1:5000';

const LearningDashboard = ({ 
  videoUrl, 
  scriptUrl, 
  audioUrl, 
  summaryUrl, 
  jobId, 
  facePreview, 
  resetForm, 
  user, 
  isSignedIn, 
  pptName,
  fromGallery = false
}) => {
  const navigate = useNavigate();
  const [lessonContext, setLessonContext] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('eduface_chat_messages');
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: "Hi! I'm Eduface AI. Ask me anything about this video lesson." }
    ];
  });
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [showResumeCard, setShowResumeCard] = useState(false);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const [savingToGallery, setSavingToGallery] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [notesConfig, setNotesConfig] = useState({
    style: 'EXPLANATIVE',
    depth: 'INTERMEDIATE',
    includeExamples: true,
    includeKeyPoints: true,
    format: 'PDF'
  });
  const [savedProgress, setSavedProgress] = useState(null);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  
  const videoRef = useRef(null);
  
  const handleClearChat = () => {
    const defaultMsg = [{ role: 'assistant', content: "Hi! I'm Eduface AI. Ask me anything about this video lesson." }];
    setMessages(defaultMsg);
    localStorage.setItem('eduface_chat_messages', JSON.stringify(defaultMsg));
  };
  
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.playbackRate = playbackRate;
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (scriptUrl) {
      fetch(scriptUrl)
        .then(res => res.ok ? res.text() : null)
        .then(t => t && setLessonContext(t))
        .catch(() => {});
    }
    if (summaryUrl) {
      fetch(summaryUrl)
        .then(res => res.ok ? res.text() : null)
        .then(t => t && setLessonSummary(t))
        .catch(() => {});
    }
  }, [scriptUrl, summaryUrl]);

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (isSignedIn && user?.id && jobId) {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/videos/check/${user.id}/${jobId}`);
          if (res.data.isSaved) {
            setSavedToGallery(true);
          }
        } catch (err) {
          console.error("Check saved status failed:", err);
        }
      }
    };
    checkSavedStatus();
  }, [isSignedIn, user?.id, jobId]);

  const [displayTitle, setDisplayTitle] = useState(pptName || 'Educational Lesson');

  useEffect(() => {
    if (pptName) setDisplayTitle(pptName);
  }, [pptName]);

  const storageKey = `eduface_progress_${displayTitle.replace(/\s+/g, '_').toLowerCase()}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.time > 5) {
        setSavedProgress(parsed);
        setShowResumeCard(true);
      }
    }
  }, [displayTitle]);

  useEffect(() => {
    let interval;
    if (isPlaying && videoRef.current) {
      interval = setInterval(() => {
        const prog = {
          time: videoRef.current.currentTime,
          percent: (videoRef.current.currentTime / duration) * 100,
          lastUpdated: new Date().toISOString(),
          title: displayTitle
        };
        localStorage.setItem(storageKey, JSON.stringify(prog));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration, displayTitle]);

  const handleResume = () => {
    if (videoRef.current && savedProgress) {
      videoRef.current.currentTime = savedProgress.time;
      setShowResumeCard(false);
      videoRef.current.play();
      setIsPlaying(true);
      toast.success(`Resumed from ${formatTime(savedProgress.time)}`, {
        position: "bottom-center",
        autoClose: 2000,
        hideProgressBar: true,
        theme: "dark"
      });
    }
  };

  const handleStartFresh = () => {
    setShowResumeCard(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (duration > 0) {
      const numChapters = duration > 80 ? 4 : 3;
      const interval = duration / numChapters;
      const titles = ["General Introduction", "Core Concepts", "Detailed Breakdown", "Conclusion"];
      const generatedChapters = [];
      for (let i = 0; i < numChapters; i++) {
        generatedChapters.push({ 
          time: Number((i * interval).toFixed(1)), 
          label: titles[i] || `Section ${i+1}`,
          percent: (i * interval / duration) * 100
        });
      }
      setChapters(generatedChapters);
    }
  }, [duration]);

  // Subtitles fetch removed to prevent 404 empty resource errors
  useEffect(() => {
    if (showSubtitles && subtitles.length > 0) {
      const active = subtitles.find(s => currentTime >= s.start && currentTime < (s.start + s.duration));
      setCurrentSubtitle(active ? active.text : "");
    } else {
      setCurrentSubtitle("");
    }
  }, [currentTime, showSubtitles, subtitles]);

  const handleSeek = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleExportNotes = async () => {
    if (!lessonContext) return;
    setGeneratingNotes(true);
    try {
      const response = await axios({
        url: `${API_BASE_URL}/api/export-notes`,
        method: 'POST',
        responseType: 'blob',
        data: {
          lesson_content: lessonContext,
          ...notesConfig
        }
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      let extension = 'pdf';
      const contentType = response.headers['content-type'] || '';
      
      if (contentType.includes('wordprocessingml')) extension = 'docx';
      else if (contentType.includes('msword')) extension = 'doc';
      else if (contentType.includes('text/plain')) extension = 'txt';
      else if (contentType.includes('pdf')) extension = 'pdf';
      else if (notesConfig.format === 'WORD') extension = 'docx';
      
      link.setAttribute('download', `Study_Notes_${displayTitle.replace(/\s+/g, '_')}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`${extension.toUpperCase()} Guide Exported Successfully!`);
      setShowNotesModal(false);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export study notes.");
    } finally {
      setGeneratingNotes(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!isSignedIn || !user?.id || !jobId) {
      toast.error('You must be signed in to save videos.');
      return;
    }
    setSavingToGallery(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/videos`, {
        userId: user.id,
        videoId: jobId,
        videoUrl: videoUrl,
        title: pptName || displayTitle || 'Educational Lesson',
        videoData: JSON.stringify({
          videoUrl, scriptUrl, audioUrl, summaryUrl, jobId,
          facePreview, title: pptName || displayTitle
        })
      });
      if (res.data.success) {
        setSavedToGallery(true);
        toast.success('✅ Saved to Gallery!', { position: 'bottom-center', autoClose: 3000, theme: 'dark' });
      } else {
        toast.error(res.data.message || 'Save failed.');
        setSavedToGallery(true); 
      }
    } catch (err) {
      toast.error('Failed to save to gallery.');
    } finally {
      setSavingToGallery(false);
    }
  };

  const handleSendMessage = async (text = null) => {
    const userInput = text || chatInput;
    if (!userInput.trim()) return;

    const ts = Date.now();
    const userMessage = { role: 'user', content: userInput, _ts: ts };
    const initialMessages = [...messages, userMessage];
    
    setMessages(initialMessages);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: `You are Eduface AI, an elite educational tutor created strictly by Eduface. You MUST NEVER say you are a generic AI, nor mention OpenAI, Llama, Meta, Groq, or any other creator. Your name is exclusively "Eduface AI".
              Context about this lesson: ${lessonContext}. 
              IMPORTANT RULES:
              1. Adapt to the user's tone and length. 
              2. If the user asks a complex question about the lesson, provide a clear, professional, and deep explanation.
              3. If the user is just saying hello, making small talk (e.g., "nice to meet you"), or making a brief comment, BE VERY CONCISE. Do NOT write paragraphs, do NOT over-explain, and do NOT force the conversation back to the lesson abruptly. Keep casual responses short, natural, and friendly.` 
            },
            ...initialMessages.map(m => ({ role: m.role, content: m.content }))
          ]
        })
      });

      if (!response.ok) throw new Error("Backend chat API failed");

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.answer,
        _ts: Date.now()
      }]);
    } catch (e) {
      console.error("Chat error:", e);
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I encountered an error connecting to the AI. Please try again later.",
        _ts: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const activeChapter = chapters.find((chap, idx) => {
    return currentTime >= chap.time && (idx === chapters.length - 1 || currentTime < chapters[idx+1].time);
  });

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      videoRef.current.muted = nextMute;
    }
  };

  const handleProgressClick = (e) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  const handleProgressMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pos = x / rect.width;
    setHoverTime(pos * duration);
    setHoverX(x);
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  return (
    <div className="ld-dashboard-root">
      {/* Immersive Viewport Wrapper */}
      <main className={`ld-immersive-viewport ${isChatOpen ? 'chat-active' : ''}`}>
        
        {/* VIEWPORT CONTENT: Shifter unit */}
        <div className="ld-viewport-shifter">
          <div className="ld-video-header-area">
            <div className="ld-video-badge">
               <PlayCircle size={14} />
               <span>{displayTitle}</span>
            </div>
            
            <button 
              onClick={resetForm} 
              className="ld-btn premium-end top-end-btn"
            >
              <LogOut size={16} /> End Session
            </button>
          </div>

          <section className="ld-content-area">
            
            {/* Video Unit */}
            {isMinimized ? (
              <div className="ld-minimized-placeholder-card" onClick={() => setIsMinimized(false)}>
                <div className="ld-minimized-info">
                   <div className="ld-minimized-icon-box">
                      <PlayCircle size={20} />
                   </div>
                   <div className="ld-minimized-text">
                      <h4>{displayTitle}</h4>
                      <p>Video is collapsed. Click to expand and continue watching.</p>
                   </div>
                </div>
                <Maximize2 size={18} className="ld-restore-chevron" />
              </div>
            ) : (
                <div className="ld-video-container" onMouseEnter={() => setIsHoveringVideo(true)} onMouseLeave={() => setIsHoveringVideo(false)}>
                  {(!videoUrl || loading) ? (
                    <div className="ld-video-placeholder">
                      <div className="ld-loading-spinner" />
                      <p>Initializing Cinema Stream...</p>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        className="ld-main-video"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                        onClick={togglePlay}
                      />

                      {/* Subtitle Overlay */}
                      {showSubtitles && currentSubtitle && (
                        <div className="ld-subtitle-overlay">
                          <div className="ld-subtitle-text">
                            {currentSubtitle}
                          </div>
                        </div>
                      )}
                      
                      {/* Collapse Button */}
                      <button 
                        className="ld-pip-toggle-btn" 
                        onClick={() => setIsMinimized(true)}
                        title="Collapse Video"
                      >
                        <Minimize2 size={18} />
                      </button>
                  
                      {/* Resume Overlay */}
                      {showResumeCard && (
                        <div className="ld-resume-overlay">
                          <div className="ld-resume-card">
                            <div className="ld-resume-info">
                              <Clock size={20} className="resume-icon" />
                              <div>
                                <h4>Ready to Resume?</h4>
                                <p className="resume-sub-text">{activeChapter?.label || 'Introduction'} • {Math.round(savedProgress?.percent || 0)}%</p>
                              </div>
                            </div>
                            <div className="ld-resume-actions">
                              <button className="resume-btn primary" onClick={handleResume}>
                                <Play size={16} fill="white" /> Resume Lesson
                              </button>
                              <button className="resume-btn secondary" onClick={handleStartFresh}>
                                Start Over
                              </button>
                              {fromGallery && (
                                <button className="resume-btn minimal" onClick={resetForm}>
                                  <ChevronRight size={14} /> Back to Library
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className={`ld-custom-controls ${!isPlaying || isHoveringVideo ? 'visible' : ''}`}>
                         <div className="ld-controls-main">
                            <div className="ld-controls-left">
                              <button className="ld-control-btn" onClick={togglePlay}>
                                {isPlaying ? <Pause size={20} fill="currentColor" strokeWidth={3} /> : <PlayIcon size={20} fill="currentColor" strokeWidth={3} />}
                              </button>
                              <div className="ld-time-pill">
                                {formatTime(currentTime)} <span className="ld-time-sep">/</span> {formatTime(duration)}
                              </div>
                            </div>

                            <div className="ld-controls-right">
                               <div className="ld-vol-group">
                                 <button className="ld-control-btn" onClick={toggleMute}>
                                   {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                 </button>
                                 <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="ld-v-slider" />
                               </div>
                               
                               <div className="ld-player-settings-box">
                                 <button className="ld-control-btn" onClick={() => setShowSpeedMenu(!showSpeedMenu)} title="Playback Settings">
                                   <Settings size={18} />
                                 </button>

                                 {showSpeedMenu && (
                                    <div className="ld-premium-speed-popover">
                                      <div className="ld-popover-header">Speed</div>
                                      {[1.0, 1.25, 1.5, 2.0].map(val => (
                                        <button 
                                          key={val}
                                          className={`ld-popover-item ${playbackRate === val ? 'active' : ''}`}
                                          onClick={() => handleSpeedChange(val)}
                                        >
                                          <span>{val === 1.0 ? 'Normal' : `${val}x`}</span>
                                          {playbackRate === val && <CheckCircle2 size={14} className="check-icon" />}
                                        </button>
                                      ))}
                                    </div>
                                 )}
                               </div>

                               <button className="ld-control-btn" onClick={() => videoRef.current.requestFullscreen()} title="Full Screen">
                                 <Maximize size={18} />
                               </button>
                            </div>
                         </div>

                         <div 
                           className="ld-modern-progress-wrap" 
                           onClick={handleProgressClick}
                           onMouseMove={handleProgressMouseMove}
                           onMouseLeave={handleProgressMouseLeave}
                         >
                            <div className="ld-modern-rail">
                              <div className="ld-modern-fill" style={{ width: `${(currentTime/duration)*100}%` }}>
                                <div className="ld-modern-knob" />
                              </div>
                               {chapters.map((chap, i) => (
                                <div 
                                  key={i} 
                                  className={`ld-modern-marker ${currentTime >= chap.time ? 'on' : ''}`}
                                  style={{ left: `${chap.percent}%` }}
                                />
                              ))}
                            </div>
                            {hoverTime !== null && (
                              <div className="ld-modern-tooltip" style={{ left: `${hoverX}px` }}>
                                {formatTime(hoverTime)}
                              </div>
                            )}
                         </div>
                      </div>
                    </>
                  )}
                </div>
            )}

            <div className="ld-chapters-wrapper">
              {chapters.length > 0 && (
                <div className="ld-chapters-card modern-card">
                  <h3><Clock size={16} className="card-icon"/> Video Chapters</h3>
                  <div className="ld-chapters-scroll-track">
                    <div className="ld-chapters-grid">
                      {chapters.map((chap, idx) => {
                        const isActive = activeChapter && activeChapter.time === chap.time;
                        return (
                          <div key={idx} className={`ld-chapter-box ${isActive ? 'active' : ''}`} onClick={() => handleSeek(chap.time)}>
                            <div className="ld-chapter-marker">{formatTime(chap.time)}</div>
                            <div className="ld-chapter-label">{chap.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="ld-below-video-content">
               <div className="ld-resource-grid-header">
                  <h3>Learning Insights & Resources</h3>
                  <p>Explore generated assets and AI-powered study upgrades.</p>
               </div>

               <div className="ld-resource-mosaic">
                 <div className="ld-mosaic-item" onClick={() => handleDownload(videoUrl, `eduface_lesson.mp4`)}>
                    <div className="mosaic-icon bg-blue"><Download size={20} /></div>
                    <div className="mosaic-text">
                       <h4>Offline Lesson</h4>
                       <p>High-quality MP4 including AI narrator and slides.</p>
                    </div>
                 </div>

                 <div className="ld-mosaic-item" onClick={() => setShowNotesModal(true)}>
                    <div className="mosaic-icon bg-purple"><BookOpen size={20} /></div>
                    <div className="mosaic-text">
                       <h4>Academic Guide</h4>
                       <p>Synthesize detailed notes from the lecture script.</p>
                    </div>
                 </div>

                 <div className="ld-mosaic-item" onClick={() => navigate('/quiz/setup', { state: { lessonContent: lessonContext } })}>
                    <div className="mosaic-icon bg-cyan"><Sparkles size={20} /></div>
                    <div className="mosaic-text">
                       <h4>Skill Validation</h4>
                       <p>Take an AI-generated quiz to test your retention.</p>
                    </div>
                 </div>

                 <div className="ld-mosaic-item" onClick={() => navigate(`/thinking-mode/${jobId || 'new'}`)}>
                    <div className="mosaic-icon bg-indigo"><Layers size={20} /></div>
                    <div className="mosaic-text">
                       <h4>Thinking Coach</h4>
                       <p>Interactive dialog with your AI tutor about concepts.</p>
                    </div>
                 </div>
               </div>

               <div className="ld-action-bar-single" style={{ marginTop: '12px' }}>
                   <button onClick={() => handleDownload(audioUrl, `audio.wav`)} className="ld-btn-minimal">
                     <Mic2 size={16} /> Download Master Audio
                   </button>
                   {!fromGallery && (
                     <button 
                       onClick={savedToGallery ? () => navigate('/video-gallery') : handleSaveToGallery} 
                       disabled={savingToGallery}
                       className="ld-btn-minimal"
                     >
                       {savedToGallery ? <><CheckCircle2 size={16} /> Saved to Library</> : <><PlusCircle size={16} /> Save to My Gallery</>}
                     </button>
                   )}
                </div>

               <div className="ld-overview-card">
                  <h3><Lightbulb size={20} className="card-icon"/> Executive Summary</h3>
                  <div className="ld-overview-text">
                     {lessonSummary || "The AI is summarizing the core takeaways of this lesson..."}
                  </div>
               </div>
            </div>
          </section>
        </div>

        {/* CHAT OVERLAY PANEL */}
        <section className={`ld-chat-overlay-panel ${isChatOpen ? 'open' : ''}`}>
          <div className="ld-chat-container immersive-chat">
            <TutorPanel 
              messages={messages} input={chatInput} setInput={setChatInput}
              onSendMessage={handleSendMessage} isTyping={isTyping} 
              formatText={(t) => t} onClearChat={handleClearChat}
              facePreview={facePreview}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        </section>
      </main>

      {!isChatOpen && (
        <button className="ld-chat-toggle-fab" onClick={() => setIsChatOpen(true)}>
          <Sparkles size={20} />
          <span>Ask Eduface AI</span>
        </button>
      )}

      {showNotesModal && (
        <div className="ld-modal-overlay">
          <div className="ld-study-modal-premium">
            <div className="modal-sidebar">
              <div className="sidebar-icon"><BookOpen size={48} strokeWidth={1} /></div>
              <div className="sidebar-text">
                <h3>Elite Guide</h3>
                <p>Tailor your academic material for professional retention.</p>
              </div>
              <div className="sidebar-footer"><span className="premium-badge">PRO GRADE</span></div>
            </div>

            <div className="modal-main">
              <div className="main-header">
                <h4>Configuration</h4>
                <button className="close-x" onClick={() => setShowNotesModal(false)}><X size={18} /></button>
              </div>

              <div className="main-body">
                <div className="config-grid-dual">
                  <div className="config-item">
                    <label><Layers size={13} /> Style</label>
                    <select value={notesConfig.style} onChange={e => setNotesConfig({ ...notesConfig, style: e.target.value })}>
                      <option value="EXPLANATIVE">Detailed Paragraphs</option>
                      <option value="BULLET">Structured Bullets</option>
                      <option value="HINTS">Memory Hints</option>
                    </select>
                  </div>
                  <div className="config-item">
                    <label><Eye size={13} /> Depth</label>
                    <select value={notesConfig.depth} onChange={e => setNotesConfig({ ...notesConfig, depth: e.target.value })}>
                      <option value="BASIC">Foundational</option>
                      <option value="INTERMEDIATE">Comprehensive</option>
                      <option value="ADVANCED">Mastery</option>
                    </select>
                  </div>
                </div>

                <div className="config-section">
                  <label><CheckCircle2 size={13} /> Academic Inclusions</label>
                  <div className="checkbox-row">
                    <label className="checkbox-card-compact">
                      <input type="checkbox" checked={notesConfig.includeExamples} onChange={e => setNotesConfig({ ...notesConfig, includeExamples: e.target.checked })} />
                      <span>Practical Examples</span>
                    </label>
                    <label className="checkbox-card-compact">
                      <input type="checkbox" checked={notesConfig.includeKeyPoints} onChange={e => setNotesConfig({ ...notesConfig, includeKeyPoints: e.target.checked })} />
                      <span>Key Points Summary</span>
                    </label>
                  </div>
                </div>

                <div className="config-section">
                  <label><FileText size={13} /> Distribution Format</label>
                  <div className="format-pills-premium">
                    <button className={`format-pill ${notesConfig.format === 'PDF' ? 'active' : ''}`} onClick={() => setNotesConfig({ ...notesConfig, format: 'PDF' })}>PDF Document</button>
                    <button className={`format-pill ${notesConfig.format === 'WORD' ? 'active' : ''}`} onClick={() => setNotesConfig({ ...notesConfig, format: 'WORD' })}>Word Document</button>
                  </div>
                </div>
              </div>

              <div className="main-footer">
                <button className="cancel-minimal" onClick={() => setShowNotesModal(false)}>Cancel</button>
                <button className="export-action-btn" onClick={handleExportNotes} disabled={generatingNotes}>
                  {generatingNotes ? <><RefreshCcw className="ld-spin" size={14} /> Generating...</> : "Generate & Export"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningDashboard;
