
import React, { createContext, useContext, ReactNode } from 'react';
import { Community, Event, MapEntity, PrivateGroup, ChatSummary, Channel, CommunityRole } from '../../../types';
import { ViewMode } from '../hooks/useCommunityLogic.ts';

interface CommunityContextProps {
  // Data
  selectedCommunity: Community | null;
  allCommunities: Community[];
  joinedCommunities: Community[];
  communityEvents: Event[];
  selectedEvent?: Event;
  friendsInCommunity: any[]; // User type
  activeGatherings: MapEntity[];
  buzzGatherings: MapEntity[];
  userPrivateGroups: PrivateGroup[];
  privateGatherings: MapEntity[];
  activeChannelChat: ChatSummary | null;
  connectedLocalCommunities: Community[];
  userRole: CommunityRole; // NEW: Current user's role
  
  // State
  viewMode: ViewMode;
  activeChannel: string;
  selectedEventId: string | null;
  selectedPrivateGroupId: string | null;
  mobileShowChat: boolean;
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  setActiveChannel: (channel: string) => void;
  setSelectedEventId: (id: string | null) => void;
  setSelectedPrivateGroupId: (id: string | null) => void;
  handleBackFromChat: () => void;
  
  // Navigation
  onNavigateToChat: (chatId: string) => void;
  onSelectCommunity: (id: string) => void;
  onMobileChatOpen: (isOpen: boolean) => void;
  onJoinCommunity?: (id: string) => void;
  onLeaveCommunity: () => void;
  onDeleteCommunity: () => void;
  
  // Modals
  openCreateEventModal: () => void;
  openCommunityMapModal: () => void;
  openDiscoveryModal: () => void;
  openCreateCommunityModal: () => void;
  openCommunitySettingsModal: () => void;
  openCreateChannelModal: () => void;
  openCreateCategoryModal: () => void;
  openInvitePeopleModal: () => void;
  
  // Domain Actions
  onCreatePrivateTag: (name: string) => void;
  onUpdatePrivateGroup: (groupId: string, name: string) => void;
  onDeletePrivateGroup: (groupId: string) => void;
  onCreatePrivateChannel: (groupId: string, name: string) => void;
  onUpdateChannel: (channelId: string, data: Partial<Channel>) => void;
  onDeleteChannel: (channelId: string) => void;
  createCategory: (categoryName: string) => void;
  onToggleRsvp: (eventId: string) => void;
  onJoinEventChat?: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateEvent: (eventId: string, data: Partial<Event>) => void;
}

const CommunityContext = createContext<CommunityContextProps | undefined>(undefined);

export const useCommunityContext = () => {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunityContext must be used within a CommunityProvider');
  }
  return context;
};

interface CommunityProviderProps extends CommunityContextProps {
  children: ReactNode;
}

// Just a passthrough provider to inject values from the hook
export const CommunityProvider: React.FC<CommunityProviderProps> = ({ children, ...props }) => {
  return (
    <CommunityContext.Provider value={props}>
      {children}
    </CommunityContext.Provider>
  );
};
