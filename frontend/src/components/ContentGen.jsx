// src/components/ContentGen.jsx
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiSend, FiMic, FiLoader, FiArrowLeft, FiBook, FiTrash2, FiFileText, FiLayers, FiMaximize, FiCheckSquare, FiUser } from "react-icons/fi";
import { Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/ContentGen.css";

export default function ContentGen() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("Quick");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [output, setOutput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Welcome to the Content Generator. Please describe the topic you'd like to explore or expand upon." }
  ]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const textareaRef = useRef(null);
  const chatEndRef = useRef(null);
  const debounceTimer = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const modes = [
    { key: "Quick", label: "Quick", icon: <FiFileText size={16} />, desc: "Concise Summary" },
    { key: "Detailed", label: "Detailed", icon: <FiLayers size={16} />, desc: "Structural Outline" },
    { key: "Deep Dive", label: "Deep Dive", icon: <FiMaximize size={16} />, desc: "Comprehensive" },
    { key: "Exam", label: "Exam", icon: <FiCheckSquare size={16} />, desc: "Test Ready" }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('eduface_content_gen');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.output) setOutput(parsed.output);
        if (parsed.messages) setMessages(parsed.messages);
      } catch (e) {}
    }
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    localStorage.setItem('eduface_content_gen', JSON.stringify({ mode, output, messages }));
  }, [mode, output, messages]);

  const generate = async (promptText, promptMode) => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: promptText, 
          mode: promptMode,
          context: output 
        })
      });
      const raw = await res.text();
      if (!raw) throw new Error("Empty response");
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(raw);
      }
      
      const resText = data.output || "[No output]";
      if (resText.includes("[CHAT]") && resText.includes("[DOCUMENT]")) {
        const parts = resText.split("[DOCUMENT]");
        const chatContent = parts[0].replace("[CHAT]", "").trim();
        const docContent = parts[1].trim();
        setMessages(prev => [...prev, { role: "assistant", text: chatContent }]);
        setOutput(docContent);
      } else {
        if (resText.startsWith("[Error]")) {
          setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${resText.replace("[Error]: ", "")}` }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", text: "I have updated the document based on your request." }]);
          setOutput(resText);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `⚠️ Error connecting to service: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const sendText = () => {
    const prompt = text.trim();
    if (!prompt) return;
    setMessages(prev => [...prev, { role: "user", text: prompt }]);
    setIsTyping(true);
    setText("");
    generate(prompt, mode).finally(() => setIsTyping(false));
  };

  const startListening = () => {
    if (isListening) {
      // If already listening, we could stop it here, but typically button toggles state.
      // Let's implement a toggle since that's standard for mic icons.
      window.speechRecognitionInstance?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Store globally so we can stop it on toggle
    window.speechRecognitionInstance = recognition;

    let finalTranscript = text;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (e) => {
      let interimTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + ' ';
        } else {
          interimTranscript += e.results[i][0].transcript;
        }
      }
      setText(finalTranscript + interimTranscript);
    };
    
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    try { recognition.start(); } catch { setIsListening(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  const goHome = () => navigate("/");

  const handleClear = () => {
    localStorage.removeItem('eduface_content_gen');
    setText("");
    setOutput("");
    setMode("Quick");
    setMessages([{ role: "assistant", text: "Session cleared. What would you like to build today?" }]);
  };

  const handleGeneratePPT = () => {
    if (output.trim()) {
      navigate("/ppt-generator", { state: { generatedContent: output } });
    }
  };

  return (
    <div className="cge-container">
      <div className="cge-header">
        <div className="cge-header-brand">
          <FiFileText size={16} style={{ color: 'var(--cyan-primary)' }} />
          <span>Content Generator</span>
        </div>
        <button className="cge-clear-button" onClick={handleClear}>
          <FiTrash2 size={16} />
          Clear Session
        </button>
      </div>

      <div className="cge-main-wrapper">
        <div className="cge-chat-section">
          <div className="cge-chat-header">
            <div className="cge-chat-header-dot" />
            <span className="cge-chat-header-title">AI Assistant</span>
          </div>
          <div className="cge-chat-window">
            <div className="cge-messages-container">
              {messages.map((msg, index) => (
                <div key={index} className={`cge-msg-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                  <div className="cge-msg-avatar">
                    {msg.role === 'assistant' ? <Bot size={16} /> : <FiUser size={16} />}
                  </div>
                  <div className="cge-msg-bubble">
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="cge-msg-row assistant">
                  <div className="cge-msg-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="cge-msg-bubble is-typing">
                    Typing...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="cge-mode-selector-container">
            <div className="cge-mode-selector-track">
              {modes.map((m) => (
                <button
                  key={m.key}
                  className={`cge-mode-node ${mode === m.key ? 'active' : ''}`}
                  onClick={() => setMode(m.key)}
                >
                  <div className="cge-mode-icon-wrapper">{m.icon}</div>
                  <span className="cge-mode-label">{m.label}</span>
                  <span className="cge-mode-desc-mini">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cge-chat-input-area">
            <div className="cge-input-wrapper">
              <textarea
                ref= {textareaRef}
                className="cge-chat-textarea"
                value={text}
                placeholder="Send a message..."
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button 
                className={`cge-chat-icon-btn ${isListening ? 'active' : ''}`} 
                onClick={startListening}
                title="Toggle dictation"
              >
                <FiMic size={18} />
              </button>
              <button
                className="cge-send-btn"
                onClick={sendText}
                disabled={!text.trim() || loading}
              >
                <FiSend size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="cge-output-section">
          <div className="cge-output-header">
            <div className="cge-output-title">
              <FiBook />
              <span>Document Preview</span>
            </div>
            <div className="cge-toggle-group">
              <button 
                className={`cge-toggle-btn ${!isEditing ? 'active' : ''}`}
                onClick={() => setIsEditing(false)}
              >
                Read
              </button>
              <button 
                className={`cge-toggle-btn ${isEditing ? 'active' : ''}`}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            </div>
          </div>

          <div className="cge-output-card">
            <div className="cge-output">
              {loading && (
                <div style={{ position: 'absolute', top: '10px', right: '20px', fontSize: '0.8rem', color: 'var(--cge-accent)' }}>
                   Refreshing content...
                </div>
              )}
              
              {isEditing ? (
                <textarea
                  className="cge-edit-area"
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  placeholder="Edit the generated content here..."
                />
              ) : (
                <div className="markdown-render-area">
                  {output ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                  ) : (
                    <div className="cge-placeholder">
                      <FiLayers size={52} />
                      <p>Your document will appear here.</p>
                      <span style={{ fontSize: '0.85rem' }}>Ask a question on the left to start building content.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="cge-ppt-export-row">
            <button
              className="cge-ppt-export-btn"
              onClick={handleGeneratePPT}
              disabled={!output.trim() || loading}
            >
              <FiFileText size={18} />
              Export to PowerPoint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}