
import React from 'react';
import { Flame, Users, Radio, Lock } from 'lucide-react';
import { MapEntity, Community } from '../../../../../types';

interface GatheringListViewProps {
  activeGatherings: MapEntity[];
  buzzGatherings: MapEntity[];
  allCommunities: Community[];
  onNavigateToChat: (chatId: string) => void;
}

export const GatheringListView: React.FC<GatheringListViewProps> = ({ 
    activeGatherings, 
    buzzGatherings, 
    allCommunities, 
    onNavigateToChat 
}) => {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 space-y-6">
        {/* ACTIVE GATHERINGS */}
        <div>
            <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-xs font-bold text-gray-500 uppercase">Live Now</span>
                <span className="text-[10px] bg-mint/10 text-mint px-2 py-1 rounded border border-mint/20 animate-pulse">{activeGatherings.length} Active</span>
            </div>

            {activeGatherings.length === 0 && (
                <div className="text-center text-gray-500 py-4 text-xs bg-white/5 rounded-xl border border-dashed border-white/5">
                    No active gatherings in your communities.
                </div>
            )}

            <div className="space-y-3">
                {activeGatherings.map(gathering => {
                    const sourceCommunity = allCommunities.find(c => c.id === gathering.communityId);
                    return (
                        <div 
                            key={gathering.id}
                            onClick={() => gathering.chatId && onNavigateToChat(gathering.chatId)}
                            className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-mint/50 hover:bg-mint/5 cursor-pointer transition-all"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center text-mint border border-mint/30">
                                    <Flame size={18} className="fill-mint/20" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white group-hover:text-mint transition-colors">{gathering.data.name}</h3>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                        <span>via {sourceCommunity?.name || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <Users size={12} />
                                    <span>{gathering.data.memberCount || 0} people</span>
                                </div>
                                <div className="px-2 py-1 rounded-md bg-white/5 text-gray-300 text-[10px] font-bold group-hover:bg-mint group-hover:text-black transition-colors">
                                    JOIN CHAT
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* BUZZ (Unjoined) */}
        {buzzGatherings.length > 0 && (
            <div className="opacity-60 hover:opacity-100 transition-opacity duration-500">
                <div className="flex items-center gap-2 mb-4 px-1">
                    <Radio size={14} className="text-orange-400 animate-pulse" />
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Buzz</span>
                </div>
                <div className="space-y-3">
                    {buzzGatherings.map(gathering => {
                        const sourceCommunity = allCommunities.find(c => c.id === gathering.communityId);
                        return (
                            <div 
                                key={gathering.id}
                                className="p-4 rounded-xl bg-white/5 border border-dashed border-white/10 relative overflow-hidden select-none"
                            >
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1 bg-black/80 px-3 py-1.5 rounded-lg border border-white/20 shadow-xl">
                                        <Lock size={12} className="text-gray-300" />
                                        <span className="text-[10px] font-bold text-white">Join {sourceCommunity?.name}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 mb-2 blur-[2px]">
                                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-300">Hidden Gathering</h3>
                                        <div className="text-[10px] text-gray-500">via {sourceCommunity?.name}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-orange-400 font-mono mt-1 flex items-center gap-1">
                                    <Users size={10} />
                                    {gathering.data.memberCount || 15}+ people nearby
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
    </div>
  );
};
