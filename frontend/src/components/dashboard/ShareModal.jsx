import React from 'react';
import { X, Copy, Check, Twitter, Linkedin, Facebook } from 'lucide-react';
import { useState } from 'react';

const ShareModal = ({ isOpen, onClose, shareUrl }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const socialActions = [
    { icon: <Twitter size={20} />, label: "X", bg: "#000000" },
    { icon: <Linkedin size={20} />, label: "LinkedIn", bg: "#0077b5" },
    { icon: <Facebook size={20} />, label: "Facebook", bg: "#1877f2" },
  ];

  return (
    <div className="ld-modal-overlay" onClick={onClose}>
      <div className="ld-share-modal" onClick={e => e.stopPropagation()}>
        <div className="ld-modal-header">
          <h2>Share link</h2>
          <button className="ld-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="ld-modal-tip">
          <div className="ld-tip-icon">i</div>
          <p>
            <strong>This conversation may include personal information.</strong>
            Take a moment to check the content before sharing the link.
          </p>
        </div>

        <div className="ld-share-box">
          <div className="ld-share-url">{shareUrl}</div>
          <button className="ld-copy-btn" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <div className="ld-social-grid">
           {socialActions.map((social, idx) => (
             <div key={idx} className="ld-social-item">
               <div className="ld-social-icon" style={{ backgroundColor: social.bg }}>
                 {social.icon}
               </div>
               <span>{social.label}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
