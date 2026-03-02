import React from 'react';
import { Plus, Compass, Globe, Map as MapIcon } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Community } from '../../../types';

interface CommunityMobileListProps {
  communities: Community[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDiscover: () => void;
  visible: boolean;
}

export const CommunityMobileList: React.FC<CommunityMobileListProps> = ({ communities, onSelect, onAdd, onDiscover, visible }) => {
  if (!visible) return null;

  const localCommunities = communities.filter(c => c.type === 'LOCAL');
  const topicCommunities = communities.filter(c => c.type === 'TOPIC');

  return (
      <div className="md:hidden flex flex-col w-full bg-void h-full overflow-y-auto">
            <div className="p-6 pb-20">
                <h1 className="text-2xl font-bold text-white mb-6">Communities</h1>
                 
                 <div className="grid gap-4">
                    {/* Combined List sorted by type conceptually or just displayed sections */}
                    
                    {localCommunities.length > 0 && (
                        <>
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-2 flex items-center gap-2">
                                <MapIcon size={12} /> Local Communities
                            </h2>
                            {localCommunities.map(c => (
                            <GlassCard key={c.id} onClick={() => onSelect(c.id)} className="flex items-center gap-4 p-4 active:scale-95">
                                    <img src={c.iconUrl} className="w-14 h-14 rounded-xl object-cover shadow-lg" alt={c.name} />
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{c.name}</h3>
                                        <p className="text-gray-400 text-sm">{c.memberCount} members</p>
                                    </div>
                            </GlassCard>
                            ))}
                        </>
                    )}

                    {topicCommunities.length > 0 && (
                        <>
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 flex items-center gap-2">
                                <Globe size={12} className="text-mint" /> Cultures
                            </h2>
                            {topicCommunities.map(c => (
                            <GlassCard key={c.id} onClick={() => onSelect(c.id)} className="flex items-center gap-4 p-4 active:scale-95 border-mint/20 bg-mint/5">
                                    <div className="p-0.5 rounded-full border-2 border-mint/30">
                                        <img src={c.iconUrl} className="w-12 h-12 rounded-full object-cover" alt={c.name} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{c.name}</h3>
                                        <p className="text-gray-400 text-sm">Global Culture</p>
                                    </div>
                            </GlassCard>
                            ))}
                        </>
                    )}

                    <div className="h-4"></div>
                    
                    <button onClick={onAdd} className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-white/5 hover:text-white transition-colors">
                        <Plus size={20} /> Add Community
                    </button>
                     <button onClick={onDiscover} className="w-full py-4 bg-white/5 rounded-2xl text-gray-400 font-bold flex items-center justify-center gap-2 hover:bg-white/10 hover:text-white transition-colors">
                        <Compass size={20} /> Discover
                    </button>
                 </div>
            </div>
      </div>
  );
};