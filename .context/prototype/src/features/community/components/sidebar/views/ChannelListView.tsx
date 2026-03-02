import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Community, Channel } from '../../../../../types';
import { ChannelRow } from '../ChannelRow';
import { useCommunityContext } from '../../../../community/context/CommunityContext';
import { useData } from '../../../../../context/DataContext';

interface ChannelListViewProps {
  community: Community;
  activeChannel: string;
  onChannelClick: (name: string, type: 'text' | 'voice') => void;
}

export const ChannelListView: React.FC<ChannelListViewProps> = ({ community, activeChannel, onChannelClick }) => {
  const { onUpdateChannel, onDeleteChannel, userRole } = useCommunityContext();
  const { currentUser } = useData();
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

  const toggleCategory = (category: string) => {
      setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };
  
  const groupedChannels = useMemo<{ [category: string]: Channel[] }>(() => {
      const groups: Record<string, Channel[]> = {};
      
      // 1. Group existing channels
      community.channels.forEach(ch => {
          // FILTER: If hideMutedChannels is enabled and channel is muted, skip it
          if (currentUser.settings?.hideMutedChannels && ch.notificationSettings === 'MUTED') return;

          const cat = ch.category || 'General';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(ch);
      });

      // 2. Ensure explicit categories exist even if empty
      if (community.categories) {
          community.categories.forEach(cat => {
              if (!groups[cat]) groups[cat] = [];
          });
      }

      // 3. Order categories based on explicit list, then others
      const orderedGroups: Record<string, Channel[]> = {};
      
      // Always put Live Gatherings first if present
      if (groups['Live Gatherings']) {
          orderedGroups['Live Gatherings'] = groups['Live Gatherings'];
          delete groups['Live Gatherings'];
      }

      // Then explicit categories
      if (community.categories) {
          community.categories.forEach(cat => {
              if (groups[cat]) {
                  orderedGroups[cat] = groups[cat];
                  delete groups[cat];
              }
          });
      }

      // Then remaining (uncategorized or new)
      return { ...orderedGroups, ...groups };
  }, [community, currentUser.settings?.hideMutedChannels]);

  const SectionHeader = ({ label, isCollapsed, onToggle }: { label: string, isCollapsed: boolean, onToggle: () => void }) => (
      <div 
        className="px-2 mt-4 mb-1 flex items-center gap-1 cursor-pointer group hover:text-white text-gray-500"
        onClick={onToggle}
      >
         {label !== 'Live Gatherings' && (
             <div className="text-gray-600 group-hover:text-gray-400 transition-colors">
                 {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
             </div>
         )}
         <span className={`text-[10px] font-bold uppercase tracking-widest ${label === 'Live Gatherings' ? 'text-mint w-full text-center' : ''}`}>
             {label}
         </span>
         {label === 'Live Gatherings' && <div className="h-[1px] flex-1 bg-mint/20 ml-2"></div>}
      </div>
  );

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-4">
         <div className="mt-2">
            {(Object.entries(groupedChannels) as [string, Channel[]][]).map(([category, channels]) => {
                const isCollapsed = collapsedCategories[category];
                const isGathering = category === 'Live Gatherings';

                return (
                    <div key={category}>
                        <SectionHeader 
                            label={category} 
                            isCollapsed={!!isCollapsed && !isGathering} 
                            onToggle={() => !isGathering && toggleCategory(category)} 
                        />
                        
                        {(!isCollapsed || isGathering) && (
                            <div className="space-y-0.5">
                                {channels.length === 0 && !isGathering && (
                                    <div className="px-8 py-2 text-[10px] text-gray-600 italic">No channels</div>
                                )}
                                {channels.map(ch => (
                                    <ChannelRow 
                                        key={ch.id} 
                                        id={ch.id}
                                        name={ch.name} 
                                        type={ch.type} 
                                        category={ch.category} 
                                        notificationSettings={ch.notificationSettings}
                                        isActive={(ch.name === activeChannel || ch.id === activeChannel) && ch.type === 'text'}
                                        onClick={() => onChannelClick(ch.category === 'Live Gatherings' ? ch.id : ch.name, ch.type)}
                                        onUpdate={isAdmin && category !== 'Live Gatherings' ? (data) => onUpdateChannel(ch.id, data) : undefined}
                                        onDelete={isAdmin && category !== 'Live Gatherings' ? () => onDeleteChannel(ch.id) : undefined}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
         </div>
    </div>
  );
};