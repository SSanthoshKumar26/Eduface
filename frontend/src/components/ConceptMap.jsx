import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, RotateCcw, BoxSelect, Network, Loader2 } from "lucide-react";
import "../styles/ConceptMap.css";

const API_BASE_URL = 'http://127.0.0.1:5000';

// Detailed recursive drawing
const NodeItem = ({ node, index, activeId, setActiveId, horizontal }) => {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div 
      className={`cm-node ${visible ? 'visible' : ''} ${activeId === node.id ? 'active' : ''}`}
      onClick={(e) => { e.stopPropagation(); setActiveId(node.id === activeId ? null : node.id); }}
      style={{ borderColor: activeId === node.id ? node.color : '' }}
    >
      <div style={{ color: node.color }}>{node.label}</div>
      {node.desc && <span className="cm-node-sub">{node.desc}</span>}
    </div>
  );
};

export default function ConceptMap() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [horizontal, setHorizontal] = useState(false);

  // Zoom/Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadDynamicMap = async () => {
      setLoading(true);
      setError(null);
      try {
        let lessonContext = "";
        
        // Try getting session from localStorage
        const savedSession = localStorage.getItem('eduface_video_session');
        if (savedSession) {
          const session = JSON.parse(savedSession);
          if (session.jobId === videoId || videoId === 'new' || session.scriptUrl) {
            try {
               const res = await fetch(session.scriptUrl);
               lessonContext = await res.text();
            } catch(e) { console.warn("Failed to fetch scriptUrl"); }
          }
        }

        if (!lessonContext) {
           // Fallback demo or dummy context to prevent failure
           lessonContext = "Artificial Intelligence concepts include Machine Learning, Neural Networks, and Natural Language Processing. Machine learning breaks down into Supervised and Unsupervised learning.";
        }

        // Hit the generate endpoint to extract structured Concept Map
        const promptRaw = `You are a knowledge structuring AI.

Return ONLY valid JSON in this EXACT format:

{
  "nodes": [
    {
      "id": "root",
      "label": "Main Topic",
      "parentId": null
    }
  ]
}

---

RULES:

- MUST include "nodes" array
- Each node must have:
  - id (string, unique)
  - label (short text)
  - parentId (null for root, otherwise valid id)
- Do NOT return tree format
- Do NOT return "children"
- Do NOT return explanations
- Output ONLY JSON

---

EXAMPLE:

{
  "nodes": [
    { "id": "root", "label": "AI", "parentId": null },
    { "id": "ml", "label": "Machine Learning", "parentId": "root" },
    { "id": "dl", "label": "Deep Learning", "parentId": "root" }
  ]
}

---

CONTENT:
${lessonContext.substring(0, 4000)}/`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch(`${API_BASE_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptRaw, mode: "Quick Response", context: "" }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const flaskRes = await response.json();
        const llmOutput = flaskRes.output || "";
        
        let jsonRes = null;
        
        try {
          // Attempt to find JSON block in the AI response text
          const jsonMatch = llmOutput.match(/\{[\s\S]*\}/);
          const cleanText = jsonMatch ? jsonMatch[0] : llmOutput;
          const parsed = JSON.parse(cleanText);
          
          // Handle cases where AI returns the array directly or inside a nodes key
          if (Array.isArray(parsed)) jsonRes = { nodes: parsed };
          else if (parsed.nodes) jsonRes = parsed;
          else if (typeof parsed === 'object') {
             jsonRes = parsed;
          }
        } catch(e) {
          console.error("Parse Error:", e, "Raw LLM Output:", llmOutput);
          throw new Error("AI output was not in a valid format. Please retry.");
        }

        // Pre-process nodes to assign levels if missing
        if (jsonRes && jsonRes.nodes && Array.isArray(jsonRes.nodes)) {
          // 1. Identify root (no parent) -> Level 0
          jsonRes.nodes.forEach(n => {
            if (!n.parentId || n.parentId === "null") n.level = 0;
          });

          // 2. Identify children of root -> Level 1
          const rootIds = jsonRes.nodes.filter(n => n.level === 0).map(n => n.id);
          jsonRes.nodes.forEach(n => {
            if (rootIds.includes(n.parentId)) n.level = 1;
          });

          // 3. Identify everyone else -> Level 2
          jsonRes.nodes.forEach(n => {
            if (n.level === undefined) n.level = 2;
          });

          const paletteList = [ "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899" ];
          jsonRes.nodes = jsonRes.nodes.map((n, i) => ({
            ...n,
            color: n.level === 0 ? "#6366f1" : (n.color && n.color.length > 3 ? n.color : paletteList[i % paletteList.length])
          }));
          setData(jsonRes);
        } else {
          throw new Error("AI output was missing the required map nodes.");
        }
      } catch (err) {
        console.error("Map Gen Error:", err);
        setError("AI could not extract a reliable map. Try again.");
      } finally {
        setLoading(false);
      }
    };

    loadDynamicMap();
  }, [videoId]);

  // Pan and Zoom logic
  const handleWheel = (e) => {
    e.preventDefault();
    setScale(s => Math.min(Math.max(0.4, s - e.deltaY * 0.001), 3));
  };
  
  const handleMouseDown = (e) => {
    if (e.target.closest('.cm-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  
  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setActiveId(null);
  };

  const l0 = data?.nodes?.filter(n => n.level === 0) || [];
  
  const getChildren = (parentId) => data?.nodes?.filter(n => n.parentId === parentId) || [];

  return (
    <div className="cm-flow-wrapper">
      <header className="cm-flow-header">
        <div className="cm-flow-title">
           <h1>Dynamic Knowledge Architecture</h1>
           <p>Status: {loading ? "Analyzing script context..." : "Visualization Active"}</p>
        </div>
        <div className="cm-flow-actions">
           <button className="cm-flow-btn" onClick={() => setHorizontal(!horizontal)}>
             <Network size={16} /> {horizontal ? 'Vertical Layout' : 'Horizontal Layout'}
           </button>
           <button className="cm-flow-btn" onClick={resetView}>
             <RotateCcw size={16} /> Reset View
           </button>
           <button className="cm-flow-btn" onClick={() => navigate(-1)}>
             <ArrowLeft size={16} /> Back to Session
           </button>
        </div>
      </header>

      {loading ? (
        <div className="cm-loader-container">
          <Loader2 size={48} className="cm-spin" />
          <p>Extracting neural topology from your lesson...</p>
        </div>
      ) : error ? (
        <div className="cm-loader-container" style={{color: '#ef4444'}}>
          <p>{error}</p>
          <button className="cm-flow-btn primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <main 
          className="cm-viewport" 
          ref={viewportRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            className={`cm-canvas ${horizontal ? 'horizontal' : ''}`}
            ref={canvasRef}
            style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
          >
            <div className="cm-tree">
              {l0.map((rootNode, i) => (
                <div key={rootNode.id} style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', alignItems: horizontal ? 'center' : 'center', gap: '3rem' }}>
                  <div className="cm-root">
                    <NodeItem node={rootNode} index={0} activeId={activeId} setActiveId={setActiveId} />
                  </div>
                  
                  {getChildren(rootNode.id).length > 0 && (
                    <div 
                      className="cm-tree-row" 
                      style={{ '--span': horizontal ? `${Math.max(getChildren(rootNode.id).length * 80, 0)}px` : `${Math.max(getChildren(rootNode.id).length * 200, 0)}px` }}
                    >
                      {getChildren(rootNode.id).map((level1, l1i) => (
                        <div key={level1.id} style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', alignItems: 'center', gap: '3rem', position: 'relative' }}>
                          <NodeItem node={level1} index={l1i + 1} activeId={activeId} setActiveId={setActiveId} />
                          
                          {getChildren(level1.id).length > 0 && (
                            <div 
                              className="cm-tree-row sub" 
                              style={{ '--span': horizontal ? `${Math.max((getChildren(level1.id).length-1) * 80, 0)}px` : `${Math.max((getChildren(level1.id).length-1) * 160, 0)}px` }}
                            >
                              {getChildren(level1.id).map((level2, l2i) => (
                                <NodeItem key={level2.id} node={level2} index={l1i + l2i + 5} activeId={activeId} setActiveId={setActiveId} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="cm-zoom-controls" onClick={(e) => e.stopPropagation()}>
            <button className="cm-zoom-btn" onClick={() => setScale(s => Math.min(3, s + 0.2))} title="Zoom In"><ZoomIn size={18} /></button>
            <button className="cm-zoom-btn" onClick={resetView} title="Fit View"><Maximize size={18} /></button>
            <button className="cm-zoom-btn" onClick={() => setScale(s => Math.max(0.4, s - 0.2))} title="Zoom Out"><ZoomOut size={18} /></button>
          </div>
        </main>
      )}
    </div>
  );
}
