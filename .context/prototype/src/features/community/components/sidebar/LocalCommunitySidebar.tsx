
import React from 'react';
import { Community } from '../../../../types';
import { ViewMode } from '../../hooks/useCommunityLogic';
import { SidebarHeader } from './SidebarHeader';
import { ChannelListView } from './views/ChannelListView';
import { EventListView } from './views/EventListView';
import { PrivateGroupListView } from './views/PrivateGroupListView';
import { useCommunityContext } from '../../context/CommunityContext';

interface LocalCommunitySidebarProps {
  communityTags: Community[];
  onBack: () => void;
}

export const LocalCommunitySidebar: React.FC<LocalCommunitySidebarProps> = ({
  communityTags,
  onBack,
}) => {
  const {
    selectedCommunity,
    viewMode,
    setViewMode,
    activeChannel,
    setActiveChannel,
    selectedEventId,
    setSelectedEventId,
    communityEvents,
    userPrivateGroups,
    selectedPrivateGroupId,
    privateGatherings,
    setSelectedPrivateGroupId,
    
    // Actions
    openCreateEventModal,
    openCommunityMapModal,
    openCommunitySettingsModal,
    openCreateChannelModal, // Get this from context
    openInvitePeopleModal, // NEW
    onCreatePrivateTag,
    onUpdatePrivateGroup,
    onDeletePrivateGroup,
    onCreatePrivateChannel
  } = useCommunityContext();

  if (!selectedCommunity) return null;

  const tabs: { id: ViewMode; label: string }[] = [
      { id: 'OPEN', label: 'Channels' },
      { id: 'EVENTS', label: 'Events' },
      { id: 'PRIVATE', label: 'Private' },
  ];

  return (
    <div className="flex flex-col h-full w-full">
        <SidebarHeader 
            community={selectedCommunity}
            communityTags={communityTags}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onBack={onBack}
            tabs={tabs}
            onCreateEvent={openCreateEventModal}
            onOpenCommunityMap={openCommunityMapModal}
            onOpenSettings={openCommunitySettingsModal}
            onCreateChannel={openCreateChannelModal}
            onInvitePeople={openInvitePeopleModal} // Pass it down
        />

        {/* VIEW: CHANNELS (OPEN) */}
        {viewMode === 'OPEN' && (
            <ChannelListView 
                community={selectedCommunity} 
                activeChannel={activeChannel} 
                onChannelClick={(name) => setActiveChannel(name)} 
            />
        )}

        {/* VIEW: EVENTS (LOCAL) */}
        {viewMode === 'EVENTS' && (
            <EventListView 
                events={communityEvents}
                spots={selectedCommunity.spots}
                selectedEventId={selectedEventId}
                onSelectEvent={setSelectedEventId}
                onCreateEvent={openCreateEventModal}
                isTopic={false}
            />
        )}

        {/* VIEW: PRIVATE (LOCAL) */}
        {viewMode === 'PRIVATE' && (
            <PrivateGroupListView 
                userPrivateGroups={userPrivateGroups}
                selectedPrivateGroupId={selectedPrivateGroupId}
                privateGatherings={privateGatherings}
                onSelectPrivateGroup={setSelectedPrivateGroupId}
                onCreatePrivateTag={onCreatePrivateTag}
                onUpdatePrivateGroup={onUpdatePrivateGroup}
                onDeletePrivateGroup={onDeletePrivateGroup}
                onCreatePrivateChannel={onCreatePrivateChannel}
                activeChannel={activeChannel}
                onChannelClick={(name) => setActiveChannel(name)}
            />
        )}
    </div>
  );
};
