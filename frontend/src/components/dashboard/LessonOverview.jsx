import React from 'react';
import { FileText } from 'lucide-react';

const LessonOverview = ({ overview }) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
          <FileText size={22} />
        </div>
        <h3 className="text-xl font-bold text-white">Lesson Overview</h3>
      </div>
      <p className="text-white/60 leading-relaxed text-sm">
        {overview || "Detailed overview of the lesson will appear here once content is processed."}
      </p>
    </div>
  );
};

export default LessonOverview;
