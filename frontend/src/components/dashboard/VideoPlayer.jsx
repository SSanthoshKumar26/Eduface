import React from 'react';
import { Download, Trash2, RefreshCw } from 'lucide-react';

const VideoPlayer = ({ videoUrl, onDownload, onDelete, onRegenerate }) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-4 shadow-2xl overflow-hidden flex flex-col gap-4">
      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative group">
        <video 
          controls 
          src={videoUrl} 
          className="w-full h-full object-contain"
          controlsList="nodownload" 
        />
      </div>
      
      <div className="flex items-center gap-3 mt-2">
        <button 
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-primary/10 hover:bg-cyan-primary/20 text-cyan-primary border border-cyan-primary/30 rounded-xl transition-all font-semibold"
        >
          <Download size={18} />
          <span>Download</span>
        </button>
        
        <button 
          onClick={onRegenerate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-xl transition-all font-semibold"
          title="Regenerate Lesson"
        >
          <RefreshCw size={18} />
        </button>
        
        <button 
          onClick={onDelete}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl transition-all font-semibold"
          title="Delete Video"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;
