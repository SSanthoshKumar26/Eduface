import React, { useRef, useEffect, useState } from 'react';
import {
  Send, Sparkles, Trash2, Share2, Mic, AudioLines,
  MessageSquare, Lightbulb, FileText, X,
  Brain, BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ShareModal from './ShareModal';
import '../../styles/TutorPanel.css';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE Text-based Premium Eduface AI Chatbot (Groq powered via parent)
   ───────────────────────────────────────────────────────────────────────────── */
const TutorPanel = ({
  messages, input, setInput,
  onSendMessage, isTyping,
  onClearChat, facePreview, onClose
}) => {
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Auto-scroll inside container only to prevent page jump
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [messages, isTyping]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  // ── Speech recognition ───────────────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = e => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(t);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
    return () => rec.stop();
  }, [setInput]);

  const toggleRecording = () => {
    if (!recognitionRef.current) { alert('Voice recognition not supported.'); return; }
    if (isRecording) { recognitionRef.current.stop(); }
    else { setInput(''); try { recognitionRef.current.start(); setIsRecording(true); } catch (e) { } }
  };

  // ── Send ─────────────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const shareChat = () => {
    const text = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    setShareUrl(text);
    setIsShareModalOpen(true);
  };

  const quickActions = [
    { id: 'explain', label: 'Explain', icon: <MessageSquare size={12} />, prompt: 'Can you explain the main concept of this lesson in simple terms?' },
    { id: 'summarize', label: 'Summarize', icon: <FileText size={12} />, prompt: 'Please provide a concise summary of this lesson.' },
    { id: 'keypoints', label: 'Key Points', icon: <Lightbulb size={12} />, prompt: 'What are the key takeaways from this video?' },
  ];

  return (
    <div className="tp-root">
      {/* HEADER */}
      <header className="tp-header">
        <div className="tp-header-identity">
          <div className="tp-orb">
            <Brain size={20} strokeWidth={1.5} />
            <div className="tp-orb-ring"></div>
          </div>
          <div className="tp-header-text">
            <h2 className="tp-brand">Eduface AI</h2>
            <p className="tp-subtitle">Intelligent Learning Assistant</p>
          </div>
        </div>

        <div className="tp-status-badge">
          <div className="tp-status-dot"></div>
          <span>LIVE</span>
        </div>

        <div className="tp-header-actions">
          <button className="tp-hbtn" title="Share Transcript" onClick={shareChat}>
            <Share2 size={16} />
          </button>
          <button className="tp-hbtn danger" title="Clear History" onClick={onClearChat}>
            <Trash2 size={16} />
          </button>
          <button className="tp-hbtn" title="Close Workspace" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </header>

      {/* MESSAGES */}
      <div className="tp-messages">
        {messages.map((m, i) => (
          <div key={i} className={`tp-bubble-row ${m.role === 'user' ? 'user' : 'assistant'}`}>
            {m.role === 'assistant' && (
              <div className="tp-avatar">
                <Sparkles size={16} />
              </div>
            )}
            <div className="tp-bubble assistant">
              <div className="tp-bubble-header">
                <span className="tp-bubble-name">{m.role === 'assistant' ? 'Eduface AI' : 'You'}</span>
                <span className="tp-chip lesson">Lesson Chat</span>
              </div>
              <div className="tp-bubble-body">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="tp-bubble-row assistant">
            <div className="tp-avatar">
              <Sparkles size={16} className="tp-pulse" />
            </div>
            <div className="tp-thinking">
              <div className="tp-thinking-orbs">
                <span></span><span></span><span></span>
              </div>
              <span className="tp-thinking-label">AI is formulating response...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* FOOTER / COMPOSER */}
      <footer className="tp-footer">
        <div className="tp-pills">
          {quickActions.map(action => (
            <button
              key={action.id}
              className="tp-pill"
              disabled={isTyping}
              onClick={() => onSendMessage(action.prompt)}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>

        <div className="tp-composer-wrapper">
          <div className={`tp-composer ${isRecording ? 'recording' : ''}`}>
            <textarea
              ref={textareaRef}
              className="tp-composer-input"
              placeholder="Ask about this lesson, concepts, or doubts..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            
            <div className="tp-composer-actions">
              <button
                className={`tp-composer-btn mic ${isRecording ? 'active' : ''}`}
                onClick={toggleRecording}
                title="Voice Input"
              >
                {isRecording ? <AudioLines size={18} /> : <Mic size={18} />}
              </button>

              <button
                className="tp-composer-btn send"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                title="Send Message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          shareUrl={shareUrl}
        />
      )}
    </div>
  );
};

export default TutorPanel;
