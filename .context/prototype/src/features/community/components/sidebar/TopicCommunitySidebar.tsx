import React from 'react';
import { ViewMode } from '../../hooks/useCommunityLogic';
import { SidebarHeader } from './SidebarHeader';
import { HappeningsView } from './views/HappeningsView';
import { LocalCommunitiesView } from './views/LocalCommunitiesView';
import { useCommunityContext } from '../../context/CommunityContext';

interface TopicCommunitySidebarProps {
  onBack: () => void;
}

export const TopicCommunitySidebar: React.FC<TopicCommunitySidebarProps> = ({ onBack }) => {
  const {
      selectedCommunity,
      allCommunities,
      joinedCommunities,
      viewMode,
      setViewMode,
      communityEvents,
      activeGatherings,
      buzzGatherings,
      selectedEventId,
      setSelectedEventId,
      connectedLocalCommunities,
      openCreateEventModal,
      openInvitePeopleModal,
      openCommunitySettingsModal, // Added
      onNavigateToChat,
      onSelectCommunity,
      onJoinCommunity
  } = useCommunityContext();

  if (!selectedCommunity) return null;

  const tabs: { id: ViewMode; label: string }[] = [
      { id: 'HAPPENINGS', label: 'Happenings' },
      { id: 'LOCAL_COMMUNITIES', label: 'Local Communities' }
  ];

  const joinedCommunityIds = joinedCommunities.map(c => c.id);

  return (
    <div className="flex flex-col h-full w-full">
        <SidebarHeader 
            community={selectedCommunity}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onBack={onBack}
            tabs={tabs}
            onCreateEvent={openCreateEventModal}
            onInvitePeople={openInvitePeopleModal}
            onOpenSettings={openCommunitySettingsModal} // Added
        />

        {/* VIEW: HAPPENINGS (TOPIC) */}
        {viewMode === 'HAPPENINGS' && (
            <HappeningsView 
                activeGatherings={activeGatherings}
                buzzGatherings={buzzGatherings}
                events={communityEvents}
                allCommunities={allCommunities}
                onNavigateToChat={onNavigateToChat}
                selectedEventId={selectedEventId}
                onSelectEvent={setSelectedEventId}
                onCreateEvent={openCreateEventModal}
                isTopic={true}
            />
        )}

        {/* VIEW: LOCAL COMMUNITIES (TOPIC) */}
        {viewMode === 'LOCAL_COMMUNITIES' && (
            <LocalCommunitiesView 
                communities={connectedLocalCommunities}
                joinedCommunityIds={joinedCommunityIds}
                onSelectCommunity={onSelectCommunity}
                onJoinCommunity={onJoinCommunity}
            />
        )}
    </div>
  );
};