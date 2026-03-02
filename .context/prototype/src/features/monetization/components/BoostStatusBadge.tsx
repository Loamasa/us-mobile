import React from 'react';
import { Zap } from 'lucide-react';
import { useServerBoost } from '../hooks/useServerBoost';

interface BoostStatusBadgeProps {
  communityId: string;
}

export const BoostStatusBadge: React.FC<BoostStatusBadgeProps> = ({ communityId }) => {
  const { isBoosted, supporterCount, boostThreshold } = useServerBoost(communityId);

  if (isBoosted) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full text-[9px] font-black text-yellow-400 uppercase tracking-widest shadow-[0_0_10px_rgba(234,179,8,0.15)] animate-in fade-in zoom-in duration-300">
        <Zap size={10} fill="currentColor" />
        <span>Boosted</span>
      </div>
    );
  }

  const remaining = Math.max(0, boostThreshold - supporterCount);

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/5 rounded-full text-[9px] font-bold text-gray-500 uppercase tracking-wide">
      <div className="flex h-1 w-8 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-500/50 transition-all duration-500" 
            style={{ width: `${(supporterCount / boostThreshold) * 100}%` }} 
          />
      </div>
      <span className="text-gray-400 tabular-nums">{supporterCount}/{boostThreshold}</span>
    </div>
  );
};
