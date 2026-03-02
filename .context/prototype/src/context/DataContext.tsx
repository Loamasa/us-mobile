import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, ChatSummary, Message, Community, Event, FriendRequest, UserLocationContext, PrivateGroup, Attachment, UserSpot, UserSignal, CommunitySpot, Channel, CommunityInvite } from '../types';
import { CURRENT_USER, MOCK_FRIENDS, MOCK_FRIEND_REQUESTS, GROUP_MEMBER_IDS } from '../data/users';
import { MOCK_CHATS, MOCK_MESSAGES } from '../data/chats';
import { MOCK_COMMUNITIES, MOCK_EVENTS } from '../data/communities';
import { USER_POOL } from '../data/userPool';

interface DataContextType {
  currentUser: User;
  users: User[]; // Friends list
  chats: ChatSummary[];
  messages: Record<string, Message[]>;
  communities: Community[];
  joinedCommunityIds: string[];
  events: Event[];
  friendRequests: FriendRequest[];
  userLocations: Record<string, UserLocationContext>;
  invites: CommunityInvite[];
  closeFriendIds: string[];

  // Actions
  createChat: (friend: User) => ChatSummary;
  createGroupChat: (name: string, members: User[]) => ChatSummary;
  sendMessage: (chatId: string, text: string, attachments?: Attachment[], replyToId?: string) => void;
  addReaction: (chatId: string, messageId: string, emoji: string) => void;
  editMessage: (chatId: string, messageId: string, newContent: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  deleteChat: (chatId: string) => void;
  clearChatHistory: (chatId: string) => void;
  archiveChat: (chatId: string) => void;
  unarchiveChat: (chatId: string) => void;
  updateChat: (chatId: string, data: Partial<ChatSummary>) => void;

  createEvent: (eventData: any) => void;
  updateEvent: (eventId: string, data: Partial<Event>) => void;
  deleteEvent: (eventId: string) => void;
  toggleRsvp: (eventId: string) => void;
  cancelEvent: (eventId: string, reason: string) => void;

  joinCommunity: (id: string) => void;
  joinCommunityViaLink: (code: string) => boolean;
  createCommunity: (data: any) => void;
  updateCommunity: (id: string, data: Partial<Community>) => void;
  deleteCommunity: (id: string) => void;
  leaveCommunity: (id: string) => void;
  transferOwnership: (communityId: string, newOwnerId: string) => void;

  createChannel: (communityId: string, data: any) => void;
  updateChannel: (communityId: string, channelId: string, data: Partial<Channel>) => void;
  deleteChannel: (communityId: string, channelId: string) => void;
  createCategory: (communityId: string, name: string) => void;

  createCommunitySpot: (communityId: string, data: any) => void;
  updateCommunitySpot: (communityId: string, spotId: string, data: Partial<CommunitySpot>) => void;
  deleteCommunitySpot: (communityId: string, spotId: string) => void;

  createPrivateGroup: (communityId: string, name: string) => void;
  updatePrivateGroup: (groupId: string, name: string) => void;
  deletePrivateGroup: (groupId: string) => void;
  createPrivateChannel: (groupId: string, name: string) => void;

  createInvite: (communityId: string, options: any) => CommunityInvite;
  revokeInvite: (code: string) => void;

  updateUserProfile: (data: Partial<User>) => void;
  createUserSpot: (spot: Omit<UserSpot, 'id' | 'ownerId' | 'isActive'>) => void;
  deleteUserSpot: (spotId: string) => void;
  toggleUserSpot: (spotId: string) => void;
  setSignal: (signal: Omit<UserSignal, 'id'>) => void;
  clearSignal: () => void;
  
  addFriend: (user: User) => void;
  removeFriend: (userId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  toggleLocationSharing: () => void;
  
  createFriendCategory: (name: string, color: string) => void;
  assignFriendToCategory: (categoryId: string, userId: string) => void;
  removeFriendFromCategory: (categoryId: string, userId: string) => void;
  toggleCloseFriend: (userId: string) => void;

  resetData: () => void;
  applyTemplate: (type: 'DEMO' | 'EMPTY') => void;
  deleteAccount: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);
  const [users, setUsers] = useState<User[]>(MOCK_FRIENDS);
  const [chats, setChats] = useState<ChatSummary[]>(MOCK_CHATS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
      const initialMsgs: Record<string, Message[]> = {};
      MOCK_CHATS.forEach(chat => {
          initialMsgs[chat.id] = MOCK_MESSAGES.map(m => ({...m, id: m.id + chat.id})); // Unique IDs per chat
      });
      return initialMsgs;
  });
  const [communities, setCommunities] = useState<Community[]>(MOCK_COMMUNITIES);
  // Default joined communities now includes new topics and local groups
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<string[]>([
      'com_ravers', 'com_community_house', 'com1', 
      'topic_underground', 'topic_street', 'topic_analog', 
      'com_skate', 'com_analog_malmo'
  ]); 
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(MOCK_FRIEND_REQUESTS);
  const [invites, setInvites] = useState<CommunityInvite[]>([]);
  const [closeFriendIds, setCloseFriendIds] = useState<string[]>([]);

  // Derived Locations
  const [userLocations, setUserLocations] = useState<Record<string, UserLocationContext>>({});

  // EFFECT: Enforce Demo Friend Request (Jordan Lee)
  useEffect(() => {
      const jordanId = 'u99';
      const isFriend = users.some(u => u.id === jordanId);
      const hasRequest = friendRequests.some(r => r.fromUser.id === jordanId);

      if (!isFriend && !hasRequest) {
          const jordanRequest = MOCK_FRIEND_REQUESTS.find(r => r.fromUser.id === jordanId);
          if (jordanRequest) {
              setFriendRequests(prev => [...prev, jordanRequest]);
          }
      }
  }, [users]);

  useEffect(() => {
      // Run immediately on mount
      const simulateLocations = () => {
          const newLocs: Record<string, UserLocationContext> = {};
          
          // Simulate for ENTIRE user pool to ensure gatherings are populated
          // Filter to only those relevant (friends + members of joined communities would be ideal optimization, but pool is small enough)
          USER_POOL.forEach(u => {
              if (u.status !== 'ONLINE') return;

              // 0. DEMO OVERRIDES - FORCED LOCATIONS
              // This ensures specific gatherings are active and specific friends are there
              
              // 1. Force 'The Harbor Bunker' (com_ravers) Population
              // Friends: Ryan (f8), Elena (f3)
              // Strangers: u_raver_0, u_raver_1, u_raver_2
              // Removed f9 (Wei Chen) from here so he can be on his own spot
              if (['f8', 'f3', 'u_raver_0', 'u_raver_1', 'u_raver_2'].includes(u.id)) {
                  const com = communities.find(c => c.id === 'com_ravers');
                  const spot = com?.spots?.find(s => s.name === 'The Harbor Bunker');
                  if (spot && com) {
                      newLocs[u.id] = {
                          type: 'GATHERING',
                          name: spot.name,
                          communityId: com.id,
                          timestamp: new Date().toISOString(),
                          coordinates: spot.location
                      };
                      return; // Stop here, don't assign personal spot
                  }
              }

              // 2. David (f2) at his own spot (Deep Focus Cafe)
              if (u.id === 'f2') {
                  newLocs[u.id] = {
                      type: 'SPOT',
                      name: 'Deep Focus Cafe',
                      timestamp: new Date().toISOString(),
                      coordinates: { lat: 55.6080, lng: 12.9980 }
                  };
                  return; // Stop here
              }

              // 3. Zoe (f10) at her own spot (Pildammsparken)
              if (u.id === 'f10') {
                  newLocs[u.id] = {
                      type: 'SPOT',
                      name: 'Pildammsparken',
                      timestamp: new Date().toISOString(),
                      coordinates: { lat: 55.5900, lng: 12.9900 }
                  };
                  return; // Stop here
              }

              // 4. Wei Chen (f9) at his own spot (Work Site)
              if (u.id === 'f9') {
                  newLocs[u.id] = {
                      type: 'SPOT',
                      name: 'Work Site',
                      timestamp: new Date().toISOString(),
                      coordinates: { lat: 55.610, lng: 13.030 }
                  };
                  return; // Stop here
              }

              // 5. Force 'The House' (com_community_house) Population (Strangers Only now)
              // Strangers: u_techie_0, u_techie_1, u_techie_2, u_techie_3
              if (['u_techie_0', 'u_techie_1', 'u_techie_2', 'u_techie_3'].includes(u.id)) {
                  const com = communities.find(c => c.id === 'com_community_house');
                  const spot = com?.spots?.find(s => s.name === 'The House');
                  if (spot && com) {
                      newLocs[u.id] = {
                          type: 'GATHERING',
                          name: spot.name,
                          communityId: com.id,
                          timestamp: new Date().toISOString(),
                          coordinates: spot.location
                      };
                      return; // Stop here
                  }
              }

              // 6. PRIORITY: Check Friend Clusters (Specific Social Context)
              // Only applies to specific friend IDs defined in GROUP_MEMBER_IDS
              if (GROUP_MEMBER_IDS.includes(u.id)) {
                  // Simulate them being at Möllevångstorget
                  const groupLocation = { lat: 55.5917, lng: 13.0070 }; 
                  newLocs[u.id] = {
                      type: 'CLUSTER',
                      name: 'Möllevången Crew',
                      timestamp: new Date().toISOString(),
                      coordinates: groupLocation
                  };
                  return; 
              }

              // 7. User Personal Spots
              // Only simulate this for friends or user if they aren't caught by the overrides above
              if (u.userSpots && u.userSpots.length > 0) {
                  // 70% chance to be at personal spot if they have one
                  const seed = (u.id + new Date().getHours()).split('').reduce((a,b)=>a+b.charCodeAt(0),0);
                  if (seed % 10 < 7) { 
                      const activeSpot = u.userSpots.find(s => s.isActive);
                      if (activeSpot) {
                          newLocs[u.id] = {
                              type: 'SPOT',
                              name: activeSpot.name,
                              timestamp: new Date().toISOString(),
                              coordinates: activeSpot.location
                          };
                          return;
                      }
                  }
              }

              // 8. Random Filler for remaining Community Spots
              // Scan all community spots
              for (const com of communities) {
                  if (com.spots) {
                      for (const spot of com.spots) {
                          // Simple simulation: Assign random online users to spots
                          const hash = (u.id + spot.id + new Date().getHours()).split('').reduce((a,b)=>a+b.charCodeAt(0),0);
                          
                          // Higher chance for strangers to populate spots (20%)
                          if (hash % 10 < 2) { 
                              newLocs[u.id] = {
                                  type: 'GATHERING',
                                  name: spot.name,
                                  communityId: com.id,
                                  timestamp: new Date().toISOString(),
                                  coordinates: spot.location
                              };
                              return;
                          }
                      }
                  }
              }
          });

          // Manually inject a location for Jordan Lee (u99) so he appears on the map
          newLocs['u99'] = {
                type: 'SPOT',
                name: 'Design Hub',
                coordinates: { lat: 55.6060, lng: 13.0010 },
                timestamp: new Date().toISOString()
          };

          setUserLocations(newLocs);
      };

      simulateLocations();
      const interval = setInterval(simulateLocations, 10000); // Update every 10s

      return () => clearInterval(interval);
  }, [communities]); 

  // --- ACTIONS ---

  const createChat = (friend: User) => {
      const existing = chats.find(c => c.type === 'DM' && c.memberIds?.includes(friend.id) && c.memberIds.length === 1);
      if (existing) return existing;

      const newChat: ChatSummary = {
          id: `dm_${Date.now()}`,
          name: friend.displayName,
          avatarUrl: friend.avatarUrl,
          lastMessage: 'New conversation',
          timestamp: 'Now',
          unreadCount: 0,
          type: 'DM',
          memberIds: [friend.id],
          online: friend.status === 'ONLINE'
      };
      setChats(prev => [newChat, ...prev]);
      return newChat;
  };

  const createGroupChat = (name: string, members: User[]) => {
      const newChat: ChatSummary = {
          id: `group_${Date.now()}`,
          name,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          lastMessage: 'Group created',
          timestamp: 'Now',
          unreadCount: 0,
          type: 'GROUP',
          memberIds: members.map(m => m.id),
      };
      setChats(prev => [newChat, ...prev]);
      return newChat;
  };

  const sendMessage = (chatId: string, text: string, attachments?: Attachment[], replyToId?: string) => {
      const newMessage: Message = {
          id: `msg_${Date.now()}`,
          senderId: currentUser.id,
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: true,
          status: 'SENT',
          attachments,
          replyToId,
          replyToMessage: replyToId ? messages[chatId]?.find(m => m.id === replyToId) : undefined
      };

      setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), newMessage]
      }));

      setChats(prev => prev.map(c => 
          c.id === chatId 
              ? { ...c, lastMessage: text || (attachments ? 'Sent an attachment' : ''), timestamp: 'Now' } 
              : c
      ));
  };

  const addReaction = (chatId: string, messageId: string, emoji: string) => {
      setMessages(prev => ({
          ...prev,
          [chatId]: prev[chatId].map(m => 
              m.id === messageId 
                  ? { ...m, reactions: [...(m.reactions || []), { emoji, userId: currentUser.id }] } 
                  : m
          )
      }));
  };

  const editMessage = (chatId: string, messageId: string, newContent: string) => {
      setMessages(prev => ({
          ...prev,
          [chatId]: prev[chatId].map(m => 
              m.id === messageId 
                  ? { ...m, content: newContent, isEdited: true } 
                  : m
          )
      }));
  };

  const deleteMessage = (chatId: string, messageId: string) => {
      setMessages(prev => ({
          ...prev,
          [chatId]: prev[chatId].filter(m => m.id !== messageId)
      }));
  };

  const deleteChat = (chatId: string) => {
      setChats(prev => prev.filter(c => c.id !== chatId));
      const newMessages = { ...messages };
      delete newMessages[chatId];
      setMessages(newMessages);
  };

  const clearChatHistory = (chatId: string) => {
      setMessages(prev => ({
          ...prev,
          [chatId]: []
      }));
  };

  const archiveChat = (chatId: string) => {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, isArchived: true } : c));
  };

  const unarchiveChat = (chatId: string) => {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, isArchived: false } : c));
  };

  const updateChat = (chatId: string, data: Partial<ChatSummary>) => {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, ...data } : c));
  };

  // --- EVENTS ---

  const createEvent = (eventData: any) => {
      const newEvent: Event = {
          id: `evt_${Date.now()}`,
          attendeeCount: 1,
          isAttending: true,
          publicSlug: `evt-${Date.now()}`,
          attendees: [currentUser],
          hostId: currentUser.id,
          ...eventData
      };
      setEvents(prev => [...prev, newEvent]);
  };

  const updateEvent = (eventId: string, data: Partial<Event>) => {
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...data } : e));
  };

  const deleteEvent = (eventId: string) => {
      setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const toggleRsvp = (eventId: string) => {
      setEvents(prev => prev.map(e => {
          if (e.id === eventId) {
              const isAttending = !e.isAttending;
              return { 
                  ...e, 
                  isAttending, 
                  attendeeCount: e.attendeeCount + (isAttending ? 1 : -1),
                  attendees: isAttending 
                      ? [...(e.attendees || []), currentUser] 
                      : (e.attendees || []).filter(u => u.id !== currentUser.id)
              };
          }
          return e;
      }));
  };

  const cancelEvent = (eventId: string, reason: string) => {
      updateEvent(eventId, { status: 'CANCELLED', cancellationReason: reason });
  };

  // --- COMMUNITIES ---

  const joinCommunity = (id: string) => {
      if (!joinedCommunityIds.includes(id)) {
          setJoinedCommunityIds(prev => [...prev, id]);
      }
  };

  const joinCommunityViaLink = (code: string) => {
      const invite = invites.find(i => i.code === code && i.status === 'ACTIVE');
      if (invite) {
          joinCommunity(invite.communityId);
          // Increment usage
          setInvites(prev => prev.map(i => i.code === code ? { ...i, uses: i.uses + 1 } : i));
          return true;
      }
      return false;
  };

  const createCommunity = (data: any) => {
      const newCommunity: Community = {
          id: `com_${Date.now()}`,
          ownerId: currentUser.id,
          memberCount: 1,
          location: { city: data.city || 'Malmö', coordinates: { lat: 55.60, lng: 13.00 } }, // Mock loc
          visibility: 'PUBLIC',
          ...data
      };
      setCommunities(prev => [...prev, newCommunity]);
      setJoinedCommunityIds(prev => [...prev, newCommunity.id]);
  };

  const updateCommunity = (id: string, data: Partial<Community>) => {
      setCommunities(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteCommunity = (id: string) => {
      setCommunities(prev => prev.filter(c => c.id !== id));
      setJoinedCommunityIds(prev => prev.filter(jid => jid !== id));
  };

  const leaveCommunity = (id: string) => {
      setJoinedCommunityIds(prev => prev.filter(jid => jid !== id));
  };

  const transferOwnership = (communityId: string, newOwnerId: string) => {
      updateCommunity(communityId, { ownerId: newOwnerId });
  };

  // --- CHANNELS & SPOTS ---

  const createChannel = (communityId: string, data: any) => {
      const newChannel: Channel = {
          id: `ch_${Date.now()}`,
          ...data
      };
      setCommunities(prev => prev.map(c => 
          c.id === communityId 
              ? { ...c, channels: [...c.channels, newChannel] } 
              : c
      ));
  };

  const updateChannel = (communityId: string, channelId: string, data: Partial<Channel>) => {
      setCommunities(prev => prev.map(c => 
          c.id === communityId 
              ? { ...c, channels: c.channels.map(ch => ch.id === channelId ? { ...ch, ...data } : ch) } 
              : c
      ));
  };

  const deleteChannel = (communityId: string, channelId: string) => {
      setCommunities(prev => prev.map(c => 
          c.id === communityId 
              ? { ...c, channels: c.channels.filter(ch => ch.id !== channelId) } 
              : c
      ));
  };

  const createCategory = (communityId: string, name: string) => {
      setCommunities(prev => prev.map(c => 
          c.id === communityId 
              ? { ...c, categories: [...(c.categories || []), name] } 
              : c
      ));
  };

  const createCommunitySpot = (communityId: string, data: any) => {
      const newSpot: CommunitySpot = {
          id: `spot_${Date.now()}`,
          communityId,
          ...data
      };
      setCommunities(prev => prev.map(c => 
          c.id === communityId 
              ? { ...c, spots: [...(c.spots || []), newSpot] } 
              : c
      ));
  };

  const updateCommunitySpot = (communityId: string, spotId: string, data: Partial<CommunitySpot>) => {
      setCommunities(prev => prev.map(c => 
          c.id === communityId 
              ? { ...c, spots: (c.spots || []).map(s => s.id === spotId ? { ...s, ...data } : s) } 
              : c
      ));
  };

  const deleteCommunitySpot = (communityId: string, spotId: string) => {
      setCommunities(prev => prev.map(c => 
          c.id === communityId 
              ? { ...c, spots: (c.spots || []).filter(s => s.id !== spotId) } 
              : c
      ));
  };

  // --- PRIVATE GROUPS ---

  const createPrivateGroup = (communityId: string, name: string) => {
      const newGroup: PrivateGroup = {
          id: `pg_${Date.now()}`,
          name,
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
          memberCount: 1,
          communityId,
          channels: []
      };
      updateUserProfile({ privateGroups: [...(currentUser.privateGroups || []), newGroup] });
  };

  const updatePrivateGroup = (groupId: string, name: string) => {
      const updatedGroups = (currentUser.privateGroups || []).map(g => g.id === groupId ? { ...g, name } : g);
      updateUserProfile({ privateGroups: updatedGroups });
  };

  const deletePrivateGroup = (groupId: string) => {
      const updatedGroups = (currentUser.privateGroups || []).filter(g => g.id !== groupId);
      updateUserProfile({ privateGroups: updatedGroups });
  };

  const createPrivateChannel = (groupId: string, name: string) => {
      const newChannel: Channel = {
          id: `pg_ch_${Date.now()}`,
          name,
          type: 'text'
      };
      const updatedGroups = (currentUser.privateGroups || []).map(g => 
          g.id === groupId 
              ? { ...g, channels: [...(g.channels || []), newChannel] } 
              : g
      );
      updateUserProfile({ privateGroups: updatedGroups });
  };

  // --- INVITES ---

  const createInvite = (communityId: string, options: any) => {
      const newInvite: CommunityInvite = {
          code: Math.random().toString(36).substring(7),
          communityId,
          creatorId: currentUser.id,
          createdAt: new Date().toISOString(),
          expiresAt: options.expiresIn === 'never' ? 'never' : new Date(Date.now() + 86400000 * 7).toISOString(), // Mock calc
          maxUses: options.maxUses,
          uses: 0,
          status: 'ACTIVE'
      };
      setInvites(prev => [...prev, newInvite]);
      return newInvite;
  };

  const revokeInvite = (code: string) => {
      setInvites(prev => prev.map(i => i.code === code ? { ...i, status: 'REVOKED' } : i));
  };

  // --- USER PROFILE & SETTINGS ---

  const updateUserProfile = (data: Partial<User>) => {
      setCurrentUser(prev => ({ ...prev, ...data }));
  };

  const createUserSpot = (spotData: Omit<UserSpot, 'id' | 'ownerId' | 'isActive'>) => {
      const newSpot: UserSpot = {
          id: `us_spot_${Date.now()}`,
          ownerId: currentUser.id,
          isActive: true,
          ...spotData
      };
      updateUserProfile({ userSpots: [...(currentUser.userSpots || []), newSpot] });
  };

  const deleteUserSpot = (spotId: string) => {
      updateUserProfile({ userSpots: (currentUser.userSpots || []).filter(s => s.id !== spotId) });
  };

  const toggleUserSpot = (spotId: string) => {
      updateUserProfile({ 
          userSpots: (currentUser.userSpots || []).map(s => s.id === spotId ? { ...s, isActive: !s.isActive } : s) 
      });
  };

  const setSignal = (signal: Omit<UserSignal, 'id'>) => {
      updateUserProfile({ currentSignal: { id: `sig_${Date.now()}`, ...signal } });
  };

  const clearSignal = () => {
      updateUserProfile({ currentSignal: undefined });
  };

  const addFriend = (user: User) => {
      if (!users.find(u => u.id === user.id)) {
          setUsers(prev => [...prev, user]);
      }
  };

  const removeFriend = (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const acceptFriendRequest = (requestId: string) => {
      const req = friendRequests.find(r => r.id === requestId);
      if (req) {
          addFriend(req.fromUser);
          createChat(req.fromUser);
          setFriendRequests(prev => prev.filter(r => r.id !== requestId));
      }
  };

  const blockUser = (userId: string) => {
      updateUserProfile({ blockedUserIds: [...(currentUser.blockedUserIds || []), userId] });
      removeFriend(userId);
  };

  const unblockUser = (userId: string) => {
      updateUserProfile({ blockedUserIds: (currentUser.blockedUserIds || []).filter(id => id !== userId) });
  };

  const toggleLocationSharing = () => {
      const current = currentUser.settings?.globalLocationSharing ?? true;
      updateUserProfile({ settings: { ...currentUser.settings!, globalLocationSharing: !current } });
  };

  const createFriendCategory = (name: string, color: string) => {
      const newCat = { id: `cat_${Date.now()}`, name, color, userIds: [] };
      updateUserProfile({ friendCategories: [...(currentUser.friendCategories || []), newCat] });
  };

  const assignFriendToCategory = (categoryId: string, userId: string) => {
      const updatedCats = (currentUser.friendCategories || []).map(c => 
          c.id === categoryId ? { ...c, userIds: [...c.userIds, userId] } : c
      );
      updateUserProfile({ friendCategories: updatedCats });
  };

  const removeFriendFromCategory = (categoryId: string, userId: string) => {
      const updatedCats = (currentUser.friendCategories || []).map(c => 
          c.id === categoryId ? { ...c, userIds: c.userIds.filter(id => id !== userId) } : c
      );
      updateUserProfile({ friendCategories: updatedCats });
  };

  const toggleCloseFriend = (userId: string) => {
      setCloseFriendIds(prev => 
          prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
  };

  const resetData = () => {
      localStorage.clear();
      window.location.reload();
  };

  const applyTemplate = (type: 'DEMO' | 'EMPTY') => {
      if (type === 'EMPTY') {
          setChats([]);
          setUsers([]);
          // Keep ALL communities available for discovery (World Data exists)
          setCommunities(MOCK_COMMUNITIES);
          // User starts with 0 joined communities
          setJoinedCommunityIds([]);
          
          // Events exist in the world, but user is not attending
          const cleanEvents = MOCK_EVENTS.map(e => {
              const wasAttending = e.isAttending; // Based on Mock Data default
              return {
                  ...e,
                  isAttending: false,
                  attendeeCount: wasAttending ? Math.max(0, e.attendeeCount - 1) : e.attendeeCount,
                  attendees: (e.attendees || []).filter(u => u.id !== CURRENT_USER.id)
              };
          });
          setEvents(cleanEvents);
      } else {
          // Reset to mock state
          setChats(MOCK_CHATS);
          setUsers(MOCK_FRIENDS);
          setCommunities(MOCK_COMMUNITIES);
          setJoinedCommunityIds(['com_ravers', 'com_community_house', 'com1', 'topic_underground']);
          setEvents(MOCK_EVENTS);
      }
  };

  const deleteAccount = () => {
      resetData();
  };

  return (
    <DataContext.Provider value={{
      currentUser,
      users,
      chats,
      messages,
      communities,
      joinedCommunityIds,
      events,
      friendRequests,
      userLocations,
      invites,
      closeFriendIds,
      createChat,
      createGroupChat,
      sendMessage,
      addReaction,
      editMessage,
      deleteMessage,
      deleteChat,
      clearChatHistory,
      archiveChat,
      unarchiveChat,
      updateChat,
      createEvent,
      updateEvent,
      deleteEvent,
      toggleRsvp,
      cancelEvent,
      joinCommunity,
      joinCommunityViaLink,
      createCommunity,
      updateCommunity,
      deleteCommunity,
      leaveCommunity,
      transferOwnership,
      createChannel,
      updateChannel,
      deleteChannel,
      createCategory,
      createCommunitySpot,
      updateCommunitySpot,
      deleteCommunitySpot,
      createPrivateGroup,
      updatePrivateGroup,
      deletePrivateGroup,
      createPrivateChannel,
      createInvite,
      revokeInvite,
      updateUserProfile,
      createUserSpot,
      deleteUserSpot,
      toggleUserSpot,
      setSignal,
      clearSignal,
      addFriend,
      removeFriend,
      acceptFriendRequest,
      blockUser,
      unblockUser,
      toggleLocationSharing,
      createFriendCategory,
      assignFriendToCategory,
      removeFriendFromCategory,
      toggleCloseFriend,
      resetData,
      applyTemplate,
      deleteAccount
    }}>
      {children}
    </DataContext.Provider>
  );
};
