import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Sparkles, Trash2, Share2, Mic, MicOff, AudioLines, MessageSquare, Lightbulb, FileText, HelpCircle, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ShareModal from './ShareModal';

const TutorPanel = ({ messages, input, setInput, onSendMessage, isTyping, formatText, onClearChat, facePreview, onClose }) => {
  const chatEndRef = useRef(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setInput]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInput(''); // Clear input for new voice prompt
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const quickActions = [
    { id: 'explain', label: "Explain Concept", icon: <MessageSquare size={13} />, prompt: "Can you explain the main concept of this lesson in simple terms?" },
    { id: 'summarize', label: "Summarize", icon: <FileText size={13} />, prompt: "Please provide a concise summary of this lesson." },
    { id: 'points', label: "Key Points", icon: <Lightbulb size={13} />, prompt: "What are the key takeaways from this video?" }
  ];

  const handleShareChat = async () => {
    try {
      // In production, use the actual backend URL instead of hardcoded localhost
      const resp = await fetch('http://127.0.0.1:5000/api/share-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, visibility: 'public' })
      });
      const data = await resp.json();
      if (data.success) {
        setShareUrl(data.share_url);
        setIsShareModalOpen(true);
      } else {
        alert("Failed to share chat.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error sharing the chat.");
    }
  };

  return (
    <div className="ld-tutor-panel">
      <div className="ld-tutor-header">
        <div className="ld-tutor-title-group">
          <div className="ld-pro-badge">
            <Sparkles size={14} />
          </div>
          <h3 className="ld-brand-title">EDUFACE AI</h3>
          <div className="ld-session-indicator">
            <div className="ld-status-dot"></div>
            <span>LIVE SESSION</span>
          </div>
        </div>
        <div className="ld-tutor-header-actions">
          <button className="ld-header-btn" title="Share Chat securely" onClick={handleShareChat}>
            <Share2 size={16} />
          </button>
          <button className="ld-header-btn" title="Clear Chat messages" onClick={onClearChat}>
            <Trash2 size={16} />
          </button>
          <div className="ld-header-divider"></div>
          <button className="ld-chat-close-btn-header" onClick={onClose} title="Exit AI Session">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="ld-tutor-messages">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`ld-chat-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            {msg.role === 'assistant' && (
              <div className="ld-chat-identity">
                <div className="ld-ai-core-avatar">
                  <div className="ld-ai-core-pulse"></div>
                  <Sparkles size={12} />
                </div>
                <span className="ld-chat-role">EDUFACE AI</span>
                <span className="ld-chat-verified-badge">EXPERT TUTOR</span>
              </div>
            )}
            <div className="ld-chat-bubble">
              <div className="ld-chat-text">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="ld-chat-wrapper assistant">
            <div className="ld-chat-identity">
              <div className="ld-ai-core-avatar">
                <div className="ld-ai-core-pulse"></div>
                <Sparkles size={12} />
              </div>
              <span className="ld-chat-role">EDUFACE AI</span>
              <span className="ld-chat-verified-badge">EXPERT TUTOR</span>
            </div>
            <div className="ld-typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        shareUrl={shareUrl} 
      />

      <div className="ld-tutor-footer">
        <div className="ld-tutor-toolbar">
          {quickActions.map((action) => (
            <button 
              key={action.id}
              onClick={() => onSendMessage(action.prompt)}
              disabled={isTyping}
              className="ld-toolbar-btn"
              title={action.label}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        <div className={`ld-tutor-input-area ${isRecording ? 'recording' : ''}`}>
          <textarea 
            placeholder={isRecording ? "Listening..." : "Ask about this lesson, concepts, or doubts..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping || isRecording}
            className="ld-chat-input"
            rows={1}
          />
          
          <div className="ld-input-actions">
            <button 
              onClick={toggleRecording}
              className={`ld-voice-btn ${isRecording ? 'active' : ''}`}
              title={isRecording ? "Stop Recording" : "Start Voice Input"}
            >
              {isRecording ? <AudioLines size={20} className="pulse-animation" /> : <Mic size={20} />}
            </button>
            <button 
              onClick={() => onSendMessage()}
              disabled={isTyping || !input.trim() && !isRecording}
              className="ld-chat-send"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorPanel;
