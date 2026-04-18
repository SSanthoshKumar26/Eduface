// src/pages/Home.jsx - Full-Width Properly Structured
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Presentation,
  Video,
  Sparkles,
  Zap,
  Brain,
  Play,
  ArrowRight,
  ChevronDown,
  Rocket,
  Target,
  TrendingUp,
  Users,
  Clock,
  Shield,
  Check,
  Cpu,
} from "lucide-react";
import "./HomeBright.css";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setIsVisible(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGetStarted = () => {
    navigate("/content-gen");
  };

  const features = [
    {
      icon: Cpu,
      title: "AI Narrative Engine",
      desc: "Generate comprehensive lessons from any topic in seconds",
      color: "#00E5FF",
    },
    {
      icon: Presentation,
      title: "Auto PPT Builder",
      desc: "Professional slides designed with perfect layouts",
      color: "#26C6DA",
    },
    {
      icon: Video,
      title: "Face Integration",
      desc: "Your avatar presents content naturally",
      color: "#00B8D4",
    },
    {
      icon: TrendingUp,
      title: "AI Learning Analyst",
      desc: "Deep analysis of your thinking patterns and mistakes",
      color: "#009DB3",
    },
    {
      icon: Brain,
      title: "Concept Mastery",
      desc: "Track understanding across every educational topic",
      color: "#6366f1",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Enter Topic",
      desc: "Just tell us what you want to teach",
      icon: FileText,
      color: "#00E5FF",
    },
    {
      num: "02",
      title: "Generate Content",
      desc: "AI creates comprehensive slides instantly",
      icon: Cpu,
      color: "#26C6DA",
    },
    {
      num: "03",
      title: "Create Video",
      desc: "Your face integrated automatically",
      icon: Video,
      color: "#00B8D4",
    },
    {
      num: "04",
      title: "Deep Analysis",
      desc: "AI Tutor reviews your concept mastery",
      icon: TrendingUp,
      color: "#6366f1",
    },
  ];

  return (
    <div className="home-bright-root">
      {/* Hero Section - FULL WIDTH */}
      <section className="hero-section" ref={heroRef}>
        <div className="hero-wrapper">
          <div className="hero-left">
            <div className="hero-badge">Professional AI Platform</div>

            <h1 className="hero-title">
              Create
              <br />
              <span className="gradient-cyan-primary">Educational</span>
              <br />
              Videos
              <br />
              in <span className="gradient-cyan-secondary">3 Clicks</span>
            </h1>

            <p className="hero-subtitle">
              AI transforms any topic into stunning presentations and personalized
              teaching videos with your face. No editing skills required!
            </p>

            <div className="hero-buttons">
              <button className="btn-primary" onClick={handleGetStarted}>
                <Rocket size={22} />
                Start Creating Free
                <ArrowRight size={22} />
              </button>
            </div>
          </div>

          <div className="hero-right">
            <div className="demo-container">
              <div className="device-mockup">
                <div className="device-header"></div>
                <div className="device-content">
                  <svg viewBox="0 0 280 400" className="demo-svg">
                    <defs>
                      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#00E5FF", stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: "#00B8D4", stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                    <rect width="280" height="400" fill="url(#grad1)" rx="20" />
                    <rect x="20" y="40" width="240" height="200" fill="white" rx="12" opacity="0.2" />
                    <circle cx="140" cy="140" r="40" fill="white" opacity="0.3" />
                    <path d="M 100 130 L 140 160 L 180 130" stroke="white" strokeWidth="2" fill="none" opacity="0.4" />
                  </svg>
                </div>
                <div className="device-footer"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works - FULL WIDTH */}
      <section className="how-works-section">
        <div className="section-container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">3 simple steps to create amazing videos</p>

          <div className="steps-grid">
            {steps.map((step, idx) => (
              <div key={idx} className="step-card" style={{ "--step-color": step.color }}>
                <div className="step-number" style={{ background: `${step.color}20`, color: step.color }}>
                  {step.num}
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                <step.icon size={40} style={{ color: step.color, marginTop: "1rem" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - FULL WIDTH */}
      <section className="features-section" id="features">
        <div className="section-container">
          <h2 className="section-title">Why Educators Choose EduFace</h2>
          <p className="section-subtitle">Everything you need to create professional content instantly</p>

          <div className="features-grid">
            {features.map((feature, idx) => (
              <div key={idx} className="feature-card" style={{ "--feature-color": feature.color }}>
                <div className="feature-icon" style={{ backgroundColor: `${feature.color}15` }}>
                  <feature.icon size={48} style={{ color: feature.color }} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits - FULL WIDTH */}
      <section className="benefits-section">
        <div className="section-container">
          <div className="benefits-grid">
            <div className="benefit-item">
              <Check size={32} className="benefit-icon" />
              <h4>Save 10+ Hours Weekly</h4>
              <p>Automate video creation</p>
            </div>
            <div className="benefit-item">
              <Check size={32} className="benefit-icon" />
              <h4>Professional Quality</h4>
              <p>Studio-grade videos instantly</p>
            </div>
            <div className="benefit-item">
              <Check size={32} className="benefit-icon" />
              <h4>No Technical Skills</h4>
              <p>Anyone can use EduFace</p>
            </div>
            <div className="benefit-item">
              <Check size={32} className="benefit-icon" />
              <h4>Unlimited Videos</h4>
              <p>Create as many as you want</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / CTA - FULL WIDTH */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-card">
            <h2>Ready to save 10+ hours per week?</h2>
            <p>Join 12K+ educators creating amazing content in minutes</p>
            <button className="btn-cta" onClick={handleGetStarted}>
              Create Your First Video
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer - FULL WIDTH */}
      <footer className="footer">
        <div className="section-container">
          <div className="footer-content">
            <div className="footer-brand">
              <Cpu size={28} className="brand-icon" />
              <span>EduFace</span>
            </div>
            <p>&copy; 2026 EduFace AI. Empowering educators worldwide through neural synthesis.</p>
          </div>
        </div>
      </footer>

      {/* Back to Top */}
      <button
        className={`back-to-top ${isVisible ? "visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
    </div>
  );
}
