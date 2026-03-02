import React from 'react';
import { Plus, Compass } from 'lucide-react';
import { Community } from '../../../types';
import { useServerBoost } from '../../monetization/hooks/useServerBoost';

interface CommunityRailProps {
  communities: Community[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onDiscover: () => void;
}

const CommunityItem: React.FC<{ 
    community: Community; 
    isSelected: boolean; 
    onSelect: (id: string | null) => void; 
}> = ({ community, isSelected, onSelect }) => {
  const isLocal = community.type === 'LOCAL';
  const { isBoosted } = useServerBoost(community.id);
  
  // Visual Differentiation
  // Local: Squircle (rounded-xl)
  // Topic: Circle (rounded-full) with specific border
  const shapeClass = isLocal ? 'rounded-xl' : 'rounded-full';
  
  let borderClass = '';
  if (isBoosted) {
      // Golden glow for boosted servers
      borderClass = isSelected 
        ? 'ring-2 ring-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.6)]' 
        : 'ring-2 ring-yellow-400/50 shadow-[0_0_8px_rgba(250,204,21,0.2)] hover:shadow-[0_0_12px_rgba(250,204,21,0.4)]';
  } else {
      borderClass = isLocal 
        ? (isSelected ? 'ring-2 ring-white' : '') 
        : (isSelected ? 'ring-2 ring-mint' : 'ring-1 ring-white/20');
  }

  return (
    <div className="relative group w-full flex justify-center mb-3 shrink-0">
        {/* Selection Indicator (Left Bar) */}
        {isSelected && (
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-lg transition-all duration-200 h-10 w-1 ${isLocal ? 'bg-white' : 'bg-mint'}`} />
        )}
        
        <button
            onClick={() => onSelect(community.id)}
            className={`
                relative w-12 h-12 transition-all duration-200 overflow-hidden group-active:scale-95
                ${shapeClass} ${borderClass}
                ${isSelected ? '' : 'opacity-70 hover:opacity-100 hover:ring-1 hover:ring-white/50'}
            `}
        >
            <img src={community.iconUrl} className="w-full h-full object-cover" alt={community.name} />
        </button>

        {/* Tooltip */}
        <div className="absolute left-[76px] top-1/2 -translate-y-1/2 bg-black text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-white/10 z-50">
            {community.name}
            <span className={`block text-[9px] font-normal ${isLocal ? 'text-gray-400' : 'text-mint'}`}>
                {isLocal ? 'Local Community' : 'Culture'}
            </span>
            {isBoosted && (
                <span className="block text-[9px] font-black text-yellow-400 mt-0.5 uppercase tracking-wide">
                    ⚡ Boosted
                </span>
            )}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-black" />
        </div>
    </div>
  );
};

export const CommunityRail: React.FC<CommunityRailProps> = ({
  communities,
  selectedId,
  onSelect,
  onAdd,
  onDiscover
}) => {
  
  return (
      <div className="flex flex-col items-center bg-black/20 border-r border-white/5 w-[72px] z-30 shrink-0 h-full overflow-hidden">
           
           {/* Scrollable List */}
           <div className="flex-1 w-full flex flex-col items-center py-4 space-y-1 overflow-y-auto overflow-x-hidden no-scrollbar">
               {communities.map(c => (
                   <CommunityItem 
                    key={c.id} 
                    community={c} 
                    isSelected={selectedId === c.id}
                    onSelect={onSelect}
                   />
               ))}
           </div>

           {/* Fixed Actions at Bottom */}
           <div className="p-4 border-t border-white/5 w-full flex flex-col items-center gap-2 shrink-0 bg-[#0F1115]/50 backdrop-blur-sm z-10">
                <RailAction icon={<Plus size={24} />} onClick={onAdd} label="Add Community" colorClass="hover:bg-green-600 text-green-500" />
                <RailAction icon={<Compass size={24} />} onClick={onDiscover} label="Discover" colorClass="hover:bg-signal text-signal" />
           </div>
      </div>
  );
};

const RailAction = ({ icon, onClick, label, colorClass }: any) => (
   <div className="relative group w-full flex justify-center">
       <button
           onClick={onClick}
           className={`w-12 h-12 rounded-full bg-white/5 transition-all flex items-center justify-center group-hover:text-white ${colorClass}`}
       >
           {icon}
       </button>
       <div className="absolute left-[76px] top-1/2 -translate-y-1/2 bg-black text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-white/10 z-50">
           {label}
           <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-black" />
       </div>
   </div>
);