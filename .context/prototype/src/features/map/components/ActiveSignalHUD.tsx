
import React from 'react';
import { X, Clock } from 'lucide-react';
import { UserSignal } from '../../../types';

interface ActiveSignalHUDProps {
  signal: UserSignal;
  onClear: () => void;
}

export const ActiveSignalHUD: React.FC<ActiveSignalHUDProps> = ({ signal, onClear }) => {
  // Simple time remaining calculation (static for now, could be live interval)
  const getTimeLeft = () => {
      const end = new Date(signal.expiresAt).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) return "Expired";
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m left`;
  };

  return (
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[400] animate-in slide-in-from-top-4 duration-500 pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-md border border-pink-500/30 rounded-full pl-4 pr-1 py-1 flex items-center gap-4 shadow-2xl shadow-pink-500/10">
              <div className="flex items-center gap-2">
                  <span className="text-xl animate-pulse">{signal.emoji}</span>
                  <div className="flex flex-col">
                      <span className="text-xs font-bold text-white leading-none">{signal.text}</span>
                      <span className="text-[9px] text-pink-400 font-bold uppercase tracking-wide flex items-center gap-1 mt-0.5">
                          <Clock size={8} /> {getTimeLeft()}
                      </span>
                  </div>
              </div>
              <button 
                onClick={onClear}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                  <X size={14} />
              </button>
          </div>
      </div>
  );
};
