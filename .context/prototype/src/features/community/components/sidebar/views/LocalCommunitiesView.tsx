
import React from 'react';
import { Community } from '../../../../../types';
import { Users, MapPin, Check } from 'lucide-react';

interface LocalCommunitiesViewProps {
  communities: Community[];
  joinedCommunityIds: string[];
  onSelectCommunity: (id: string) => void;
  onJoinCommunity?: (id: string) => void;
}

export const LocalCommunitiesView: React.FC<LocalCommunitiesViewProps> = ({ 
    communities, 
    joinedCommunityIds,
    onSelectCommunity, 
    onJoinCommunity 
}) => {
  const isJoined = (id: string) => joinedCommunityIds.includes(id);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 space-y-4">
        <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Connected Locals</span>
            <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400">{communities.length} in Area</span>
        </div>

        {communities.length === 0 && (
            <div className="text-center text-gray-500 py-6 text-xs bg-white/5 rounded-xl border border-dashed border-white/5">
                No local communities connected to this topic found in your area.
            </div>
        )}

        {communities.map(c => {
            const joined = isJoined(c.id);
            return (
                <div 
                    key={c.id} 
                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <img 
                            src={c.iconUrl} 
                            alt={c.name} 
                            className="w-10 h-10 rounded-lg object-cover shadow-sm border border-white/10"
                        />
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-white truncate">{c.name}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <span className="flex items-center gap-1"><MapPin size={10} /> {c.location.city}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span className="flex items-center gap-1"><Users size={10} /> {c.memberCount}</span>
                            </div>
                        </div>
                    </div>
                    
                    {joined ? (
                        <button 
                            onClick={() => onSelectCommunity(c.id)}
                            className="w-full py-2 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Check size={12} /> Joined
                        </button>
                    ) : (
                        <button 
                            onClick={() => onJoinCommunity && onJoinCommunity(c.id)}
                            className="w-full py-2 bg-signal/20 text-signal border border-signal/30 text-xs font-bold rounded-lg hover:bg-signal hover:text-white transition-colors"
                        >
                            Join Community
                        </button>
                    )}
                </div>
            );
        })}
    </div>
  );
};
