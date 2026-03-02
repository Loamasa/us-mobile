import React, { useState, useEffect } from 'react';
import { Community, Event, PrivateGroup, MapEntity } from '../../types';
import { Check } from 'lucide-react';

// Hooks & Context
import { useCommunityLogic } from './hooks/useCommunityLogic';
import { CommunityProvider } from './context/CommunityContext';

// Components
import { CommunityRail } from './components/CommunityRail';
import { CommunitySidebar } from './components/CommunitySidebar';
import { CommunityMainArea } from './components/CommunityMainArea';

// Modals
import { CreateEventModal } from './components/modals/CreateEventModal';
import { DiscoveryModal } from './components/modals/DiscoveryModal';
import { CreateCommunityModal } from './components/modals/CreateCommunityModal';
import { CreateSpotModal } from './components/modals/CreateSpotModal';
import { ServerSettingsModal } from './components/modals/ServerSettingsModal';
import { CreateChannelModal } from './components/modals/CreateChannelModal';
import { CreateCategoryModal } from './components/modals/CreateCategoryModal';
import { InvitePeopleModal } from './components/modals/InvitePeopleModal'; // NEW
import { useTutorial } from '../../context/TutorialContext';
import { useData } from '../../context/DataContext';

interface CommunityInterfaceProps {
  communities: Community[]; // Joined communities
  allCommunities: Community[]; // All communities (for Buzz)
  events: Event[];
  onNavigateToChat: (chatId: string) => void;
  onCreateEvent: (event: any) => void;
  onToggleRsvp: (eventId: string) => void;
  onMobileChatOpen?: (isOpen: boolean) => void;
  targetEventId?: string | null;
  targetCommunityId?: string | null;
  targetChannelId?: string | null;
  targetPrivateGroupId?: string | null;
  onJoinEventChat?: (event: Event) => void;
  discoverableCommunities?: Community[];
  onJoinCommunity?: (id: string) => void;
  onCreateCommunity?: (data: any) => void; // Added prop
  initialPrivateGroups?: PrivateGroup[];
  mapNodes?: MapEntity[]; 
  onUpdateCommunity?: (id: string, data: Partial<Community>) => void;
}

export const CommunityInterface: React.FC<CommunityInterfaceProps> = ({ 
    communities, 
    allCommunities,
    events,
    onNavigateToChat,
    onCreateEvent,
    onToggleRsvp,
    onMobileChatOpen,
    targetEventId,
    targetCommunityId,
    targetChannelId,
    targetPrivateGroupId,
    onJoinEventChat,
    discoverableCommunities = [],
    onJoinCommunity,
    onCreateCommunity,
    initialPrivateGroups = [],
    mapNodes = [],
    onUpdateCommunity
}) => {
  const { triggerTutorial } = useTutorial();
  const { joinCommunityViaLink } = useData();

  // Trigger Tutorial on Mount (Find Your Tribe)
  useEffect(() => {
    if (communities.length === 0) {
        // Point to discovery if user has no communities
        triggerTutorial('community_discovery');
    }
  }, [communities.length, triggerTutorial]);
  
  // Logic Hook (Data Aggregation)
  const logic = useCommunityLogic(
      communities, 
      allCommunities, 
      events, 
      onMobileChatOpen, 
      targetEventId, 
      targetCommunityId,
      targetChannelId,
      targetPrivateGroupId,
      initialPrivateGroups,
      mapNodes 
  );
  
  // Modal States
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showCommunityMap, setShowCommunityMap] = useState(false);
  const [showCommunitySettings, setShowCommunitySettings] = useState(false);

  // Trigger Tutorial when Discovery opens (Local vs. Topic)
  useEffect(() => {
    if (showDiscovery) {
        triggerTutorial('community_types');
    }
  }, [showDiscovery, triggerTutorial]);

  // Handlers
  const handleCreateSpotSubmit = (spotData: { name: string; radius: number; minPeople: number; location: { lat: number; lng: number }; type: 'COMMUNITY' | 'PRIVATE' }) => {
      logic.handleCreateSpot(spotData);
      setShowCommunityMap(false);
  };

  const handleUpdateSpot = (spotId: string, spotData: any) => {
      logic.handleUpdateSpot(spotId, spotData);
      setShowCommunityMap(false);
  };

  const handleDeleteSpot = (spotId: string) => {
      logic.handleDeleteSpot(spotId);
      // Don't close modal, just update view
  };

  const handleCreateEventSubmit = (data: any) => {
      if (logic.selectedId) {
          onCreateEvent({ ...data, communityId: logic.selectedId });
          setShowCreateEvent(false);
          logic.showToast("Event created!");
      }
  };

  const handleCreateCommunitySubmit = (data: any) => {
      if (onCreateCommunity) onCreateCommunity(data);
      setShowCreateCommunity(false);
      logic.showToast("Community created!");
  };

  const handleJoinViaLink = (link: string) => {
      const success = joinCommunityViaLink(link);
      if (success) {
          logic.showToast("Joined community!");
          setShowCreateCommunity(false);
      } else {
          logic.showToast("Invalid invite link.");
      }
  };

  const handleUpdateCommunity = (id: string, data: Partial<Community>) => {
      if (onUpdateCommunity) {
          onUpdateCommunity(id, data);
          logic.showToast("Settings saved!");
      }
  };

  // Helper to extract categories for create channel
  const getExistingCategories = () => {
      if (!logic.selectedCommunity || logic.selectedCommunity.type === 'TOPIC') return ['General'];
      if (logic.selectedCommunity.categories && logic.selectedCommunity.categories.length > 0) {
          return logic.selectedCommunity.categories;
      }
      return Array.from(new Set(logic.selectedCommunity.channels.map(c => c.category || 'General')));
  };

  return (
    <CommunityProvider
      selectedCommunity={logic.selectedCommunity}
      allCommunities={allCommunities}
      joinedCommunities={communities}
      communityEvents={logic.communityEvents}
      selectedEvent={logic.selectedEvent}
      friendsInCommunity={logic.friendsInCommunity}
      activeGatherings={logic.activeGatherings}
      buzzGatherings={logic.buzzGatherings}
      userPrivateGroups={logic.userPrivateGroups}
      privateGatherings={logic.privateGatherings}
      activeChannelChat={logic.activeChannelChat}
      connectedLocalCommunities={logic.connectedLocalCommunities}
      userRole={logic.userRole}
      
      viewMode={logic.viewMode}
      activeChannel={logic.activeChannel}
      selectedEventId={logic.selectedEventId}
      selectedPrivateGroupId={logic.selectedPrivateGroupId}
      mobileShowChat={logic.mobileShowChat}
      
      setViewMode={logic.setViewMode}
      setActiveChannel={(ch) => logic.handleChannelClick(ch, 'text')}
      setSelectedEventId={logic.setSelectedEventId}
      setSelectedPrivateGroupId={logic.setSelectedPrivateGroupId}
      handleBackFromChat={logic.handleBackFromChat}
      
      onNavigateToChat={onNavigateToChat}
      onSelectCommunity={logic.handleSelectCommunity}
      onMobileChatOpen={(isOpen) => onMobileChatOpen && onMobileChatOpen(isOpen)}
      onJoinCommunity={onJoinCommunity}
      onLeaveCommunity={logic.onLeaveCommunity}
      onDeleteCommunity={logic.onDeleteCommunity}
      
      openCreateEventModal={() => setShowCreateEvent(true)}
      openCommunityMapModal={() => setShowCommunityMap(true)}
      openDiscoveryModal={() => setShowDiscovery(true)}
      openCreateCommunityModal={() => setShowCreateCommunity(true)}
      openCommunitySettingsModal={() => setShowCommunitySettings(true)}
      openCreateChannelModal={logic.openCreateChannelModal}
      openCreateCategoryModal={logic.openCreateCategoryModal}
      openInvitePeopleModal={logic.openInvitePeopleModal} // NEW
      createCategory={logic.createCategory}
      
      onCreatePrivateTag={logic.handleCreateTag}
      onUpdatePrivateGroup={logic.onUpdatePrivateGroup}
      onDeletePrivateGroup={logic.onDeletePrivateGroup}
      onCreatePrivateChannel={logic.handleCreatePrivateChannel}
      onToggleRsvp={onToggleRsvp}
      onJoinEventChat={onJoinEventChat}
      onUpdateChannel={logic.onUpdateChannel}
      onDeleteChannel={logic.onDeleteChannel}
      onDeleteEvent={logic.onDeleteEvent}
      onUpdateEvent={logic.onUpdateEvent}
    >
      <div className={`flex h-full md:pb-0 relative bg-void overflow-hidden font-sans text-fog ${logic.mobileShowChat ? 'pb-0' : 'pb-20'}`}>
        
        {logic.toastMessage && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full flex items-center gap-2 text-white shadow-xl">
                    <div className="bg-mint/20 p-1 rounded-full text-mint"><Check size={12} strokeWidth={3} /></div>
                    <span className="text-sm font-medium">{logic.toastMessage}</span>
                </div>
            </div>
        )}

        <div className={`${logic.mobileShowChat ? 'hidden' : 'flex'} md:flex-none md:w-auto shrink-0 min-w-0 md:flex`}>
            <CommunityRail 
              communities={communities}
              selectedId={logic.selectedId}
              onSelect={logic.handleSelectCommunity}
              onAdd={() => setShowCreateCommunity(true)}
              onDiscover={() => setShowDiscovery(true)}
            />
        </div>

        {logic.selectedCommunity ? (
          <div className={`flex-1 flex min-w-0 h-full bg-void`}>
              <div className={`${logic.mobileShowChat ? 'hidden' : 'flex'} md:flex-none md:w-auto md:shrink-0 min-w-0 md:flex flex-1`}>
                  <CommunitySidebar onBack={() => {}} />
              </div>
              <CommunityMainArea />
          </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                <p>Select a community to begin</p>
            </div>
        )}

        {showCreateCommunity && (
            <CreateCommunityModal 
                onClose={() => setShowCreateCommunity(false)} 
                onSubmit={handleCreateCommunitySubmit}
                onJoinViaLink={handleJoinViaLink}
            />
        )}
        {showDiscovery && (
          <DiscoveryModal 
              communities={discoverableCommunities} 
              onClose={() => setShowDiscovery(false)} 
              onSelect={(id) => {
                  if (onJoinCommunity) onJoinCommunity(id);
                  setShowDiscovery(false);
                  logic.showToast("Community Joined!");
              }} 
          />
        )}
        {showCreateEvent && (
            <CreateEventModal 
              onClose={() => setShowCreateEvent(false)} 
              onSubmit={handleCreateEventSubmit}
              spots={logic.selectedCommunity ? (logic.selectedCommunity.spots || []) : []} 
            />
        )}
        {showCommunityMap && logic.selectedCommunity && (
            <CreateSpotModal 
              onClose={() => setShowCommunityMap(false)}
              onSubmit={handleCreateSpotSubmit}
              onUpdate={handleUpdateSpot}
              onDelete={handleDeleteSpot}
              initialCenter={logic.selectedCommunity.location.coordinates}
              existingSpots={logic.selectedCommunity.spots || []}
              privateGroups={logic.userPrivateGroups}
            />
        )}
        {showCommunitySettings && logic.selectedCommunity && (
            <ServerSettingsModal 
                community={logic.selectedCommunity}
                onClose={() => setShowCommunitySettings(false)}
                onSubmit={handleUpdateCommunity}
            />
        )}
        {logic.showCreateChannel && (
            <CreateChannelModal
                onClose={logic.closeCreateChannelModal}
                onSubmit={logic.handleCreateChannel}
                existingCategories={getExistingCategories()}
            />
        )}
        {logic.showCreateCategory && (
            <CreateCategoryModal 
                onClose={logic.closeCreateCategoryModal}
                onSubmit={logic.createCategory}
            />
        )}
        {logic.showInvitePeople && logic.selectedCommunity && (
            <InvitePeopleModal 
                community={logic.selectedCommunity} 
                onClose={logic.closeInvitePeopleModal}
            />
        )}
      </div>
    </CommunityProvider>
  );
};
