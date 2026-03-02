
import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Map as MapIcon, Users } from 'lucide-react';
import { DataProvider, useData } from './context/DataContext';
import { TutorialProvider, useTutorial } from './context/TutorialContext';
import { MonetizationProvider } from './context/MonetizationContext';
import { Onboarding } from './features/onboarding/Onboarding';
import { MapVisualizer } from './features/map/MapVisualizer';
import { ChatList, ChatDetail } from './features/chat';
import { CommunityInterface } from './features/community/CommunityInterface';
import { NavButton } from './components/ui/NavButton';
import { CreateEventModal } from './features/community/components/modals/CreateEventModal';
import { UpgradeModal } from './features/monetization/components/UpgradeModal';
import { ServerSupportModal } from './features/monetization/components/ServerSupportModal';
import { ManagePlacesModal } from './features/settings/ManagePlacesModal';
import { TutorialOverlay } from './components/ui/TutorialOverlay';
import { useMapProjection } from './hooks/useMapProjection';
import { User } from './types';

type AppState = 'ONBOARDING' | 'APP';

enum Tab {
  MAP = 'MAP',
  CHATS = 'CHATS',
  COMMUNITIES = 'COMMUNITIES'
}

// Inner component to consume the Contexts
const InnerApp: React.FC = () => {
  const { activeTutorial, triggerTutorial, dismissTutorial, resetTutorials, enableTutorials } = useTutorial();
  const data = useData(); 

  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('us_app_state');
    return (saved as AppState) || 'APP';
  });

  const [activeTab, setActiveTab] = useState<Tab>(Tab.MAP);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  const ghostMode = !(data.currentUser.settings?.globalLocationSharing ?? true);
  const [chatViewMode, setChatViewMode] = useState<'MESSAGES' | 'EVENTS'>('MESSAGES');
  
  // Navigation State for Deep Linking
  const [targetEventId, setTargetEventId] = useState<string | null>(null);
  const [targetCommunityId, setTargetCommunityId] = useState<string | null>(null);
  const [targetChannelId, setTargetChannelId] = useState<string | null>(null);
  const [targetPrivateGroupId, setTargetPrivateGroupId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number } | null>(null);

  // Global Modal States
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [serverSupportTargetId, setServerSupportTargetId] = useState<string | null>(null);
  const [managePlacesTargetId, setManagePlacesTargetId] = useState<string | null>(null);

  // Listen for global events
  useEffect(() => {
    const handleOpenUpgrade = () => setShowUpgradeModal(true);
    const handleOpenSupport = (e: any) => setServerSupportTargetId(e.detail);
    const handleFocus = (e: CustomEvent) => {
        setMapFocus(e.detail);
        setActiveTab(Tab.MAP);
    };
    const handleEditUserSpot = (e: CustomEvent) => {
        setManagePlacesTargetId(e.detail);
    };
    
    window.addEventListener('open-upgrade-modal', handleOpenUpgrade);
    window.addEventListener('open-server-support-modal', handleOpenSupport);
    window.addEventListener('view-map-location', handleFocus as EventListener);
    window.addEventListener('edit-user-spot', handleEditUserSpot as EventListener);
    
    return () => {
        window.removeEventListener('open-upgrade-modal', handleOpenUpgrade);
        window.removeEventListener('open-server-support-modal', handleOpenSupport);
        window.removeEventListener('view-map-location', handleFocus as EventListener);
        window.removeEventListener('edit-user-spot', handleEditUserSpot as EventListener);
    };
  }, []);

  // Persistence for app state
  useEffect(() => {
    localStorage.setItem('us_app_state', appState);
  }, [appState]);

  // Accessibility settings application
  useEffect(() => {
    const root = document.documentElement;
    const settings = data.currentUser.settings;
    if (settings?.fontSize === 'SMALL') root.style.fontSize = '14px';
    else if (settings?.fontSize === 'LARGE') root.style.fontSize = '18px';
    else root.style.fontSize = '16px'; 
    if (settings?.reducedMotion) root.classList.add('reduced-motion');
    else root.classList.remove('reduced-motion');
    if (settings?.highContrast) root.classList.add('high-contrast');
    else root.classList.remove('high-contrast');
  }, [data.currentUser.settings]);

  // --- TUTORIAL TRIGGERS ---
  // Start the tutorial chain when entering the app
  useEffect(() => {
      if (appState === 'APP') {
          const timer = setTimeout(() => {
              triggerTutorial('welcome_map');
          }, 1000);
          return () => clearTimeout(timer);
      }
  }, [appState, triggerTutorial]);

  const derivedMapNodes = useMapProjection({
      users: data.users, 
      events: data.events,
      communities: data.communities,
      chats: data.chats, 
      joinedCommunityIds: data.joinedCommunityIds,
      currentUser: data.currentUser,
      userLocations: data.userLocations 
  });

  const joinedCommunities = useMemo(() => 
    data.communities.filter(c => data.joinedCommunityIds.includes(c.id)), 
  [data.communities, data.joinedCommunityIds]);

  const discoverableCommunities = useMemo(() => {
      return data.communities.filter(c => c.type === 'TOPIC' || !data.joinedCommunityIds.includes(c.id));
  }, [data.communities, data.joinedCommunityIds]);

  const selectedChat = useMemo(() => {
      if (!selectedChatId) return null;
      return data.chats.find(c => c.id === selectedChatId) || null;
  }, [data.chats, selectedChatId]);

  const handleNavigateToChat = (chatId: string) => {
      const gatheringNode = derivedMapNodes.find(n => n.type === 'GATHERING' && n.chatId === chatId);
      if (gatheringNode && gatheringNode.communityId) {
           setTargetCommunityId(gatheringNode.communityId);
           setTargetChannelId(chatId);
           setTargetPrivateGroupId(gatheringNode.privateGroupId || null);
           setActiveTab(Tab.COMMUNITIES);
           return;
      } 
      const chat = data.chats.find(c => c.id === chatId);
      if (chat) {
          setSelectedChatId(chat.id);
          setActiveTab(Tab.CHATS);
      }
  };

  const handleCreateChat = (friend: User) => {
      const newChat = data.createChat(friend);
      setSelectedChatId(newChat.id);
      setActiveTab(Tab.CHATS);
  };

  const handleStartOnboarding = () => {
    setAppState('ONBOARDING');
  };

  // Chain-based tutorial dismissal
  const handleTutorialAction = () => {
      const currentId = activeTutorial?.id;
      dismissTutorial();

      if (currentId === 'welcome_map') {
          setTimeout(() => triggerTutorial('nav_communities'), 400);
      } else if (currentId === 'nav_communities') {
          setTimeout(() => triggerTutorial('nav_chats'), 400);
      } else if (currentId === 'nav_chats') {
          setTimeout(() => triggerTutorial('ghost_mode'), 400);
      }
  };

  if (appState === 'ONBOARDING') {
    return <Onboarding onComplete={() => {
        setAppState('APP');
        setActiveTab(Tab.MAP); 
        resetTutorials();      
        enableTutorials();     
    }} />;
  }

  return (
    <div className="flex flex-col h-screen bg-void text-fog font-sans overflow-hidden">
      <main className="flex-1 relative overflow-hidden">
        {activeTab === Tab.MAP && (
          <div className="h-full w-full animate-in fade-in duration-500">
            <MapVisualizer 
              nodes={derivedMapNodes}
              userSpots={data.currentUser.userSpots}
              ghostMode={ghostMode}
              toggleGhostMode={data.toggleLocationSharing}
              onJoinGathering={handleNavigateToChat}
              onCreateGroupChat={(friends) => {
                  const newChat = data.createGroupChat("Map Group", friends);
                  setSelectedChatId(newChat.id);
                  setActiveTab(Tab.CHATS);
              }}
              onStartDirectMessage={(friendId: string) => {
                  const friend = data.users.find(u => u.id === friendId);
                  if (friend) handleCreateChat(friend);
              }}
              onViewEvent={(id) => {
                  setTargetEventId(id);
                  setActiveTab(Tab.COMMUNITIES);
              }}
              centerOnNode={mapFocus || undefined}
            />
          </div>
        )}

        {activeTab === Tab.CHATS && (
          <div className="flex h-full animate-in slide-in-from-left-4 duration-300">
            <div className={`w-full md:w-80 h-full border-r border-white/5 ${selectedChatId ? 'hidden md:block' : 'block'}`}>
              <ChatList 
                chats={data.chats} 
                events={data.events}
                friends={data.users}
                friendRequests={data.friendRequests}
                joinedCommunityIds={data.joinedCommunityIds}
                viewMode={chatViewMode}
                onViewModeChange={setChatViewMode}
                onSelectChat={(chat) => setSelectedChatId(chat.id)}
                onSelectEvent={(id) => {
                    setTargetEventId(id);
                    setActiveTab(Tab.COMMUNITIES);
                }}
                onCreateChat={handleCreateChat}
                onCreateGroup={(name: string, friendIds: string[]) => {
                  const selectedMembers = data.users.filter(u => friendIds.includes(u.id));
                  data.createGroupChat(name, selectedMembers);
                }}
                onCreateEvent={() => setIsCreatingEvent(true)}
                onAcceptFriendRequest={data.acceptFriendRequest}
                onAddFriend={data.addFriend}
                onLogout={() => { setAppState('ONBOARDING'); setSelectedChatId(null); }}
                onRestartOnboarding={handleStartOnboarding}
                selectedId={selectedChatId}
              />
            </div>
            <div className={`flex-1 h-full ${selectedChatId ? 'block' : 'hidden md:flex md:items-center md:justify-center md:bg-white/[0.02]'}`}>
              {selectedChat ? (
                <ChatDetail 
                    chat={selectedChat} 
                    onBack={() => setSelectedChatId(null)} 
                    onPromote={() => {}}
                    events={data.events}
                />
              ) : (
                <div className="text-gray-500 flex flex-col items-center gap-4">
                  <div className="p-4 bg-white/5 rounded-full"><MessageSquare size={48} className="opacity-20" /></div>
                  <p className="font-medium">Select a conversation to start chatting</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === Tab.COMMUNITIES && (
          <div className="h-full animate-in slide-in-from-right-4 duration-300">
            <CommunityInterface 
                communities={joinedCommunities}
                allCommunities={data.communities}
                events={data.events}
                onNavigateToChat={handleNavigateToChat}
                onCreateEvent={data.createEvent}
                onToggleRsvp={data.toggleRsvp}
                targetEventId={targetEventId}
                targetCommunityId={targetCommunityId}
                targetChannelId={targetChannelId}
                targetPrivateGroupId={targetPrivateGroupId}
                discoverableCommunities={discoverableCommunities}
                onJoinCommunity={data.joinCommunity}
                onCreateCommunity={data.createCommunity}
                onUpdateCommunity={data.updateCommunity}
                mapNodes={derivedMapNodes}
            />
          </div>
        )}
      </main>

      <nav className="h-20 bg-void/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-6 pb-2 shrink-0 z-40 relative">
        <NavButton 
            active={activeTab === Tab.CHATS} 
            onClick={() => {
                setActiveTab(Tab.CHATS);
                dismissTutorial();
                setTimeout(() => triggerTutorial('add_friend'), 500);
            }} 
            icon={<MessageSquare size={24} />} 
            label="Chats" 
        />
        <NavButton 
            active={activeTab === Tab.MAP} 
            onClick={() => {
                setActiveTab(Tab.MAP);
                dismissTutorial();
            }} 
            icon={<MapIcon size={24} />} 
            label="Map" 
        />
        <NavButton 
            active={activeTab === Tab.COMMUNITIES} 
            onClick={() => {
                setActiveTab(Tab.COMMUNITIES);
                dismissTutorial();
            }} 
            icon={<Users size={24} />} 
            label="Communities" 
        />
      </nav>

      {/* Global Modals */}
      {isCreatingEvent && (
          <CreateEventModal 
              onClose={() => setIsCreatingEvent(false)} 
              onSubmit={(eventData) => {
                  data.createEvent(eventData);
                  setIsCreatingEvent(false);
                  // Optionally navigate to event view or show toast
              }}
              selectableCommunities={joinedCommunities}
          />
      )}

      {showUpgradeModal && (
          <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}

      {serverSupportTargetId && (
          <ServerSupportModal 
              communityId={serverSupportTargetId} 
              onClose={() => setServerSupportTargetId(null)} 
          />
      )}

      {managePlacesTargetId && (
          <ManagePlacesModal 
              onClose={() => setManagePlacesTargetId(null)} 
              initialEditId={managePlacesTargetId}
          />
      )}

      {activeTutorial && (
        <TutorialOverlay 
          tutorial={activeTutorial} 
          onDismiss={handleTutorialAction} 
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <MonetizationProvider>
        <TutorialProvider>
          <InnerApp />
        </TutorialProvider>
      </MonetizationProvider>
    </DataProvider>
  );
};

export default App;
