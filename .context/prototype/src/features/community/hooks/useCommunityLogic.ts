
import { useState, useMemo, useEffect } from 'react';
import { Community, Event, ChatSummary, Channel, MapEntity, PrivateGroup, CommunitySpot, CommunityRole } from '../../../types';
import { MOCK_FRIENDS, CURRENT_USER } from '../../../data/users';
import { useData } from '../../../context/DataContext';

export type ViewMode = 'OPEN' | 'EVENTS' | 'GATHERINGS' | 'PRIVATE' | 'HAPPENINGS' | 'LOCAL_COMMUNITIES';

export const useCommunityLogic = (
    communities: Community[], // Joined 
    allCommunities: Community[], // All available (for Buzz)
    events: Event[],
    onMobileChatOpen?: (isOpen: boolean) => void,
    targetEventId?: string | null,
    targetCommunityId?: string | null,
    targetChannelId?: string | null,
    targetPrivateGroupId?: string | null,
    initialPrivateGroups: PrivateGroup[] = [],
    mapNodes: MapEntity[] = [] // New Prop: Injectable Nodes
) => {
  const { 
      currentUser,
      leaveCommunity, 
      deleteCommunity, 
      createChannel, 
      updateChannel, 
      deleteChannel,
      createCategory, // NEW
      createCommunitySpot,
      updateCommunitySpot,
      deleteCommunitySpot,
      createPrivateGroup,
      updatePrivateGroup,
      deletePrivateGroup,
      createPrivateChannel,
      deleteEvent,
      updateEvent
  } = useData();
  
  // --- INDEXING ---
  // Create O(1) lookups from the passed mapNodes prop
  const { NODES_BY_COMMUNITY, NODES_BY_PRIVATE_GROUP } = useMemo(() => {
      const byCom: Record<string, MapEntity[]> = {};
      const byPg: Record<string, MapEntity[]> = {};
      
      mapNodes.forEach(node => {
          if (node.communityId) {
              if (!byCom[node.communityId]) byCom[node.communityId] = [];
              byCom[node.communityId].push(node);
          }
          if (node.privateGroupId) {
              if (!byPg[node.privateGroupId]) byPg[node.privateGroupId] = [];
              byPg[node.privateGroupId].push(node);
          }
      });
      
      return { NODES_BY_COMMUNITY: byCom, NODES_BY_PRIVATE_GROUP: byPg };
  }, [mapNodes]);

  // --- INITIALIZATION HELPER ---
  const getInitialState = (): { id: string | null; mode: ViewMode } => {
      // Priority: User specifically requested "Malmö Ravers" or first local
      let target = communities.find(c => c.id === 'com_ravers') || communities.find(c => c.type === 'LOCAL') || communities[0];

      if (!target) return { id: null, mode: 'OPEN' };

      return {
          id: target.id,
          mode: target.type === 'TOPIC' ? 'HAPPENINGS' : 'OPEN'
      };
  };

  const initialState = getInitialState();

  // State
  const [selectedId, setSelectedId] = useState<string | null>(initialState.id);
  const [viewMode, setViewMode] = useState<ViewMode>(initialState.mode); 
  const [activeChannel, setActiveChannel] = useState('general');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modal State
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false); // NEW
  const [showInvitePeople, setShowInvitePeople] = useState(false); // NEW
  
  // State for Private Tags
  const [selectedPrivateGroupId, setSelectedPrivateGroupId] = useState<string | null>(null);
  
  // Use persistent private groups from DataContext
  const privateGroups = currentUser.privateGroups || [];

  // PERFORMANCE: Create a Set of joined IDs for O(1) lookup
  const joinedCommunityIdsSet = useMemo(() => new Set(communities.map(c => c.id)), [communities]);

  // Determine current selected community
  const selectedCommunity = useMemo(() => 
      communities.find(c => c.id === selectedId) || null
  , [communities, selectedId]);

  // --- ROLE LOGIC ---
  const userRole: CommunityRole = useMemo(() => {
      if (!selectedCommunity) return 'MEMBER';
      if (selectedCommunity.ownerId === currentUser.id) return 'OWNER';
      // Grant Admin privileges to Malmö Ravers and Rave topic
      if (selectedId === 'com_ravers' || selectedId === 'topic_rave') return 'ADMIN'; 
      return 'MEMBER';
  }, [selectedId, selectedCommunity, currentUser.id]);

  // Filter private groups for the selected community
  const communityPrivateGroups = useMemo(() => {
      if (!selectedId) return [];
      return privateGroups.filter(pg => pg.communityId === selectedId);
  }, [privateGroups, selectedId]);

  // --- AGGREGATION LOGIC ---
  
  // 1. Joined Contributing Communities
  const joinedContributingIds = useMemo(() => {
      if (!selectedCommunity) return [];
      
      if (selectedCommunity.type === 'LOCAL') {
          return [selectedCommunity.id];
      } else {
          // TOPIC: Filter only *joined* local communities tagged with this topic
          // Optimization: Check membership using the Set O(1)
          return communities
              .filter(c => c.type === 'LOCAL' && c.topicIds?.includes(selectedCommunity.id))
              .map(c => c.id);
      }
  }, [selectedCommunity, communities]); // Dependencies usually change rarely

  // 2. Buzz Contributing Communities (Topic Only, Obfuscated)
  const buzzContributingIds = useMemo(() => {
      if (!selectedCommunity || selectedCommunity.type === 'LOCAL') return [];
      
      // Optimization: Filter logic uses Set.has() O(1) instead of .find() O(N)
      // Complexity reduction: O(N*M) -> O(N)
      return allCommunities
          .filter(c => 
              c.type === 'LOCAL' && 
              c.topicIds?.includes(selectedCommunity.id) && 
              !joinedCommunityIdsSet.has(c.id) // O(1) lookup
          )
          .map(c => c.id);
  }, [selectedCommunity, allCommunities, joinedCommunityIdsSet]);

  // 3. Connected Local Communities (For Topic View "Locals" tab)
  const connectedLocalCommunities = useMemo(() => {
      if (!selectedCommunity || selectedCommunity.type === 'LOCAL') return [];

      return allCommunities.filter(c => 
          c.type === 'LOCAL' && 
          c.topicIds?.includes(selectedCommunity.id)
      );
  }, [selectedCommunity, allCommunities]);

  // Performance: Memoize the Set of contributing IDs to avoid frequent array includes()
  const joinedContributingIdsSet = useMemo(() => new Set(joinedContributingIds), [joinedContributingIds]);

  // 4. Active Gatherings (Joined - Public/Open)
  const activeGatherings = useMemo(() => {
      if (joinedContributingIdsSet.size === 0) return [];
      
      // SCALABILITY FIX: Use O(1) lookup instead of O(N) filter
      const gatherings: MapEntity[] = [];
      joinedContributingIds.forEach(comId => {
          const nodes = NODES_BY_COMMUNITY[comId];
          if (nodes) {
              // Ensure we exclude PRIVATE gatherings from the OPEN/PUBLIC list
              gatherings.push(...nodes.filter(n => n.type === 'GATHERING' && !n.privateGroupId));
          }
      });
      return gatherings;
  }, [joinedContributingIdsSet, joinedContributingIds, NODES_BY_COMMUNITY]);

  // 5. Buzz Gatherings (Unjoined)
  const buzzGatherings = useMemo(() => {
      if (buzzContributingIds.length === 0) return [];
      
      // SCALABILITY FIX: Use O(1) lookup
      const gatherings: MapEntity[] = [];
      buzzContributingIds.forEach(comId => {
          const nodes = NODES_BY_COMMUNITY[comId];
          if (nodes) {
              // Ensure we exclude PRIVATE gatherings from Buzz as well
              gatherings.push(...nodes.filter(n => n.type === 'GATHERING' && !n.privateGroupId));
          }
      });
      return gatherings;
  }, [buzzContributingIds, NODES_BY_COMMUNITY]);
  
  // 6. Private Gatherings
  const privateGatherings = useMemo(() => {
      if (!selectedPrivateGroupId) return [];
      // SCALABILITY FIX: Use O(1) lookup
      const nodes = NODES_BY_PRIVATE_GROUP[selectedPrivateGroupId];
      return nodes ? nodes.filter(n => n.type === 'GATHERING') : [];
  }, [selectedPrivateGroupId, NODES_BY_PRIVATE_GROUP]);

  // 7. Inject Gatherings as Channels
  const enrichedCommunity = useMemo(() => {
    if (!selectedCommunity) return null;
    if (selectedCommunity.type === 'TOPIC') return selectedCommunity;

    // Filter activeGatherings to only those belonging to THIS community
    const localGatherings = activeGatherings.filter(g => g.communityId === selectedCommunity.id);

    if (localGatherings.length > 0) {
        const gatheringChannels: Channel[] = localGatherings.map(g => ({
            id: g.chatId || `g-temp-${g.id}`,
            name: g.data.name,
            type: 'text',
            category: 'Live Gatherings'
        }));
        
        return {
            ...selectedCommunity,
            channels: [...gatheringChannels, ...selectedCommunity.channels]
        };
    }

    return selectedCommunity;
  }, [selectedCommunity, activeGatherings]);

  // 8. Aggregate Events
  const communityEvents = useMemo(() => 
    events.filter(e => joinedContributingIdsSet.has(e.communityId))
  , [events, joinedContributingIdsSet]);

  const selectedEvent = useMemo(() => 
    events.find(e => e.id === selectedEventId)
  , [events, selectedEventId]);

  // Friends Calculation
  const friendsInCommunity = useMemo(() => {
      if (joinedContributingIdsSet.size === 0) return [];
      
      // SCALABILITY FIX: Retrieve friend nodes via Index instead of full scan
      const visibleFriendIds = new Set<string>();
      
      joinedContributingIds.forEach(comId => {
          const nodes = NODES_BY_COMMUNITY[comId];
          if (nodes) {
              nodes.forEach(n => {
                  if (n.type === 'FRIEND') {
                      visibleFriendIds.add(n.id.replace('node-', ''));
                  }
              });
          }
      });

      return MOCK_FRIENDS.filter(f => visibleFriendIds.has(f.id));
  }, [joinedContributingIds, joinedContributingIdsSet, NODES_BY_COMMUNITY]);

  // Chat Summary Construction
  const activeChannelChat: ChatSummary | null = useMemo(() => {
      // 1. Private Context
      if (selectedPrivateGroupId) {
          const group = privateGroups.find(g => g.id === selectedPrivateGroupId);
          
          const privateChannelMatch = group?.channels?.find(c => c.name === activeChannel || c.id === activeChannel);
          if (privateChannelMatch) {
              return {
                  id: privateChannelMatch.id,
                  name: privateChannelMatch.name,
                  avatarUrl: `https://ui-avatars.com/api/?name=${group?.name || 'P'}&background=random`,
                  lastMessage: 'Private channel',
                  timestamp: 'Now',
                  unreadCount: 0,
                  type: 'GROUP',
                  memberIds: ['u_demo_1']
              };
          }

          const privateGatheringMatch = privateGatherings.find(g => g.chatId === activeChannel || g.data.name === activeChannel);
          if (privateGatheringMatch) {
               // Resolve members from the map node data
               const presentMembers = (privateGatheringMatch.data.members || []) as any[];
               const memberIds = presentMembers.map(u => u.id);

               return {
                  id: privateGatheringMatch.chatId || `pg-chat-${privateGatheringMatch.id}`,
                  name: privateGatheringMatch.data.name,
                  avatarUrl: `https://ui-avatars.com/api/?name=${selectedPrivateGroupId}&background=random`, 
                  lastMessage: 'Private gathering.',
                  timestamp: 'Now',
                  unreadCount: 0,
                  type: 'GATHERING',
                  memberIds: memberIds, // Use Dynamic IDs
                  fixedLocation: privateGatheringMatch.location // INJECT LOCATION
              };
          }
      }

      // 2. Public Context
      if (!enrichedCommunity) return null;
      if (enrichedCommunity.type === 'TOPIC') return null; 

      const gatheringMatch = activeGatherings.find(g => g.chatId === activeChannel || g.data.name === activeChannel); 
      
      if (gatheringMatch) {
          // Resolve members from the map node data
          const presentMembers = (gatheringMatch.data.members || []) as any[];
          const memberIds = presentMembers.map(u => u.id);

          return {
              id: gatheringMatch.chatId || `g-chat-${gatheringMatch.id}`,
              name: gatheringMatch.data.name,
              avatarUrl: enrichedCommunity.iconUrl,
              lastMessage: 'Join us at the location!',
              timestamp: 'Now',
              unreadCount: 0,
              type: 'GATHERING',
              memberIds: memberIds, // Use Dynamic IDs
              fixedLocation: gatheringMatch.location // INJECT LOCATION
          };
      }
      
      // 3. Standard Channel
      const realFriendIds = friendsInCommunity.map(f => f.id);
      // Memoize the member IDs to avoid array recreation
      const allMemberIds = ['u_nf_1', 'u_nf_2', 'u_nf_3', ...realFriendIds];

      return {
          id: `channel-${enrichedCommunity.id}-${activeChannel}`,
          name: activeChannel.startsWith('#') ? activeChannel : `# ${activeChannel}`,
          avatarUrl: enrichedCommunity.iconUrl,
          lastMessage: '',
          timestamp: 'Now',
          unreadCount: 0,
          type: 'GROUP',
          memberIds: allMemberIds
      };
  }, [enrichedCommunity, activeChannel, friendsInCommunity, activeGatherings, selectedPrivateGroupId, privateGatherings, privateGroups]);

  // Handlers (truncated for brevity - identical to previous)
  // ... (rest of the file remains the same, only activeChannelChat injection changed)
  
  const handleSelectCommunity = (id: string | null) => {
      if (id === selectedId) return; // Prevent unnecessary updates

      setSelectedId(id);
      setSelectedPrivateGroupId(null);

      const target = communities.find(c => c.id === id);
      if (target?.type === 'TOPIC') {
          setViewMode('HAPPENINGS');
      } else {
          setViewMode('OPEN');
      }

      setSelectedEventId(null);
      setMobileShowChat(false);
      
      if (target?.type === 'LOCAL' && target.channels.length > 0) {
          setActiveChannel('general'); 
      }
      if (onMobileChatOpen) onMobileChatOpen(false);
  };

  const handleChannelClick = (identifier: string, type: 'text' | 'voice') => {
      if (type === 'text') {
          setActiveChannel(identifier);
          setMobileShowChat(true);
          if (onMobileChatOpen) onMobileChatOpen(true);
      }
  };

  const handleBackFromChat = () => {
      setMobileShowChat(false);
      if (onMobileChatOpen) onMobileChatOpen(false);
  };

  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
  };
  
  const handleCreatePrivateGroup = (name: string) => {
      if (!selectedId) return;
      createPrivateGroup(selectedId, name);
      showToast("Group created");
  };

  const handleUpdatePrivateGroup = (groupId: string, name: string) => {
      if (!name.trim()) return;
      updatePrivateGroup(groupId, name.trim());
      showToast("Group updated");
  };

  const handleDeletePrivateGroup = (groupId: string) => {
      if (window.confirm("Delete this group and its channels?")) {
          deletePrivateGroup(groupId);
          if (selectedPrivateGroupId === groupId) {
              setSelectedPrivateGroupId(null);
          }
          showToast("Group deleted");
      }
  };

  const handleCreatePrivateChannel = (groupId: string, channelName: string) => {
      createPrivateChannel(groupId, channelName);
      showToast("Channel created");
  };

  const handleLeaveCommunity = () => {
      if (selectedId) {
          if (window.confirm("Are you sure you want to leave this community?")) {
              leaveCommunity(selectedId);
              setSelectedId(null); // Deselect
              showToast("Left community");
          }
      }
  };

  const handleDeleteCommunity = () => {
      if (selectedId) {
          if (window.confirm("Are you sure you want to delete this community? This action cannot be undone.")) {
              deleteCommunity(selectedId);
              setSelectedId(null); // Deselect
              showToast("Community deleted");
          }
      }
  };

  const handleCreateChannel = (data: { name: string; type: 'text' | 'voice'; category: string }) => {
      if (selectedId) {
          createChannel(selectedId, data);
          setShowCreateChannel(false);
          showToast("Channel created");
      }
  };

  const handleCreateCategory = (categoryName: string) => {
      if (selectedId && categoryName) {
          createCategory(selectedId, categoryName);
          setShowCreateCategory(false);
          showToast("Category created");
      }
  };

  const handleUpdateChannel = (channelId: string, data: Partial<Channel>) => {
      if (selectedId) {
          updateChannel(selectedId, channelId, data);
          
          if (data.name) {
              const newName = data.name.trim();
              if (newName) {
                  // If active channel name matches (normalized), update selection to stay on it
                  const oldName = activeChannel.replace(/^#\s?/, '');
                  if (enrichedCommunity) {
                     const ch = enrichedCommunity.channels.find(c => c.id === channelId);
                     if (ch && (ch.name === oldName || ch.name === activeChannel)) {
                         setActiveChannel(newName);
                     }
                  }
                  showToast("Channel renamed");
              }
          } else if (data.notificationSettings) {
              showToast(`Notifications: ${data.notificationSettings.toLowerCase()}`);
          }
      }
  };

  const handleDeleteChannel = (channelId: string) => {
      if (selectedId) {
          if (window.confirm("Are you sure you want to delete this channel?")) {
              deleteChannel(selectedId, channelId);
              if (activeChannel !== 'general') {
                  setActiveChannel('general');
              }
              showToast("Channel deleted");
          }
      }
  };

  const handleCreateSpot = (data: Omit<CommunitySpot, 'id' | 'communityId'>) => {
      if (selectedId) {
          createCommunitySpot(selectedId, data);
          showToast("Spot created");
      }
  };

  const handleUpdateSpot = (spotId: string, data: Partial<CommunitySpot>) => {
      if (selectedId) {
          updateCommunitySpot(selectedId, spotId, data);
          showToast("Spot updated");
      }
  };

  const handleDeleteSpot = (spotId: string) => {
      if (selectedId) {
          if (window.confirm("Are you sure you want to delete this spot?")) {
              deleteCommunitySpot(selectedId, spotId);
              showToast("Spot deleted");
          }
      }
  };

  const handleDeleteEvent = (eventId: string) => {
      if (window.confirm("Are you sure you want to delete this event?")) {
          deleteEvent(eventId);
          if (selectedEventId === eventId) setSelectedEventId(null);
          showToast("Event deleted");
      }
  };

  const handleUpdateEvent = (eventId: string, data: Partial<Event>) => {
      updateEvent(eventId, data);
      showToast("Event updated");
  };

  // Init
  useEffect(() => {
      if (!selectedId && communities.length > 0) {
          const ravers = communities.find(c => c.id === 'com_ravers');
          const local = communities.find(c => c.type === 'LOCAL');
          const target = ravers || local || communities[0];
          if (target) handleSelectCommunity(target.id);
      }
  }, [communities]);

  // Deep Link Event
  useEffect(() => {
      if (targetEventId && targetEventId !== selectedEventId) {
          const event = events.find(e => e.id === targetEventId);
          if (event) {
              setSelectedId(event.communityId);
              setViewMode('HAPPENINGS'); 
              setSelectedEventId(event.id);
              setMobileShowChat(false);
          }
      }
  }, [targetEventId, events]);

  // Deep Link Community/Channel/Private
  useEffect(() => {
      if (!targetCommunityId && !targetPrivateGroupId) return;

      if (targetCommunityId && targetCommunityId !== selectedId) {
          setSelectedId(targetCommunityId);
      }

      if (targetPrivateGroupId) {
           setSelectedPrivateGroupId(targetPrivateGroupId);
           setViewMode('PRIVATE'); 
           
           if (targetChannelId && targetChannelId !== activeChannel) {
               const group = privateGroups.find(g => g.id === targetPrivateGroupId);
               const gathering = mapNodes.find(n => n.chatId === targetChannelId && n.privateGroupId === targetPrivateGroupId);
               
               if (gathering) {
                   setActiveChannel(gathering.chatId || gathering.data.name); 
               } else {
                   const channel = group?.channels?.find(c => c.id === targetChannelId);
                   if (channel) setActiveChannel(channel.name);
               }
               setMobileShowChat(true);
               if (onMobileChatOpen) onMobileChatOpen(true);
           }
      } else if (targetCommunityId) {
          setSelectedPrivateGroupId(null);
          
          if (targetChannelId && targetChannelId !== activeChannel) {
              const gathering = mapNodes.find(n => n.type === 'GATHERING' && n.chatId === targetChannelId);
              setActiveChannel(gathering ? (gathering.chatId || gathering.data.name) : 'general');
              setMobileShowChat(true);
              if (onMobileChatOpen) onMobileChatOpen(true);
          } else if (!targetChannelId && !mobileShowChat) {
              const target = communities.find(c => c.id === targetCommunityId);
              if (target?.type === 'TOPIC') setViewMode('HAPPENINGS');
              else setViewMode('OPEN');
          }
      }
  }, [targetCommunityId, targetChannelId, targetPrivateGroupId, privateGroups]);

  return {
      selectedId,
      viewMode, setViewMode,
      activeChannel,
      selectedEventId, setSelectedEventId,
      mobileShowChat,
      toastMessage,
      selectedPrivateGroupId, setSelectedPrivateGroupId,
      selectedCommunity: enrichedCommunity, 
      userRole, // Expose Role
      communityEvents,
      selectedEvent,
      friendsInCommunity,
      activeChannelChat,
      activeGatherings, 
      buzzGatherings,
      privateGatherings,
      userPrivateGroups: communityPrivateGroups,
      connectedLocalCommunities,
      handleSelectCommunity,
      handleChannelClick,
      handleBackFromChat,
      showToast,
      handleCreateTag: handleCreatePrivateGroup,
      onUpdatePrivateGroup: handleUpdatePrivateGroup,
      onDeletePrivateGroup: handleDeletePrivateGroup,
      handleCreatePrivateChannel,
      onLeaveCommunity: handleLeaveCommunity,
      onDeleteCommunity: handleDeleteCommunity,
      showCreateChannel,
      openCreateChannelModal: () => setShowCreateChannel(true),
      closeCreateChannelModal: () => setShowCreateChannel(false),
      handleCreateChannel,
      showCreateCategory,
      openCreateCategoryModal: () => setShowCreateCategory(true),
      closeCreateCategoryModal: () => setShowCreateCategory(false),
      createCategory: handleCreateCategory,
      showInvitePeople, 
      openInvitePeopleModal: () => setShowInvitePeople(true), 
      closeInvitePeopleModal: () => setShowInvitePeople(false), 
      onUpdateChannel: handleUpdateChannel,
      onDeleteChannel: handleDeleteChannel,
      handleCreateSpot,
      handleUpdateSpot,
      handleDeleteSpot,
      onDeleteEvent: handleDeleteEvent,
      onUpdateEvent: handleUpdateEvent
  };
};
