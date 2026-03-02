
import React, { useMemo } from 'react';
import { useCommunityContext } from '../context/CommunityContext';

// Sub-components
import { LocalCommunitySidebar } from './sidebar/LocalCommunitySidebar';
import { TopicCommunitySidebar } from './sidebar/TopicCommunitySidebar';

interface CommunitySidebarProps {
  onBack: () => void;
}

export const CommunitySidebar: React.FC<CommunitySidebarProps> = ({ onBack }) => {
  const { selectedCommunity, allCommunities } = useCommunityContext();

  if (!selectedCommunity) return null;

  const isTopic = selectedCommunity.type === 'TOPIC';

  const communityTags = useMemo(() => {
      if (!selectedCommunity.topicIds) return [];
      return selectedCommunity.topicIds
          .map(tid => allCommunities.find(c => c.id === tid))
          .filter(Boolean) as any[]; // Type assertion for convenience
  }, [selectedCommunity, allCommunities]);

  return (
    <div className="flex-col bg-[#0F1115] border-r border-white/5 md:w-72 flex shrink-0 h-full w-full">
        {isTopic ? (
            <TopicCommunitySidebar onBack={onBack} />
        ) : (
            <LocalCommunitySidebar communityTags={communityTags} onBack={onBack} />
        )}
    </div>
  );
};
