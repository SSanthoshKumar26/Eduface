// src/pages/About.jsx
import React from 'react';
import '../styles/About.css';

export default function About() {
  return (
    <div className="about-container">
      <h2>About FacePrep</h2>
      <p>
        FacePrep is dedicated to empowering learners and professionals with
        high-quality resources, AI-driven insights, and comprehensive training
        to excel in exams and interviews.
      </p>

      <h3>Our Mission</h3>
      <p>
        To democratize access to interview and exam preparation by combining
        expert content, cutting-edge AI tools, and an intuitive learning
        platform.
      </p>

      <h3>How It Works</h3>
      <p>
        Users enter their queries or topics, choose a response mode, and our AI
        generates tailored guidance. Additional resources include mock questions,
        flashcards, and interactive tutorials.
      </p>

      <h3>Team</h3>
      <p>
        Founded by educators and engineers passionate about accessible learning,
        our team brings expertise in AI, pedagogy, and software development.
      </p>
    </div>
  );
}
