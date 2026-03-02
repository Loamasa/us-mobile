import React, { useState, useMemo } from 'react';
import { Plus, X, MapPin, Heart, Coins } from 'lucide-react';
import { useCommunityAllocation } from '../hooks/useCommunityAllocation';
import { useData } from '../../../context/DataContext';
import { GlassCard } from '../../../components/ui/GlassCard';

export const AllocationSelector: React.FC = () => {
  const { 
    totalSlots, 
    allocatedCommunityIds, 
    assignSlot, 
    removeSlot, 
    slotValue 
  } = useCommunityAllocation();
  
  const { communities, joinedCommunityIds } = useData();
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  // Resolve full community objects for allocated IDs
  const allocatedCommunities = useMemo(() => {
    return allocatedCommunityIds
      .map(id => communities.find(c => c.id === id))
      .filter(Boolean) as typeof communities;
  }, [allocatedCommunityIds, communities]);

  // Find eligible communities to select (Joined + Local + Not already allocated)
  const eligibleCommunities = useMemo(() => {
    return communities.filter(c => 
      joinedCommunityIds.includes(c.id) && 
      c.type === 'LOCAL' && 
      !allocatedCommunityIds.includes(c.id)
    );
  }, [communities, joinedCommunityIds, allocatedCommunityIds]);

  const handleSelect = (communityId: string) => {
    assignSlot(communityId);
    setShowSelectionModal(false);
  };

  if (totalSlots === 0) {
    return (
      <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-500">
          <Heart size={20} />
        </div>
        <h3 className="text-white font-bold mb-1">Unlock Community Funding</h3>
        <p className="text-gray-400 text-xs mb-4 max-w-sm mx-auto">
          Upgrade to a paid plan to directly fund the local communities you love.
        </p>
      </div>
    );
  }

  // Create array for rendering slots
  const slots = Array.from({ length: totalSlots });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Coins className="text-mint" size={18} />
            <h3 className="font-bold text-white">Community Impact</h3>
        </div>
        <span className="text-xs font-bold bg-mint/10 text-mint px-2 py-1 rounded-md border border-mint/20">
            ${(allocatedCommunityIds.length * slotValue).toFixed(2)} / mo allocated
        </span>
      </div>
      
      <p className="text-gray-400 text-sm">
        Your plan includes {totalSlots} funding slots. Each slot contributes ${slotValue.toFixed(2)}/mo to a local community of your choice.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((_, index) => {
          const isFilled = index < allocatedCommunities.length;
          const community = isFilled ? allocatedCommunities[index] : null;

          if (isFilled && community) {
            return (
              <GlassCard key={community.id} className="relative group p-4 flex items-center gap-3 border-mint/30 bg-mint/5 hover:border-mint/50 transition-colors">
                <img 
                  src={community.iconUrl} 
                  className="w-10 h-10 rounded-lg object-cover shadow-sm" 
                  alt={community.name} 
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate text-sm">{community.name}</div>
                  <div className="text-[10px] text-mint font-bold uppercase tracking-wider flex items-center gap-1">
                    <Heart size={10} fill="currentColor" /> ${slotValue.toFixed(2)}/mo
                  </div>
                </div>
                <button 
                  onClick={() => removeSlot(community.id)}
                  className="p-1.5 bg-black/20 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-full transition-colors"
                  title="Remove allocation"
                >
                  <X size={14} />
                </button>
              </GlassCard>
            );
          }

          return (
            <button 
              key={`empty-${index}`}
              onClick={() => setShowSelectionModal(true)}
              className="group p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 transition-all flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                <Plus size={18} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-400 group-hover:text-white text-sm transition-colors">Select Community</div>
                <div className="text-[10px] text-gray-600 group-hover:text-gray-500 uppercase tracking-wider">Empty Slot</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection Modal */}
      {showSelectionModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0F1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="font-bold text-white text-lg">Select Community</h3>
              <button onClick={() => setShowSelectionModal(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {eligibleCommunities.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                    <MapPin size={24} />
                  </div>
                  <p className="text-gray-400 font-bold mb-2">No communities found</p>
                  <p className="text-xs text-gray-600 mb-6">
                    You can only allocate funding to Local Communities you have joined.
                  </p>
                  <button 
                    onClick={() => setShowSelectionModal(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {eligibleCommunities.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group text-left"
                    >
                      <img src={c.iconUrl} className="w-10 h-10 rounded-lg object-cover bg-gray-800" alt={c.name} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm group-hover:text-mint transition-colors">{c.name}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                          <MapPin size={10} /> {c.location.city}
                        </div>
                      </div>
                      <div className="px-3 py-1.5 bg-white/5 group-hover:bg-mint group-hover:text-black rounded-lg text-xs font-bold text-gray-400 transition-colors">
                        Select
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};