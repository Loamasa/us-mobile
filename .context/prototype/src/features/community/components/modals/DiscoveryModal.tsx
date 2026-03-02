import React, { useState, useMemo } from 'react';
import { Compass, Search, X, Users, Plus, Globe, ArrowLeft, MapPin, Hash, Check } from 'lucide-react';
import { GlassCard } from '../../../../components/ui/GlassCard';
import { Community } from '../../../../types';

interface DiscoveryModalProps {
  communities: Community[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export const DiscoveryModal: React.FC<DiscoveryModalProps> = ({ communities, onClose, onSelect }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Split communities by type
  const { topics, locals } = useMemo(() => {
    return {
        topics: communities.filter(c => c.type === 'TOPIC'),
        locals: communities.filter(c => c.type === 'LOCAL')
    };
  }, [communities]);

  // Filter logic
  const displayedContent = useMemo(() => {
      const lower = searchTerm.toLowerCase();

      // 1. If viewing a specific topic
      if (selectedTopicId) {
          return locals.filter(c => 
              c.topicIds?.includes(selectedTopicId) &&
              (c.name.toLowerCase().includes(lower) || c.description.toLowerCase().includes(lower))
          );
      }

      // 2. If searching globally
      if (searchTerm) {
          return communities.filter(c => 
              c.name.toLowerCase().includes(lower) || 
              c.description.toLowerCase().includes(lower)
          );
      }

      // 3. Default View (Just Topics)
      return topics;
  }, [selectedTopicId, searchTerm, topics, locals, communities]);

  const activeTopic = topics.find(t => t.id === selectedTopicId);

  const handleTopicSelect = (id: string | null) => {
      setSelectedTopicId(id);
      setSearchTerm(''); // Clear search when switching context
  };

  return (
      <div className="absolute inset-0 z-[70] bg-void flex flex-col animate-in fade-in duration-200">
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-void/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                  {selectedTopicId ? (
                      <button 
                        onClick={() => handleTopicSelect(null)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
                      >
                          <ArrowLeft size={20} />
                      </button>
                  ) : (
                      <div className="p-2 bg-mint/20 rounded-lg text-mint"><Compass size={24} /></div>
                  )}
                  
                  <h2 className="text-xl font-bold text-white">
                      {selectedTopicId ? activeTopic?.name : 'Explore Cultures'}
                  </h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                  <X size={24} />
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
              
              {/* Hero / Search Section (Only show on main view) */}
              {!selectedTopicId && (
                  <div className="relative h-64 border-b border-white/5 group overflow-hidden">
                      <img src="https://picsum.photos/seed/discovery_hero/1200/400" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" alt="Discover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent"></div>
                      
                      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 max-w-2xl mx-auto text-center">
                          <h1 className="text-4xl font-black text-white mb-2 drop-shadow-lg tracking-tight">Find Your Culture</h1>
                          <p className="text-gray-300 mb-6">Explore cultures to find local communities near you.</p>
                          
                          <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search cultures, aesthetics..." 
                                className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl pl-12 pr-4 py-3 text-base focus:outline-none shadow-xl focus:bg-white/20 transition-all placeholder-gray-400 focus:border-mint/50"
                            />
                          </div>
                      </div>
                  </div>
              )}

              {/* Topic Detail Header */}
              {selectedTopicId && activeTopic && (
                  <div className="relative h-48 border-b border-white/5">
                       <img src={activeTopic.coverImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" alt={activeTopic.name} />
                       <div className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-transparent"></div>
                       <div className="relative z-10 h-full flex items-center px-8 gap-6">
                           <img src={activeTopic.iconUrl} className="w-24 h-24 rounded-full border-4 border-void shadow-xl" alt={activeTopic.name} />
                           <div>
                               <h1 className="text-3xl font-bold text-white mb-2">{activeTopic.name}</h1>
                               <p className="text-gray-300 max-w-lg">{activeTopic.description}</p>
                               <div className="flex items-center gap-4 mt-4 text-sm font-medium text-gray-400">
                                   <span className="flex items-center gap-1"><Users size={14} /> {activeTopic.memberCount} Members</span>
                                   <span className="flex items-center gap-1"><Globe size={14} /> Global Culture</span>
                               </div>
                           </div>
                           <div className="ml-auto">
                                <button 
                                    onClick={() => onSelect(activeTopic.id)}
                                    className="px-6 py-3 bg-mint/10 hover:bg-mint/20 border border-mint/50 text-mint rounded-xl font-bold transition-all flex items-center gap-2"
                                >
                                    <Plus size={18} /> Join Culture
                                </button>
                           </div>
                       </div>
                  </div>
              )}

              {/* Grid Content */}
              <div className="p-6 max-w-7xl mx-auto">
                  
                  {/* Topic View Search Bar */}
                  {selectedTopicId && (
                      <div className="mb-6 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                          <input 
                              type="text" 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder={`Search in ${activeTopic?.name}...`}
                              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-mint/50 transition-colors"
                          />
                      </div>
                  )}

                  {/* Section Title */}
                  <div className="flex items-center gap-2 mb-6">
                      <div className="h-[1px] bg-white/10 flex-1"></div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          {selectedTopicId ? `Communities in ${activeTopic?.name}` : (searchTerm ? 'Search Results' : 'Explore Cultures')}
                      </span>
                      <div className="h-[1px] bg-white/10 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayedContent.length === 0 && (
                            <div className="col-span-full text-center text-gray-500 py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
                                <p>No results found.</p>
                            </div>
                        )}
                        
                        {displayedContent.map(c => {
                            const isTopic = c.type === 'TOPIC';
                            
                            return (
                                <GlassCard 
                                    key={c.id} 
                                    className={`
                                        group p-5 transition-all duration-300 border
                                        ${isTopic 
                                            ? 'bg-mint/5 border-mint/20 hover:border-mint/50 hover:bg-mint/10 rounded-3xl' 
                                            : 'bg-white/5 border-white/5 hover:border-signal/50 hover:bg-white/10 rounded-xl'
                                        }
                                    `}
                                    onClick={() => isTopic ? handleTopicSelect(c.id) : null}
                                    noPadding
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <img 
                                                src={c.iconUrl} 
                                                className={`w-14 h-14 object-cover shadow-lg ${isTopic ? 'rounded-full border-2 border-mint/30' : 'rounded-xl border border-white/10'}`} 
                                                alt={c.name} 
                                            />
                                            <div>
                                                <h3 className={`font-bold text-lg leading-tight ${isTopic ? 'text-mint' : 'text-white'}`}>
                                                    {c.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                                                    {isTopic ? <Globe size={12} /> : <MapPin size={12} />}
                                                    {isTopic ? 'Culture' : c.location.city}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Type Indicator Icon */}
                                        <div className={`p-2 rounded-full ${isTopic ? 'bg-mint/10 text-mint' : 'bg-white/5 text-gray-500'}`}>
                                            {isTopic ? <Hash size={16} /> : <Users size={16} />}
                                        </div>
                                    </div>
                                    
                                    <p className="text-sm text-gray-400 line-clamp-2 mb-6 min-h-[2.5em]">
                                        {c.description}
                                    </p>
                                    
                                    {isTopic ? (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleTopicSelect(c.id); }}
                                                className="flex-1 py-3 bg-mint/10 hover:bg-mint text-mint hover:text-black rounded-xl font-bold text-xs transition-colors border border-mint/30 hover:border-mint"
                                            >
                                                Find Local Communities
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onSelect(c.id); }}
                                                className="flex-1 py-3 bg-black/20 hover:bg-black/40 text-gray-300 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-white/5"
                                            >
                                                <Plus size={14} /> Join Culture
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onSelect(c.id); }}
                                            className="w-full py-3 bg-signal hover:bg-blue-600 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-signal/20"
                                        >
                                            <Users size={16} /> Join Community
                                        </button>
                                    )}
                                </GlassCard>
                            );
                        })}
                  </div>
              </div>
          </div>
      </div>
  );
}