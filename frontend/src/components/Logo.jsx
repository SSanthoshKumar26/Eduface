import React from "react";
import "../styles/Logo.css";

export default function Logo({ size = "md" }) {
  return (
    <div className={`logo-wrapper logo-${size}`}>
      <svg
        className="logo-svg"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#00E5FF", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#26C6DA", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#00B8D4", stopOpacity: 1 }} />
          </linearGradient>
          <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: "#00E5FF", stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: "#00B8D4", stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        {/* Background Circle with Glow */}
        <circle cx="50" cy="50" r="48" fill="url(#glowGradient)" opacity="0.5" />

        {/* Main Shape - Book/Learning Icon */}
        <g transform="translate(50, 50)">
          {/* Left Page */}
          <path
            d="M -20 -22 L -8 -22 L -8 22 L -20 22 Z"
            fill="url(#logoGradient)"
            opacity="0.8"
            rx="2"
          />

          {/* Right Page */}
          <path
            d="M 8 -22 L 20 -22 L 20 22 L 8 22 Z"
            fill="url(#logoGradient)"
            opacity="1"
            rx="2"
          />

          {/* Spine */}
          <rect x="-2" y="-22" width="4" height="44" fill="url(#logoGradient)" />

          {/* Lines on Left Page */}
          <line x1="-18" y1="-15" x2="-10" y2="-15" stroke="white" strokeWidth="2" opacity="0.6" />
          <line x1="-18" y1="-8" x2="-10" y2="-8" stroke="white" strokeWidth="2" opacity="0.6" />
          <line x1="-18" y1="-1" x2="-10" y2="-1" stroke="white" strokeWidth="2" opacity="0.6" />

          {/* Lines on Right Page */}
          <line x1="10" y1="-15" x2="18" y2="-15" stroke="white" strokeWidth="2" opacity="0.8" />
          <line x1="10" y1="-8" x2="18" y2="-8" stroke="white" strokeWidth="2" opacity="0.8" />
          <line x1="10" y1="-1" x2="18" y2="-1" stroke="white" strokeWidth="2" opacity="0.8" />

          {/* Decorative Circle */}
          <circle cx="0" cy="10" r="4" fill="url(#logoGradient)" opacity="0.9" />
        </g>

        {/* Outer Circle Border */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="url(#logoGradient)"
          strokeWidth="2"
          opacity="0.6"
        />
      </svg>
      <span className="logo-text">EDUFACE AI</span>
    </div>
  );
}
