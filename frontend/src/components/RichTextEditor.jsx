import React, { useState, useEffect, useRef } from "react";
import { FiSend, FiMic, FiPlus, FiLoader } from "react-icons/fi";
import '../styles/RichTextEditor.css';

export default function RichTextEditor({ onSubmit }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("Quick Response");
  const [isTyping, setIsTyping] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const textareaRef = useRef(null);

  const modes = [
    { key: "Quick Response", label: "⚡ Quick Response" },
    { key: "Detailed", label: "📋 Detailed" },
    { key: "Creative", label: "🎨 Creative" }
  ];

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const sendText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsTyping(true);
    onSubmit(trimmed, mode);
    setText("");
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const selectMode = (newMode) => {
    setMode(newMode);
    setDropdownOpen(false);
  };

  return (
    <div className="rich-text-editor">
      <textarea
        ref={textareaRef}
        className="rich-textarea"
        rows={5}
        value={text}
        placeholder="Write your vision..."
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="editor-footer">
        {/* Dropdown */}
        <div style={{ position: "relative" }}>
          <div
            className="dropdown-toggle"
            onClick={toggleDropdown}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleDropdown()}
            role="button"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            {modes.find((m) => m.key === mode)?.label}
          </div>
          {dropdownOpen && (
            <ul className="dropdown-menu" role="listbox" tabIndex="-1">
              {modes.map(({ key, label }) => (
                <li
                  key={key}
                  className="dropdown-item"
                  onClick={() => selectMode(key)}
                  onKeyDown={(e) => e.key === 'Enter' && selectMode(key)}
                  role="option"
                  tabIndex={0}
                  aria-selected={mode === key}
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="buttons-group">
          {isTyping && (
            <div className="loading-text">
              <FiLoader className="spinner-border" />
              AI is thinking...
            </div>
          )}

          <button className="icon-button" title="Add attachment (soon)" disabled>
            <FiPlus size={18} />
          </button>

          <button className="icon-button" title="Voice input (soon)" disabled>
            <FiMic size={18} />
          </button>

          <button
            className="primary-button"
            onClick={sendText}
            disabled={text.trim() === ""}
            aria-disabled={text.trim() === ""}
          >
            <FiSend size={18} />
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
