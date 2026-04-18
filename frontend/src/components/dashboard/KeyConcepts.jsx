import React from 'react';
import { Lightbulb } from 'lucide-react';

const KeyConcepts = ({ concepts }) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-yellow-500/10 rounded-xl text-yellow-500">
          <Lightbulb size={22} />
        </div>
        <h3 className="text-xl font-bold text-white">Key Concepts</h3>
      </div>
      {concepts && concepts.length > 0 ? (
        <ul className="space-y-3">
          {concepts.map((concept, idx) => (
            <li key={idx} className="flex gap-3 text-sm group">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500/40 group-hover:bg-yellow-500 transition-colors shrink-0"></span>
              <span className="text-white/60 group-hover:text-white transition-colors">{concept}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-white/40 text-sm italic">Analyzing lesson to extract concepts...</p>
      )}
    </div>
  );
};

export default KeyConcepts;
