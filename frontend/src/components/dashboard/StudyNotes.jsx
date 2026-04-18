import React from 'react';
import { 
  FileText, CheckCircle2, Lightbulb, Info, ArrowRight, Download, Printer, BookOpen
} from 'lucide-react';
import '../../styles/StudyNotes.css';

const StudyNotes = ({ notes, onDownload }) => {
  if (!notes) return null;

  return (
    <div className="study-notes-container premium-card">
      <div className="study-notes-header">
        <div className="notes-title-group">
          <BookOpen className="notes-icon" size={28} />
          <div>
            <h1 className="notes-main-title">{notes.title}</h1>
            <p className="notes-subtitle">Professional Academic Study Guide</p>
          </div>
        </div>
        <div className="notes-actions">
          <button className="notes-btn-secondary" title="Export as PDF">
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      <div className="notes-overview-box">
        <div className="box-badge">OVERVIEW</div>
        <p className="notes-overview-text">{notes.overview}</p>
      </div>

      <div className="notes-sections-list">
        {notes.sections.map((section, idx) => (
          <div key={idx} className="notes-section-item">
            <h2 className="notes-section-title">
              <span className="section-num">{idx + 1}</span> {section.section_title}
            </h2>
            
            <div className="notes-section-content">
              {section.content}
            </div>

            <div className="notes-section-extras">
              {section.key_points && section.key_points.length > 0 && (
                <div className="notes-feature-block key-points">
                  <h3><CheckCircle2 size={16} /> Key Takeaways</h3>
                  <ul>
                    {section.key_points.map((kp, kidx) => (
                      <li key={kidx}>{kp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {section.examples && section.examples.length > 0 && (
                <div className="notes-feature-block examples">
                  <h3><Lightbulb size={16} /> Practical Examples</h3>
                  <ul>
                    {section.examples.map((ex, eidx) => (
                      <li key={eidx}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}

              {section.diagram && (
                <div className="notes-feature-block diagram">
                  <h3><Info size={16} /> Concept Visualization</h3>
                  <div className="diagram-desc">
                    {section.diagram}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {notes.summary && notes.summary.length > 0 && (
        <div className="notes-summary-footer">
          <h2 className="final-summary-title">Final Summary</h2>
          <div className="summary-pills">
            {notes.summary.map((sum, sidx) => (
              <div key={sidx} className="summary-pill">
                <ArrowRight size={14} /> {sum}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyNotes;
