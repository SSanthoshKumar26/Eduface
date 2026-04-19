import React, { useState, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Plus, Trash2, Calendar, BookOpen, Clock, Brain, Target, RefreshCcw, Sparkles, CheckCircle, SearchCode, Settings, CalendarCheck2, Mic, Send, Loader2, Edit3, Save } from 'lucide-react';
import '../styles/StudyPlanner.css';

const API_BASE_URL = 'http://127.0.0.1:5000';

const StudyPlanner = () => {
  const [formData, setFormData] = useState({
    examDate: '',
    startDate: new Date().toISOString().split('T')[0],
    hoursPerDay: 4,
    preferredTime: 'Morning',
    breakPreference: '10 min every 1 hr',
    maxFocusTime: '45',
    weakSubjects: '',
    strongSubjects: '',
    stressLevel: 'Medium',
    targetScore: '90',
    prioritySubjects: '',
  });

  const [subjects, setSubjects] = useState([
    { id: 1, subjectName: '', topics: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const planRef = useRef(null);
  const recognizerRef = useRef(null);

  const [coverImage, setCoverImage] = useState(null);
  const UNSPLASH_ACCESS_KEY = 'O_xdXTgZQ44ghl0hozwZPrQKkHntgunG0PXeG45ws3M';

  // AI Assistant & Plan States
  const [aiInput, setAiInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [customColumns, setCustomColumns] = useState([]); // List of custom field names

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubjectChange = (id, field, value) => {
    setSubjects(subjects.map(sub => sub.id === id ? { ...sub, [field]: value } : sub));
  };

  const addSubject = () => {
    setSubjects([...subjects, { id: Date.now(), subjectName: '', topics: '' }]);
  };

  const removeSubject = (id) => {
    setSubjects(subjects.filter(sub => sub.id !== id));
  };

  // --- Voice & AI Form Filler Logic ---
  const handleAiFill = async (text) => {
    if (!text.trim()) return;
    setAiLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai-form-assistant`, {
        text: text,
        currentState: { ...formData, subjects }
      });
      
      const updates = response.data;
      
      // Merge Top Level fields
      const newFormData = { ...formData };
      const topLevelKeys = Object.keys(formData);
      for (const key of Object.keys(updates)) {
        if (topLevelKeys.includes(key)) {
          newFormData[key] = updates[key];
        }
      }
      setFormData(newFormData);

      // Merge Subjects if provided
      if (updates.subjects && Array.isArray(updates.subjects)) {
        const mergedSubjects = updates.subjects.map((s, idx) => {
          return {
            id: Date.now() + idx,
            subjectName: s.subjectName || s.name || '',
            totalChapters: s.totalChapters || 10,
            difficulty: s.difficulty || 'Medium',
            completionLevel: s.completionLevel || s.completion || 0
          };
        });
        if (mergedSubjects.length > 0) {
           setSubjects(mergedSubjects);
        }
      }

      setAiInput('');
    } catch (err) {
      console.error("AI form fill failed:", err);
      alert("AI Assistant failed to parse input. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleListen = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Your browser does not support Voice Input. Please use Chrome or Edge.");
        return;
      }
      
      if (isListening) {
        if (recognizerRef.current) {
          recognizerRef.current.stop();
        }
        setIsListening(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognizerRef.current = recognition;
      recognition.continuous = false; // Changed to false for better one-shot recognition
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        console.log("Voice recognition started...");
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setAiInput(prev => {
            const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + space + transcript;
          });
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e.error);
        setIsListening(false);
        if (e.error === 'not-allowed') {
          alert("Microphone access denied. Please allow microphone permissions in your browser settings.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log("Voice recognition ended.");
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to initialize speech recognition:", err);
      setIsListening(false);
    }
  };

  const generatePlan = async () => {
    if (!formData.examDate) {
      alert("Please select an Exam Date.");
      return;
    }
    
    setLoading(true);
    try {
      // Fetch Cover Image
      try {
        const unsplashRes = await axios.get(`https://api.unsplash.com/photos/random?query=study,library,books,minimal&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`);
        setCoverImage(unsplashRes.data.urls.regular);
      } catch (e) {
        setCoverImage('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&h=400&fit=crop');
      }

      const response = await axios.post(`${API_BASE_URL}/api/generate-study-plan`, {
        ...formData,
        subjects
      });
      
      let finalPlan = response.data.plan;
      
      if (typeof finalPlan === 'string') {
        try {
          const cleaned = finalPlan.replace(/```json/i, '').replace(/```/g, '').trim();
          finalPlan = JSON.parse(cleaned);
        } catch (parseErr) {
          console.error("Format mismatch:", finalPlan);
          alert("The data format is incorrect. PLEASE RESTART YOUR BACKEND SERVER (python app.py) to load the new tabular format features, then try again.");
          setLoading(false);
          return;
        }
      }

      setPlanResult(finalPlan);
      
    } catch (err) {
      console.error(err);
      alert("Failed to generate plan. Ensure backend is running and you have API keys set.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanEdit = (field, value) => {
    setPlanResult(prev => ({ ...prev, [field]: value }));
  };

  const handleDailyPlanEdit = (index, field, value) => {
    const updatedDaily = [...planResult.dailyPlan];
    updatedDaily[index][field] = value;
    setPlanResult(prev => ({ ...prev, dailyPlan: updatedDaily }));
  };

  const addDailyPlanRow = () => {
    const newRow = { topic: 'New Topic', studyType: 'Self Study', status: 'Not Started', date: '', timing: '' };
    // Add empty values for custom columns
    customColumns.forEach(col => { newRow[col] = ''; });
    setPlanResult(prev => ({ ...prev, dailyPlan: [...(prev.dailyPlan || []), newRow] }));
  };

  const addColumn = () => {
    const colName = prompt("Enter new column name:");
    if (colName && !customColumns.includes(colName)) {
      setCustomColumns([...customColumns, colName]);
      setPlanResult(prev => ({
        ...prev,
        dailyPlan: prev.dailyPlan.map(day => ({ ...day, [colName]: '' }))
      }));
    }
  };

  const removeColumn = (colName) => {
    setCustomColumns(customColumns.filter(c => c !== colName));
    setPlanResult(prev => ({
      ...prev,
      dailyPlan: prev.dailyPlan.map(day => {
        const newDay = { ...day };
        delete newDay[colName];
        return newDay;
      })
    }));
  };

  const removeDailyPlanRow = (index) => {
    const updatedDaily = [...planResult.dailyPlan];
    updatedDaily.splice(index, 1);
    setPlanResult(prev => ({ ...prev, dailyPlan: updatedDaily }));
  };

  const exportPDF = async () => {
    if (!planRef.current || isEditingPlan) return;
    const canvas = await html2canvas(planRef.current, { scale: 2, useCORS: true, allowTaint: true });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = pdfHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save('smart_study_plan.pdf');
  };

  const exportImage = async () => {
    if (!planRef.current || isEditingPlan) return;
    const canvas = await html2canvas(planRef.current, { scale: 2, useCORS: true, allowTaint: true });
    const link = document.createElement('a');
    link.download = 'smart_study_plan.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const hasPlan = planResult || loading;

  return (
    <div className={`sp-page-container ${hasPlan ? 'state-dashboard' : 'state-pre-gen'}`}>
      {!hasPlan && (
        <div className="sp-header centered-header">
          <div className="sp-header-content">
            <h1><Brain className="sp-icon text-cyan" /> AI Study Coach</h1>
            <p>Generate a hyper-realistic, burnout-free study schedule tailored uniquely to your cognitive profile.</p>
          </div>
        </div>
      )}

      <div className="sp-main-grid">
        {/* INPUT FORM */}
        <div className={`sp-form-card ${hasPlan ? 'sidebar-mode' : 'centered-mode'}`}>
          {hasPlan && (
            <div className="sp-sidebar-header">
              <h3><Settings size={18} /> Plan Parameters</h3>
            </div>
          )}
          
          <div className="sp-form-layout">
            <div className="sp-form-left">
              <div className="sp-ai-assistant-widget">
                <div className="sp-widget-header">
                  <Sparkles className="text-cyan sp-pulse" size={18} />
                  <span>Auto-Fill with AI Coach</span>
                </div>
                <div className="sp-ai-input-wrapper">
                  <input 
                    placeholder="e.g. 'I have a math exam next Monday...'" 
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiFill(aiInput)}
                  />
                  <button 
                    className={`sp-mic-btn ${isListening ? 'listening' : ''}`}
                    onClick={toggleListen}
                    title="Speak to Coach"
                  >
                    {isListening ? <Mic className="sp-pulse" size={18} color="#ef4444" /> : <Mic size={18} />}
                  </button>
                  <button 
                    className="sp-send-btn" 
                    onClick={() => handleAiFill(aiInput)}
                    disabled={aiLoading || !aiInput.trim()}
                  >
                    {aiLoading ? <Loader2 className="sp-spin" size={18} /> : <Send size={18} />}
                  </button>
                </div>
                <p className="sp-ai-hint">Try: "Help me prepare for my Chemistry final on June 12th, focusing on Organic reactions."</p>
              </div>
            </div>

            <div className="sp-form-right">
              <div className="sp-section">
                <h3><Calendar size={18} /> Timeline</h3>
                <div className="sp-input-row">
                  <div className="sp-input-group">
                    <label>Start Date</label>
                    <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} />
                  </div>
                  <div className="sp-input-group">
                    <label>Exam Date</label>
                    <input type="date" name="examDate" value={formData.examDate} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div className="sp-section">
                <h3><BookOpen size={18} /> Subjects Info</h3>
                {subjects.map((sub, idx) => (
                  <div key={sub.id} className="sp-subject-card">
                    <div className="sp-subject-header">
                      <span>Subject {idx + 1}</span>
                      {subjects.length > 1 && (
                        <button className="sp-icon-btn text-danger" onClick={() => removeSubject(sub.id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="sp-input-col">
                      <div className="sp-input-group mb-3">
                        <label>Name</label>
                        <input placeholder="Physics, Biology..." value={sub.subjectName} onChange={(e) => handleSubjectChange(sub.id, 'subjectName', e.target.value)} />
                      </div>
                      <div className="sp-input-group">
                        <label>Syllabus / Topics (Separate with commas - Optional)</label>
                        <textarea 
                          className="sp-edit-textarea"
                          placeholder="Topic 1, Topic 2, etc." 
                          value={sub.topics} 
                          onChange={(e) => handleSubjectChange(sub.id, 'topics', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="sp-btn-outline mt-3" onClick={addSubject}>
                  <Plus size={16} /> Add Another Subject
                </button>
              </div>

              <div className="sp-section">
                <h3><Clock size={18} /> Availability</h3>
                <div className="sp-input-row">
                  <div className="sp-input-group">
                    <label>Hrs/Day</label>
                    <input type="number" name="hoursPerDay" value={formData.hoursPerDay} onChange={handleInputChange} />
                  </div>
                  <div className="sp-input-group">
                     <label>Best Time</label>
                     <select name="preferredTime" value={formData.preferredTime} onChange={handleInputChange}>
                       <option>Morning</option>
                       <option>Afternoon</option>
                       <option>Evening</option>
                       <option>Night</option>
                     </select>
                  </div>
                </div>
              </div>

              <div className="sp-section">
                <h3><Brain size={18} /> Psychology</h3>
                <div className="sp-input-row">
                   <div className="sp-input-group">
                     <label>Stress Level</label>
                     <select name="stressLevel" value={formData.stressLevel} onChange={handleInputChange}>
                       <option>Low</option>
                       <option>Medium</option>
                       <option>High</option>
                     </select>
                   </div>
                   <div className="sp-input-group">
                     <label>Target Score</label>
                     <input type="number" name="targetScore" value={formData.targetScore} onChange={handleInputChange} />
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sp-form-footer">
            <button className="sp-btn-primary" onClick={generatePlan} disabled={loading}>
              {loading ? <Loader2 className="sp-spin" size={20} /> : <><Sparkles size={20}/> Generate Master Plan</>}
            </button>
          </div>
        </div>

        {/* RESULTS AREA */}
        <div className="sp-result-area">
          {planResult ? (
            <div className="sp-plan-inner-wrapper">
              <div className="sp-export-bar">
                <div className="sp-plan-actions">
                  {isEditingPlan ? (
                    <button className="sp-btn-icon text-green-500" title="Save Plan Layout" onClick={() => setIsEditingPlan(false)}><Save size={16} /> Save Edits</button>
                  ) : (
                    <button className="sp-btn-icon" title="Edit Generated Plan" onClick={() => setIsEditingPlan(true)}><Edit3 size={16} /> Edit Mode</button>
                  )}
                  <button className="sp-btn-icon text-gray-400" title="Back to Inputs" onClick={() => setPlanResult(null)}><RefreshCcw size={16} /> Reset</button>
                </div>
                {!isEditingPlan && (
                  <div className="sp-plan-actions">
                    <button className="sp-btn-secondary" onClick={exportImage}><Download size={16} /> Image</button>
                    <button className="sp-btn-secondary" onClick={exportPDF}><Download size={16} /> PDF</button>
                  </div>
                )}
              </div>

              <div id="study-plan" className="sp-exportable-content" ref={planRef}>
                {coverImage && (
                  <div className="sp-cover-image">
                    <img src={coverImage} alt="Cover" />
                  </div>
                )}
                <div className="sp-plan-inner">
                  <div className="sp-export-header">
                    <h2><BookOpen className="inline-icon" /> Academic Master Plan</h2>
                  </div>
                  
                  {planResult.motivation && (
                    <div className="sp-motivation-quote">
                      <span className="quote-mark">"</span>
                      {isEditingPlan ? (
                        <textarea className="sp-edit-textarea" value={planResult.motivation} onChange={(e) => handlePlanEdit('motivation', e.target.value)} />
                      ) : (
                        <p>{planResult.motivation}</p>
                      )}
                    </div>
                  )}

                  <div className="sp-blocks">
                    <div className="sp-block">
                      <h4>Strategy Summary</h4>
                      {isEditingPlan ? (
                        <textarea className="sp-edit-textarea" value={planResult.summary} onChange={(e) => handlePlanEdit('summary', e.target.value)} />
                      ) : (
                        <p>{planResult.summary}</p>
                      )}
                    </div>

                    <div className="sp-table-container">
                      <div className="sp-table-header">
                        <h4>📅 Detailed Schedule</h4>
                      </div>
                      <table className="sp-notion-table">
                        <thead>
                          <tr>
                            <th>Topic</th>
                            <th>Study Type</th>
                            <th>Status</th>
                            <th>Time / Schedule</th>
                            {customColumns.map(col => (
                              <th key={col}>
                                <div className="flex items-center justify-between">
                                  {col}
                                  {isEditingPlan && <button onClick={() => removeColumn(col)} className="text-danger ml-2 opacity-50"><Trash2 size={10} /></button>}
                                </div>
                              </th>
                            ))}
                            {isEditingPlan && <th></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {planResult.dailyPlan && planResult.dailyPlan.map((day, idx) => (
                            <tr key={idx}>
                              <td>
                                <span className="topic-icon">📄</span>
                                {isEditingPlan ? <input className="sp-edit-input" value={day.topic} onChange={(e) => handleDailyPlanEdit(idx, 'topic', e.target.value)} /> : day.topic}
                              </td>
                              <td>
                                {isEditingPlan ? (
                                  <input className="sp-edit-input" value={day.studyType || ''} onChange={(e) => handleDailyPlanEdit(idx, 'studyType', e.target.value)} />
                                ) : (
                                  <span className={`sp-pill type-${day.studyType ? day.studyType.toLowerCase().replace(/\s+/g, '-') : 'default'}`}>
                                    {day.studyType}
                                  </span>
                                )}
                              </td>
                              <td>
                                {isEditingPlan ? (
                                  <input className="sp-edit-input" value={day.status || ''} onChange={(e) => handleDailyPlanEdit(idx, 'status', e.target.value)} />
                                ) : (
                                  <span className="sp-pill status">● {day.status}</span>
                                )}
                              </td>
                              <td className="schedule-col">
                                {isEditingPlan ? (
                                  <div className="flex gap-1">
                                    <input className="sp-edit-input inline" placeholder="Date" value={day.date || ''} onChange={(e) => handleDailyPlanEdit(idx, 'date', e.target.value)} />
                                    <input className="sp-edit-input inline" placeholder="Time" value={day.timing || day.schedule || ''} onChange={(e) => handleDailyPlanEdit(idx, 'timing', e.target.value)} />
                                  </div>
                                ) : (
                                  <>{day.date} <br/> {day.timing || day.schedule}</>
                                )}
                              </td>
                              {/* Custom Columns Data Cells */}
                              {customColumns.map(col => (
                                <td key={col}>
                                  {isEditingPlan ? (
                                    <input className="sp-edit-input" value={day[col] || ''} onChange={(e) => handleDailyPlanEdit(idx, col, e.target.value)} />
                                  ) : (
                                    day[col] || '-'
                                  )}
                                </td>
                              ))}
                              {isEditingPlan && (
                                <td className="sp-action-cell">
                                  <button className="sp-icon-btn text-danger" onClick={() => removeDailyPlanRow(idx)}>
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {isEditingPlan && (
                        <div className="sp-table-actions-footer">
                          <button className="sp-btn-outline" onClick={addDailyPlanRow}>
                            <Plus size={16} /> Add Row
                          </button>
                          <button className="sp-btn-outline" onClick={addColumn}>
                            <Plus size={16} /> Add Column
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="sp-empty-state">
              <Brain size={48} className="mb-4 opacity-20" />
              <h3>Plan Ready to Generate</h3>
              <p>Fill the form or speak to your AI Coach to see your schedule.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyPlanner;
