import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '@clerk/clerk-react';
import { 
  FileVideo, 
  Upload, 
  Settings, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Mic2,
  Cpu,
  Zap,
  RefreshCcw,
  Video,
  XCircle,
  Info,
  FileText,
  Volume2,
  Trash2,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import LearningDashboard from './LearningDashboard';
import '../styles/VideoGenerator.css';

const API_BASE_URL = 'http://127.0.0.1:5000';

const VideoGenerator = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fromGallery = location.state?.fromGallery || false;

  
  // File states
  const [pptFile, setPptFile] = useState(null);
  const [serverPptPath, setServerPptPath] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [facePreview, setFacePreview] = useState(null);
  const [faceInputMode, setFaceInputMode] = useState('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(false);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  // Configuration states
  const [voices, setVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [slangLevel, setSlangLevel] = useState('medium');
  const [quality, setQuality] = useState('medium');
  const [ttsEngine, setTtsEngine] = useState('edge');
  
  // Process states
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Result states
  const [videoUrl, setVideoUrl] = useState(null);
  const [scriptUrl, setScriptUrl] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [summaryUrl, setSummaryUrl] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [activeJobId, setActiveJobId] = useState(localStorage.getItem('eduface_active_job'));
  const [showDashboard, setShowDashboard] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState(null);


  const { user, isSignedIn, isLoaded } = useUser();

    useEffect(() => {
    // 1. Priority: Check for explicit video data passed from Gallery (location.state)
    if (location.state?.videoUrl) {
      setVideoUrl(location.state.videoUrl);
      setScriptUrl(location.state.scriptUrl);
      setAudioUrl(location.state.audioUrl);
      setSummaryUrl(location.state.summaryUrl);
      setJobId(location.state.jobId);
      setFacePreview(location.state.facePreview);
      setGalleryTitle(location.state.title);
    } 
    // 2. Secondary: Check for recently generated session in localStorage
    else if (isSignedIn && user?.id) {
      const savedSession = localStorage.getItem('eduface_video_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          // HARD MATCH: Only load if the session userId matches the current logged-in user
          if (session.userId === user.id) {
            setVideoUrl(session.videoUrl);
            setScriptUrl(session.scriptUrl);
            setAudioUrl(session.audioUrl);
            setSummaryUrl(session.summaryUrl);
            setJobId(session.jobId);
            setFacePreview(session.facePreview);
            
            // Restore PPT file info for the title
            if (session.pptName) {
              setPptFile({ name: session.pptName, size: 0, restored: true });
              if (session.serverPptPath) setServerPptPath(session.serverPptPath);
            }
          } else {
            // Data leakage protection: Wipe old user's session from browser
            localStorage.removeItem('eduface_video_session');
            localStorage.removeItem('eduface_chat_messages');
          }
        } catch (e) {
          localStorage.removeItem('eduface_video_session');
        }
      }
    }
    // 3. Security: If logged out, clear any existing session states for protection
    else if (isLoaded && isSignedIn === false) { 
      setVideoUrl(null);
      localStorage.removeItem('eduface_video_session');
      localStorage.removeItem('eduface_chat_messages');
      localStorage.removeItem('eduface_active_job');
    }

    // Handle PPT file passing from Content Generator
    if (location.state?.passedPpt) {
      const { path, name } = location.state.passedPpt;
      setServerPptPath(path);
      setPptFile({ name, size: 0, isServerFile: true });
    }
    
    // Only fetch voices if we are not signed out
    if (isLoaded && (isSignedIn || !user)) {
       fetchVoices();
    }
  }, [isLoaded, isSignedIn, user?.id, location.state]);

  // Smooth dashboard reveal after completion
  useEffect(() => {
    if (videoUrl) {
      // Small delay so the state is set before we animate in
      const t = setTimeout(() => setShowDashboard(true), 50);
      return () => clearTimeout(t);
    } else {
      setShowDashboard(false);
    }
  }, [videoUrl]);

  // --- PERSISTENT GENERATION TRACKING ---
  useEffect(() => {
    // Priority: use local state if set, else check storage
    const currentActiveJob = activeJobId || localStorage.getItem('eduface_active_job');
    if (!currentActiveJob || videoUrl) return;

    let pollInterval;
    
    const checkStatus = async () => {
      let currentJobId = activeJobId;
      
      // If we are in "generating_sync" mode, try to fetch the real job ID from the server
      if (currentJobId === 'generating_sync' && isSignedIn && user?.id) {
        try {
          const jobRes = await axios.get(`${API_BASE_URL}/api/active-job/${user.id}`);
          if (jobRes.data.jobId) {
            currentJobId = jobRes.data.jobId;
            localStorage.setItem('eduface_active_job', currentJobId);
          }
        } catch (e) { console.error("Could not fetch active job id", e); }
      }

      if (!currentJobId || currentJobId === 'generating_sync') return;

      try {
        const res = await axios.get(`${API_BASE_URL}/api/video-status/${currentJobId}`);
        if (res.data.status === 'completed') {
          clearInterval(pollInterval);
          const data = res.data;
          const baseUrl = API_BASE_URL;
          const sessionToSave = {
            videoUrl: `${baseUrl}${data.video_url}`,
            scriptUrl: `${baseUrl}${data.script_url}`,
            audioUrl: `${baseUrl}${data.audio_url}`,
            summaryUrl: `${baseUrl}${data.summary_url}`,
            jobId: data.job_id,
            facePreview: facePreview,
            userId: user?.id,
            pptName: pptFile ? pptFile.name : 'Generated Video Lesson',
            serverPptPath: serverPptPath
          };
          localStorage.setItem('eduface_video_session', JSON.stringify(sessionToSave));
          localStorage.removeItem('eduface_active_job');
          setActiveJobId(null);
          
          setScriptUrl(sessionToSave.scriptUrl);
          setAudioUrl(sessionToSave.audioUrl);
          setSummaryUrl(sessionToSave.summaryUrl);
          setJobId(sessionToSave.jobId);
          setProgressPercent(100);
          setProgress("100%");
          
          // Hold at 100% briefly so user sees completion, then reveal dashboard
          setTimeout(() => {
            setVideoUrl(sessionToSave.videoUrl);
            setLoading(false);
            // showDashboard animates in via the videoUrl useEffect above
          }, 1200);

          // AUTO-SAVE to Gallery upon background completion
          if (isSignedIn && user?.id) {
            try {
              await axios.post(`${API_BASE_URL}/api/videos`, {
                userId: user.id,
                videoId: data.job_id,
                videoUrl: sessionToSave.videoUrl,
                title: pptFile ? pptFile.name : 'Generated Video Lesson',
                videoData: JSON.stringify(sessionToSave)
              });
              console.log("✅ Video auto-saved to Gallery after background generation");
            } catch (saveErr) {
              console.error("❌ Failed to auto-save to gallery:", saveErr);
            }
          }
        } else if (res.data.status === 'processing') {
          setLoading(true);
          const p = res.data.progress || 0;
          setProgress(`${p}%`);
          setProgressPercent(p);
          setCurrentStep(res.data.step);
        } else if (res.data.status === 'error') {
          clearInterval(pollInterval);
          localStorage.removeItem('eduface_active_job');
          setActiveJobId(null);
          setError(res.data.error || "An unknown error occurred during generation.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Polling error", err);
        if (!err.response) {
          clearInterval(pollInterval);
          localStorage.removeItem('eduface_active_job');
          setActiveJobId(null);
          setError("Server disconnected. Generation stopped.");
          setLoading(false);
        }
      }
    };

    checkStatus();
    pollInterval = setInterval(checkStatus, 3000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeJobId, videoUrl, isSignedIn, user?.id, facePreview, pptFile, serverPptPath]);

  const fetchVoices = async () => {
    setVoicesLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/voices`);
      if (response.data.success && response.data.voices) {
        setVoices(response.data.voices);
        if (response.data.voices.length > 0) {
          setSelectedVoice(response.data.voices[0].id);
        }
      }
    } catch (err) {
      setVoices([
        { id: 'edge_aria',        name: 'Aria (Female, Soft)',       gender: 'Female', engine: 'edge' },
        { id: 'edge_guy',         name: 'Guy (Male, Corporate)',     gender: 'Male',   engine: 'edge' },
        { id: 'edge_roger',       'name': 'Roger (Male, Deep)',      gender: 'Male',   engine: 'edge' },
        { id: 'elevenlabs_josh',   'name': 'Josh (Male, Deep/Bass)',  gender: 'Male',   engine: 'elevenlabs' },
        { id: 'elevenlabs_rachel', name: 'Rachel (Female, Elegant)', gender: 'Female', engine: 'elevenlabs' },
        { id: 'pyttsx3_1',        name: 'Zira (Female, System)',     gender: 'Female', engine: 'pyttsx3' },
        { id: 'pyttsx3_0',        name: 'David (Male, System)',      gender: 'Male',   engine: 'pyttsx3' }
      ]);
      setSelectedVoice('edge_aria');
    } finally {
      setVoicesLoading(false);
    }
  };

  const handlePPTChange = (e) => {
    const file = e.target.files[0];
    if (file) setPptFile(file);
  };

  const handleFaceChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFaceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setFacePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setFaceInputMode('camera');
    setIsCameraActive(true);
    setCapturedImage(false);
    setFacePreview(null);
    setFaceImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Play error:", e));
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Camera access denied or unavailable.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      // Set reasonable defaults if video isn't fully ready
      canvasRef.current.width = videoRef.current.videoWidth || 400;
      canvasRef.current.height = videoRef.current.videoHeight || 400;
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      setFacePreview(dataUrl);
      setCapturedImage(true);
      
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
          setFaceImage(file);
        });
        
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(false);
    setFacePreview(null);
    setFaceImage(null);
    startCamera();
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);



  const resetForm = () => {
    setPptFile(null); setServerPptPath(null); setFaceImage(null); setFacePreview(null);
    setError(null); setSuccess(null);
    setVideoUrl(null);
    setCapturedImage(false);
    setFaceInputMode('upload');
    stopCamera();
    // Clear local session storage on "End Session" so it doesn't reload
    localStorage.removeItem('eduface_video_session');
    localStorage.removeItem('eduface_chat_messages');
    localStorage.removeItem('eduface_active_job');
    setActiveJobId(null);
    
    // If we came from gallery, go back to gallery on exit
    if (location.state?.fromGallery) {
      if (location.state.isSharedView) {
        navigate('/video-gallery', { 
          state: { 
            sharedVideos: location.state.sharedVideos,
            sharedTitle: location.state.sharedTitle,
            ownerEmail: location.state.ownerEmail,
            ownerName: location.state.ownerName
          } 
        });
      } else {
        navigate('/video-gallery');
      }
    }
  };

  const handleCancelJob = () => {
    localStorage.removeItem('eduface_active_job');
    setActiveJobId(null);
    setLoading(false);
    setProgressPercent(0);
    setProgress('');
    setCurrentStep('');
    setError("Job cancelled by user.");
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCurrentStep('uploading');
    setProgress('Uploading assets...');
    setProgressPercent(0);

    try {
      const formData = new FormData();
      if (!serverPptPath) formData.append('ppt', pptFile);
      formData.append('face', faceImage);
      if (isSignedIn && user) {
        formData.append('userId', user.id);
      }

      const uploadRes = await axios.post(`${API_BASE_URL}/api/upload-files`, formData);
      if (!uploadRes.data.success) throw new Error(uploadRes.data.error);

      setCurrentStep('generating');
      setProgress('AI is creating your lesson video...');
      setProgressPercent(2);
      
      // Mark that a generation is active (using a temp flag until we get a real job ID)
      localStorage.setItem('eduface_active_job', 'generating_sync'); 
      setActiveJobId('generating_sync');

      const generateRes = await axios.post(`${API_BASE_URL}/api/generate-video`, {
        ppt_path: serverPptPath || uploadRes.data.ppt_path,
        face_path: uploadRes.data.face_path,
        voice_id: selectedVoice,
        slang_level: slangLevel,
        quality,
        tts_engine: ttsEngine
      });

      const baseUrl = API_BASE_URL;
      const data = generateRes.data;
      if (data.success) {
        // Update with the REAL job id so the poller (useEffect) can take over
        localStorage.setItem('eduface_active_job', data.job_id); 
        setActiveJobId(data.job_id);
      } else {
        throw new Error(data.error || "Failed to start generation");
      }
    } catch (err) {
      localStorage.removeItem('eduface_active_job'); // CLEAR ON ERROR
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    } finally {
      // Don't clear status here, wait for completion poller
    }
  };

  // Steps used for the inline loading stage display
  const PIPELINE_STAGES = [
    { key: 'uploading',  label: 'Uploading Files',      threshold: 0  },
    { key: 'extracting',label: 'Extracting Slides',     threshold: 15 },
    { key: 'animating', label: 'Animating Face (Blink+Eyebrow)', threshold: 28 },
    { key: 'script',    label: 'Generating Script',     threshold: 35 },
    { key: 'audio',     label: 'Synthesizing Voice',    threshold: 50 },
    { key: 'lipsync',   label: 'Neural Lip-Sync',       threshold: 75 },
    { key: 'compositing',label:'HD Compositing',        threshold: 90 },
  ];

  const activeStageIdx = PIPELINE_STAGES.reduce((idx, stage, i) => 
    progressPercent >= stage.threshold ? i : idx, 0
  );

  if (!isLoaded) {
    return (
      <div className="vg-root-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCcw className="ld-spin" size={32} color="var(--cyan-primary)" />
      </div>
    );
  }

  return (
    <div className="vg-root-container">
      {videoUrl && !loading ? (
        <LearningDashboard 
          key={jobId || 'session-reset'}
          videoUrl={videoUrl} 
          scriptUrl={scriptUrl} 
          audioUrl={audioUrl} 
          summaryUrl={summaryUrl}
          jobId={jobId} 
          facePreview={facePreview}
          resetForm={resetForm} 
          user={user}
          isSignedIn={isSignedIn}
          pptName={pptFile ? pptFile.name : (galleryTitle || 'Generated Video Lesson')}
          fromGallery={fromGallery}
        />
      ) : (
        <>
          <header className="vg-header">
            <h1 className="vg-title">Eduface Video Studio</h1>
            <p className="vg-subtitle">Transform your presentation into a professional AI-led video lesson.</p>
          </header>

          {error && (
            <div className="vg-alert vg-alert-danger">
              {error}
              {error.includes('cancelled') && (
                <button 
                  onClick={() => setError(null)} 
                  style={{ marginLeft: 12, background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9em' }}
                >Dismiss</button>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────
               INLINE LOADING SECTION — replaces cards during generation
          ─────────────────────────────────────────────── */}
          {loading ? (
            <div className="vg-loading-section">
              <div className="vg-ls-hero">
                <div className="vg-ls-ring-outer">
                  <svg className="vg-ls-svg" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="68" className="vg-ls-track" />
                    <circle cx="80" cy="80" r="68" className="vg-ls-arc active-spin" />
                  </svg>
                  <div className="vg-ls-center">
                    <div className="vg-pulse-core"></div>
                  </div>
                </div>
                <h2 className="vg-ls-headline">Synthesizing Course Content</h2>
                <div className="vg-ls-stage-indicator">
                   <span className="vg-pulse"></span>
                   {currentStep || "Orchestrating AI Pipeline..."}
                </div>
              </div>

              {/* Middle: thin progress rail */}
              <div className="vg-ls-rail-wrap">
                <div className="vg-ls-rail">
                  <div className="vg-ls-rail-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {/* Stage pills */}
              <div className="vg-ls-stages">
                {PIPELINE_STAGES.map((stage, i) => {
                  const done = progressPercent > stage.threshold;
                  const active = i === activeStageIdx;
                  return (
                    <div key={stage.key} className={`vg-ls-stage ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                      <span className="vg-ls-stage-dot" />
                      <span className="vg-ls-stage-label">{stage.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Stop button */}
              <button onClick={handleCancelJob} className="vg-cancel-job-btn">
                Stop Generation
              </button>
            </div>
          ) : (
            /* ─────────────────────────────────────────────
               NORMAL FORM STATE
            ────────────────────────────────────────────── */
            <>
              <div className="vg-grid">
                <div className="vg-glass-card vg-card">
                  <div className="vg-card-header"><h2>Step 1: Upload Files</h2></div>
                  <div className="vg-card-body">
                    <div className="vg-form-group">
                      <label className="vg-label">PowerPoint Presentation <span className="vg-required">*</span></label>
                      {!serverPptPath ? (
                        <input type="file" className="vg-cyber-input" accept=".ppt,.pptx" onChange={handlePPTChange} />
                      ) : (
                        <div className="vg-server-file-info">
                          <span>{pptFile.name} (Ready)</span>
                          <button onClick={() => { setServerPptPath(null); setPptFile(null); }}>Change</button>
                        </div>
                      )}
                    </div>

                    <div className="vg-form-group">
                      <label className="vg-label">Avatar Face Image <span className="vg-required">*</span></label>
                      <div className="vg-face-input-container">
                        <div className="vg-tabs">
                          <button className={`vg-tab ${faceInputMode === 'upload' ? 'active' : ''}`} onClick={() => { setFaceInputMode('upload'); stopCamera(); }}>
                            <ImageIcon size={18}/> Upload Photo
                          </button>
                          <button className={`vg-tab ${faceInputMode === 'camera' ? 'active' : ''}`} onClick={startCamera}>
                            <Camera size={18}/> Live Camera
                          </button>
                        </div>

                        <div className="vg-face-content">
                          {faceInputMode === 'upload' && (
                            <div className="vg-upload-area">
                              <input type="file" id="face-upload" className="vg-cyber-input vg-hidden-file" accept="image/png, image/jpeg, image/jpg" onChange={handleFaceChange} />
                              {!facePreview ? (
                                <label htmlFor="face-upload" className="vg-upload-label">
                                  <Upload size={32} />
                                  <span>Click to browse</span>
                                  <small>JPG, PNG supported</small>
                                </label>
                              ) : (
                                <div className="vg-preview-area">
                                  <img src={facePreview} alt="Avatar Preview" className="vg-video-preview" />
                                  <div className="vg-camera-actions">
                                    <label htmlFor="face-upload" className="vg-btn-secondary">
                                      <RefreshCcw size={16} /> Choose Another
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {faceInputMode === 'camera' && (
                            <div className="vg-camera-area">
                              <div className="vg-camera-wrapper">
                                <video 
                                  ref={videoRef} 
                                  className="vg-video-preview" 
                                  autoPlay 
                                  playsInline 
                                  muted 
                                  style={{ display: capturedImage ? 'none' : 'block' }} 
                                />
                                {!capturedImage && <div className="vg-face-guide" />}
                                
                                {capturedImage && facePreview && (
                                  <img src={facePreview} alt="Captured" className="vg-video-preview" />
                                )}
                              </div>
                              
                              <canvas ref={canvasRef} style={{ display: 'none' }} />

                              <div className="vg-camera-actions">
                                {!capturedImage ? (
                                  <button onClick={capturePhoto} className="vg-btn-primary" disabled={!isCameraActive}>
                                    <Camera size={18} /> Take Snapshot
                                  </button>
                                ) : (
                                  <>
                                    <button onClick={() => { setFaceInputMode('upload'); stopCamera(); }} className="vg-btn-primary" style={{ background: '#22c55e', color: '#fff' }}>
                                      <CheckCircle2 size={18} /> Use This Photo
                                    </button>
                                    <button onClick={retakePhoto} className="vg-btn-secondary">
                                      <RefreshCcw size={18} /> Retake
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="vg-glass-card vg-card">
                  <div className="vg-card-header"><h2>Step 2: Configuration</h2></div>
                  <div className="vg-card-body">
                    <div className="vg-form-group">
                      <label className="vg-label">AI Voice Persona</label>
                      <select className="vg-cyber-input" value={selectedVoice} onChange={(e) => {
                        const vid = e.target.value;
                        setSelectedVoice(vid);
                        if (vid.startsWith('edge_')) setTtsEngine('edge');
                        else if (vid.startsWith('elevenlabs_')) setTtsEngine('elevenlabs');
                        else if (vid.startsWith('gtts_')) setTtsEngine('gtts');
                        else if (vid.startsWith('pyttsx3_')) setTtsEngine('pyttsx3');
                      }}>
                        {voices.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="vg-form-group">
                      <label className="vg-label">Educational Tone</label>
                      <select className="vg-cyber-input" value={slangLevel} onChange={(e) => setSlangLevel(e.target.value)}>
                        <option value="none">Professional</option>
                        <option value="medium">Conversational</option>
                      </select>
                    </div>

                    <div className="vg-form-group">
                      <label className="vg-label">Video Quality</label>
                      <select className="vg-cyber-input" value={quality} onChange={(e) => setQuality(e.target.value)}>
                        <option value="low">Standard (Fast)</option>
                        <option value="medium">High Definition</option>
                        <option value="high">Elite (Slow)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="vg-button-wrapper" style={{ marginBottom: '4rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={handleGenerate} disabled={loading || !pptFile || !faceImage} className="vg-cyber-button">
                  Generate AI Lesson
                </button>
                {(pptFile || faceImage) && (
                  <button onClick={resetForm} className="vg-reset-btn">Reset</button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default VideoGenerator;
