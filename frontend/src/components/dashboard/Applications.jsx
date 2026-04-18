import React from 'react';
import { Rocket } from 'lucide-react';

const Applications = ({ applications }) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500">
          <Rocket size={22} />
        </div>
        <h3 className="text-xl font-bold text-white">Real-World Applications</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {applications && applications.length > 0 ? (
          applications.map((app, idx) => (
            <div 
              key={idx} 
              className="px-4 py-2 bg-green-500/5 border border-green-500/10 rounded-full text-xs text-green-400 font-medium"
            >
              {app}
            </div>
          ))
        ) : (
          <p className="text-white/40 text-sm italic">Identifying industry applications...</p>
        )}
      </div>
      <p className="mt-4 text-xs text-white/30 leading-relaxed italic border-t border-white/5 pt-4">
        This technology is used in modern industry to build scalable, high-performance systems and interactive user experiences.
      </p>
    </div>
  );
};

export default Applications;
