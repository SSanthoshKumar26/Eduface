import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '@clerk/clerk-react';
import { 
  Play, Trash2, Download, Clock, Edit3, X, ExternalLink, AlertTriangle, Check, Share2, Copy, ArrowLeft, LogOut
} from 'lucide-react';
import { toast } from 'react-toastify';
import LearningDashboard from './LearningDashboard';

const API_BASE_URL = 'http://127.0.0.1:5000';

const VideoGallery = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isSignedIn } = useUser();
    const [dbVideos, setDbVideos] = useState([]);
    const [playingVideoId, setPlayingVideoId] = useState(null);
    const [activeJob, setActiveJob] = useState(null);

    // Modal States
    const [modalAction, setModalAction] = useState(null); // 'delete', 'rename', 'share'
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [newNameInput, setNewNameInput] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [isSharedView, setIsSharedView] = useState(false);
    const [sharedTitle, setSharedTitle] = useState('My Videos');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [ownerName, setOwnerName] = useState('');

    const fetchHistory = async () => {
        if (isSignedIn && user?.id) {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/videos/${user.id}`);
                if (res.data.success) {
                    setDbVideos(res.data.videos);
                }
            } catch (err) {
                console.error("Failed to fetch history", err);
            }
        }
    };

    useEffect(() => {
        if (location.state?.sharedVideos) {
            setDbVideos(location.state.sharedVideos);
            setSharedTitle(location.state.sharedTitle || 'Shared Gallery');
            setOwnerEmail(location.state.ownerEmail || '');
            setOwnerName(location.state.ownerName || '');
            setIsSharedView(true);
        } else {
            fetchHistory();
            setSharedTitle('My Videos');
            setOwnerEmail('');
            setOwnerName('');
            setIsSharedView(false);
        }
    }, [isSignedIn, user?.id, location.state]);

    // --- ACTIVE JOB POLLING ---
    useEffect(() => {
        const activeJobId = localStorage.getItem('eduface_active_job');
        if (!activeJobId) {
            setActiveJob(null);
            return;
        }

        const pollActiveJob = async () => {
            try {
                // If it's the sync flag, we check the server for the real ID first
                let currentId = activeJobId;
                if (currentId === 'generating_sync' && user?.id) {
                    const jobRes = await axios.get(`${API_BASE_URL}/api/active-job/${user.id}`);
                    if (jobRes.data.jobId) {
                        currentId = jobRes.data.jobId;
                        localStorage.setItem('eduface_active_job', currentId);
                    }
                }

                if (!currentId || currentId === 'generating_sync') return;

                const res = await axios.get(`${API_BASE_URL}/api/video-status/${currentId}`);
                if (res.data.status === 'completed') {
                    localStorage.removeItem('eduface_active_job');
                    setActiveJob(null);
                    fetchHistory(); // Refresh list to show the new video
                } else if (res.data.status === 'processing') {
                    setActiveJob(res.data);
                } else if (res.data.status === 'error') {
                    localStorage.removeItem('eduface_active_job');
                    setActiveJob(null);
                    toast.error("Background generation failed: " + res.data.error);
                }
            } catch (err) {
                console.error("Gallery polling error", err);
            }
        };

        const interval = setInterval(pollActiveJob, 4000);
        pollActiveJob();
        return () => clearInterval(interval);
    }, [isSignedIn, user?.id]);

    const confirmDelete = async () => {
        if (!selectedVideo) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/videos/${selectedVideo._id}`);
            setDbVideos(prev => prev.filter(v => v._id !== selectedVideo._id));
            if(playingVideoId === selectedVideo._id) setPlayingVideoId(null);
            toast.success("Video deleted successfully");
            setModalAction(null);
        } catch(err) { 
            console.error(err);
            toast.error("Failed to delete video");
        }
    };

    const confirmRename = async () => {
        if (!selectedVideo || !newNameInput.trim()) return;
        if (newNameInput === selectedVideo.title) {
            setModalAction(null);
            return;
        }
        try {
            await axios.put(`${API_BASE_URL}/api/videos/${selectedVideo._id}`, { title: newNameInput });
            setDbVideos(prev => prev.map(v => v._id === selectedVideo._id ? {...v, title: newNameInput} : v));
            toast.success("Video renamed successfully");
            setModalAction(null);
        } catch(err) { 
            console.error(err);
            toast.error("Failed to rename video");
        }
    };

    const handleShare = async (type, videoId = null) => {
        try {
            const payload = {
                type,
                videoId: type === 'single' ? videoId : null,
                userId: type === 'gallery' ? user.id : null,
                creatorEmail: user?.primaryEmailAddress?.emailAddress || '',
                creatorName: user?.fullName || ''
            };
            const res = await axios.post(`${API_BASE_URL}/api/share/create`, payload);
            if (res.data.success) {
                setGeneratedCode(res.data.code);
                setModalAction('share');
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate share code");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Code copied to clipboard!");
    };

    if (!isSignedIn) {
        return (
            <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--text-gray)', fontFamily: 'var(--font-body)' }}>
                <h2 style={{ color: 'var(--text-dark)' }}>Sign In Required</h2>
                <p>Please sign in to view your video library.</p>
            </div>
        );
    }


    return (
        <div style={{ width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg-light)', color: 'var(--text-dark)', fontFamily: 'var(--font-body)', position: 'relative' }}>
            {/* Custom Modals */}
            {modalAction && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' 
                }}>
                    <div style={{ 
                        backgroundColor: 'var(--bg-white)', padding: '32px', borderRadius: '16px', 
                        width: '100%', maxWidth: '450px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-light)', animation: 'modalSlideIn 0.3s ease'
                    }}>
                        {modalAction === 'delete' ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', color: '#ef4444' }}>
                                    <AlertTriangle size={28} />
                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Delete Video</h2>
                                </div>
                                <p style={{ color: 'var(--text-gray)', marginBottom: '32px', lineHeight: '1.6' }}>
                                    Are you sure you want to delete <strong>"{selectedVideo?.title}"</strong>? This action cannot be undone.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setModalAction(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'none', color: 'var(--text-dark)', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={confirmDelete} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Delete Permanently</button>
                                </div>
                            </>
                        ) : modalAction === 'rename' ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', color: 'var(--cyan-primary)' }}>
                                    <Edit3 size={28} />
                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Rename Video</h2>
                                </div>
                                <div style={{ marginBottom: '32px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-gray)', marginBottom: '8px' }}>New Video Name</label>
                                    <input 
                                        type="text" 
                                        value={newNameInput} 
                                        onChange={(e) => setNewNameInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); }}
                                        autoFocus
                                        style={{ 
                                            width: '100%', padding: '12px', borderRadius: '8px', 
                                            border: '2px solid var(--border-light)', backgroundColor: 'var(--bg-light)', 
                                            color: 'var(--text-dark)', fontSize: '16px', outline: 'none'
                                        }} 
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setModalAction(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'none', color: 'var(--text-dark)', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={confirmRename} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'var(--cyan-primary)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', color: 'var(--cyan-primary)' }}>
                                    <Share2 size={28} />
                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Share Code Generated</h2>
                                </div>
                                <p style={{ color: 'var(--text-gray)', marginBottom: '16px', lineHeight: '1.6' }}>
                                    Give this code to others to grant them access to this educational content.
                                </p>
                                <div style={{ 
                                    backgroundColor: 'var(--bg-light)', padding: '20px', borderRadius: '12px', 
                                    border: '2px dashed var(--cyan-primary)', display: 'flex', 
                                    alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px'
                                }}>
                                    <span style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '2px', color: 'var(--text-dark)', fontFamily: 'JetBrains Mono, monospace' }}>{generatedCode}</span>
                                    <button 
                                        onClick={() => copyToClipboard(generatedCode)}
                                        style={{ background: 'var(--cyan-primary)', border: 'none', padding: '10px', borderRadius: '8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        <Copy size={20} />
                                    </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setModalAction(null)} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'var(--cyan-primary)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Done</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div style={{ padding: '100px 24px 20px 24px', maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--text-dark)', fontFamily: 'var(--font-display)' }}>
                            {isSharedView ? 'Shared Gallery' : sharedTitle}
                        </h1>
                        {isSharedView && (ownerName || ownerEmail) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(0, 210, 255, 0.2)',
                                    borderRadius: '12px', padding: '6px 16px 6px 8px'
                                }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #00D2FF, #3A0CA3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '14px', fontWeight: '700', color: '#fff', flexShrink: 0
                                    }}>
                                        {(ownerName || ownerEmail || 'G').charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {ownerName && <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-dark)', lineHeight: 1.2 }}>{ownerName}</span>}
                                        {ownerEmail && <span style={{ fontSize: '12px', color: 'var(--text-gray)', opacity: 0.8, lineHeight: 1.2 }}>{ownerEmail}</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {isSharedView && (
                            <button 
                                onClick={() => {
                                    setIsSharedView(false);
                                    setSharedTitle('My Videos');
                                    setOwnerEmail('');
                                    setOwnerName('');
                                    navigate('/video-gallery', { state: null });
                                    fetchHistory();
                                }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    background: 'rgba(0, 210, 255, 0.05)', 
                                    border: '1px solid rgba(0, 210, 255, 0.3)', 
                                    color: 'var(--cyan-primary)',
                                    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                                    padding: '10px 22px', borderRadius: '100px',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 4px 15px rgba(0, 210, 255, 0.1)'
                                }}
                                onMouseOver={(e) => { 
                                    e.currentTarget.style.background = 'rgba(0, 210, 255, 0.1)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 210, 255, 0.2)';
                                }}
                                onMouseOut={(e) => { 
                                    e.currentTarget.style.background = 'rgba(0, 210, 255, 0.05)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 210, 255, 0.1)';
                                }}
                            >
                                <ArrowLeft size={18} /> 
                                <span>Exit Shared Gallery</span>
                            </button>
                        )}
                    </div>

                    {!isSharedView && dbVideos.length > 0 && (
                        <button
                            onClick={() => handleShare('gallery')}
                            style={{
                                backgroundColor: 'transparent', color: 'var(--cyan-primary)',
                                border: '1px solid var(--cyan-primary)', padding: '10px 20px',
                                borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 210, 255, 0.05)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            <Share2 size={18} /> Share My Gallery
                        </button>
                    )}
                </div>
            </div>

            {/* Video List Section */}
            <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
                {/* ACTIVE JOB PLACEHOLDER */}
                {activeJob && (
                    <div style={{ 
                        margin: '0 24px 24px 24px', padding: '24px', 
                        backgroundColor: 'var(--bg-white)', borderRadius: '12px',
                        border: '2px dashed var(--cyan-primary)', display: 'flex',
                        alignItems: 'center', gap: '20px', animation: 'pulse 2s infinite'
                    }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid var(--border-light)', borderTopColor: 'var(--cyan-primary)', animation: 'spin 1s linear infinite' }}></div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-dark)' }}>
                                Architecting Your Lesson... ({activeJob.progress}%)
                            </h3>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-gray)', fontSize: '14px' }}>
                                Currently at: {activeJob.step}
                            </p>
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-light)', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' }}>
                                <div style={{ width: `${activeJob.progress}%`, height: '100%', backgroundColor: 'var(--cyan-primary)', transition: 'width 0.5s ease' }}></div>
                            </div>
                        </div>
                        <span style={{ fontSize: '14px', color: 'var(--cyan-primary)', fontWeight: '600' }}>Processing</span>
                    </div>
                )}

                {dbVideos.length === 0 && !activeJob ? (
                    <div style={{ padding: '100px 24px', textAlign: 'center', color: 'var(--text-gray)' }}>
                        <p style={{ fontSize: '18px' }}>No videos yet. Generate your first video.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {dbVideos.map((vid, index) => {
                            const sess = JSON.parse(vid.videoData || '{}');
                            const vUrl = sess.videoUrl || vid.videoUrl;
                            const isPlaying = playingVideoId === vid._id;

                            return (
                                <div 
                                    key={vid._id} 
                                    style={{ 
                                        display: 'flex', 
                                        padding: '24px', 
                                        borderBottom: '1px solid var(--border-light)',
                                        alignItems: 'center',
                                        backgroundColor: 'transparent',
                                        transition: 'all 0.2s ease',
                                        cursor: 'default'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--bg-white)';
                                        e.currentTarget.style.paddingLeft = '30px';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.paddingLeft = '24px';
                                    }}
                                >
                                    {/* Thumbnail Area (Left) */}
                                    <div 
                                        onClick={() => setPlayingVideoId(vid._id)}
                                        style={{ 
                                            width: '240px', 
                                            aspectRatio: '16/9', 
                                            backgroundColor: '#000', 
                                            borderRadius: '8px', 
                                            overflow: 'hidden', 
                                            position: 'relative', 
                                            flexShrink: 0,
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        {isPlaying ? (
                                            <video src={vUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-white)', opacity: 0.9 }}>
                                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px var(--cyan-primary)' }}>
                                                    <Play size={24} color="#fff" fill="currentColor" />
                                                </div>
                                            </div>
                                        )}

                                        {isPlaying && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPlayingVideoId(null); }}
                                                style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: '#fff', padding: '4px', cursor: 'pointer' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Content Area (Middle) */}
                                    <div style={{ flex: 1, marginLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <h3 
                                            onClick={() => setPlayingVideoId(vid._id)}
                                            style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--text-dark)', cursor: 'pointer', fontFamily: 'var(--font-heading)' }}
                                        >
                                            {vid.title}
                                        </h3>
                                        <p style={{ fontSize: '14px', color: 'var(--text-gray)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: '800px', lineHeight: '1.5' }}>
                                            {sess.description || "Interactive educational video lesson generated using Eduface AI's premium synthesis engine. Click learn to start the chat tutor."}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-gray)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={14} /> {new Date(vid.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions Area (Right) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                
                                                // Robustly gather all required video session fields
                                                const navigateData = {
                                                    videoUrl: vUrl,
                                                    scriptUrl: sess.scriptUrl || vid.scriptUrl,
                                                    audioUrl: sess.audioUrl || vid.audioUrl,
                                                    summaryUrl: sess.summaryUrl || vid.summaryUrl,
                                                    jobId: sess.jobId || vid.videoId || vid.jobId,
                                                    facePreview: sess.facePreview || vid.facePreview,
                                                    title: vid.title || sess.title || 'Educational Lesson',
                                                    fromGallery: true,
                                                    // Pass shared state for correct "Back to Gallery" navigation
                                                    isSharedView,
                                                    sharedVideos: isSharedView ? dbVideos : null,
                                                    sharedTitle: isSharedView ? sharedTitle : null,
                                                    ownerEmail: isSharedView ? ownerEmail : null,
                                                    ownerName: isSharedView ? ownerName : null
                                                };
                                                
                                                console.log("Entering Lesson with data:", navigateData);
                                                navigate('/video-generator', { state: navigateData });
                                            }}
                                            style={{ 
                                                backgroundColor: 'var(--cyan-primary)', 
                                                color: '#fff', 
                                                border: 'none', 
                                                padding: '10px 24px', 
                                                borderRadius: '8px', 
                                                fontSize: '15px', 
                                                fontWeight: '600', 
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                boxShadow: 'var(--shadow-light)',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--cyan-dark)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--cyan-primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                        >
                                            <ExternalLink size={18} /> Learn
                                        </button>
                                        
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {!isSharedView && (
                                                <>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleShare('single', vid.videoId);
                                                        }}
                                                        style={{ background: 'none', border: 'none', padding: '10px', color: 'var(--text-gray)', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s' }}
                                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--cyan-primary)'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-gray)'; }}
                                                        title="Share Video"
                                                    >
                                                        <Share2 size={20} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedVideo(vid);
                                                            setNewNameInput(vid.title);
                                                            setModalAction('rename');
                                                        }}
                                                        style={{ background: 'none', border: 'none', padding: '10px', color: 'var(--text-gray)', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s' }}
                                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-dark)'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-gray)'; }}
                                                        title="Rename"
                                                    >
                                                        <Edit3 size={20} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        const res = await fetch(vUrl);
                                                        const blob = await res.blob();
                                                        const url = window.URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `${vid.title || 'video'}.mp4`;
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        a.remove();
                                                        window.URL.revokeObjectURL(url);
                                                    } catch {
                                                        window.open(vUrl, '_blank');
                                                    }
                                                }}
                                                style={{ background: 'none', border: 'none', padding: '10px', color: 'var(--text-gray)', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-dark)'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-gray)'; }}
                                                title="Download"
                                            >
                                                <Download size={20} />
                                            </button>
                                            {!isSharedView && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedVideo(vid);
                                                        setModalAction('delete');
                                                    }}
                                                    style={{ background: 'none', border: 'none', padding: '10px', color: 'var(--text-gray)', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-gray)'; }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Modal Animation Styles */}
            <style>
                {`
                @keyframes modalSlideIn {
                    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0% { opacity: 0.85; }
                    50% { opacity: 1; }
                    100% { opacity: 0.85; }
                }
                `}
            </style>
        </div>
    );
};

export default VideoGallery;
