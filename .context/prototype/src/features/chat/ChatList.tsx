
import React, { useState, useMemo, useEffect } from 'react';
import { ChatSummary, User, Event, FriendRequest, UserLocationContext, Community } from '../../types';
import { Search, UserPlus, Users, MapPin, Flame, Calendar, Settings, X, Check, ChevronRight } from 'lucide-react';
import { UserAvatar } from '../../components/UserAvatar';
import { useData } from '../../context/DataContext';
import { UserSettingsModal } from '../settings/UserSettingsModal';
import { USER_POOL } from '../../data/userPool';
import { useTutorial } from '../../context/TutorialContext';

interface ChatListProps {
  chats: ChatSummary[];
  events: Event[];
  friends: User[];
  friendRequests: FriendRequest[];
  joinedCommunityIds: string[];
  viewMode: 'MESSAGES' | 'EVENTS';
  onViewModeChange: (mode: 'MESSAGES' | 'EVENTS') => void;
  onSelectChat: (chat: ChatSummary) => void;
  onSelectEvent: (eventId: string) => void;
  onCreateChat: (friend: User) => void;
  onCreateGroup: (name: string, friendIds: string[]) => void;
  onCreateEvent: () => void;
  onAcceptFriendRequest: (id: string) => void;
  onAddFriend: (user: User) => void;
  onLogout: () => void;
  onRestartOnboarding: () => void;
  selectedId: string | null;
}

const ChatItem: React.FC<{ 
    chat: ChatSummary; 
    isSelected: boolean; 
    onSelect: (chat: ChatSummary) => void;
    userLocations: Record<string, UserLocationContext>;
    friends: User[];
    currentUser: User;
    communities: Community[];
}> = ({ chat, isSelected, onSelect, userLocations, friends, currentUser, communities }) => {
    
    // --- PRESENCE HIERARCHY SYSTEM ---
    // Priority: 1. Cluster, 2. Gathering, 3. Location (Spot)
    
    let resolvedStatus: { type: 'CLUSTER' | 'GATHERING' | 'LOC'; text: string; members?: User[] } | null = null;

    // Helper to resolve community name for gathering
    const getGatheringContext = (loc: UserLocationContext) => {
        if (loc.communityId) {
            const com = communities.find(c => c.id === loc.communityId);
            return com ? `${loc.name} (${com.name})` : loc.name;
        }
        return loc.name;
    };

    if (chat.type === 'DM') {
        const otherMemberId = chat.memberIds?.find(id => id !== currentUser.id);
        if (otherMemberId) {
            const loc = userLocations[otherMemberId];
            if (loc) {
                // Strict Priority for DM
                if (loc.type === 'CLUSTER') {
                    // Use "With Friends" or the Cluster Name if available
                    resolvedStatus = { type: 'CLUSTER', text: loc.name || 'With Friends' };
                } else if (loc.type === 'GATHERING') {
                    resolvedStatus = { type: 'GATHERING', text: getGatheringContext(loc) };
                } else {
                    resolvedStatus = { type: 'LOC', text: loc.name };
                }
            }
        }
    } else {
        // GROUP LOGIC: Determine "Dominant" Status
        const memberIds = chat.memberIds || [];
        const activeMembers = memberIds.map(id => ({ id, loc: userLocations[id] })).filter(m => m.loc);

        // 1. Check for CLUSTER (Highest Priority)
        // A group is in a cluster if any member's location is type CLUSTER and matches group context
        const clusterMatch = activeMembers.find(m => m.loc?.type === 'CLUSTER' && m.loc.name === chat.name);
        
        if (clusterMatch) {
            // Get all members who are part of this cluster
            const clusterPeople = friends.filter(f => activeMembers.some(am => am.id === f.id && am.loc?.type === 'CLUSTER'));
            resolvedStatus = { type: 'CLUSTER', text: 'Cluster Active', members: clusterPeople };
        } 
        else {
            // 2. Check for GATHERING (Medium Priority)
            const gatheringCounts: Record<string, number> = {};
            // Track community IDs to resolve names later
            const gatheringCommunities: Record<string, string> = {};

            activeMembers.forEach(m => {
                if (m.loc?.type === 'GATHERING') {
                    gatheringCounts[m.loc.name] = (gatheringCounts[m.loc.name] || 0) + 1;
                    if(m.loc.communityId) gatheringCommunities[m.loc.name] = m.loc.communityId;
                }
            });
            
            // Find gathering with > 1 member. Single members don't trigger group status.
            const dominantGathering = Object.keys(gatheringCounts).find(key => gatheringCounts[key] > 1);
            
            if (dominantGathering) {
                const comName = gatheringCommunities[dominantGathering] 
                    ? communities.find(c => c.id === gatheringCommunities[dominantGathering])?.name 
                    : null;
                const displayText = comName ? `${dominantGathering} (${comName})` : dominantGathering;
                resolvedStatus = { type: 'GATHERING', text: displayText };
            } 
            else {
                // 3. Check for LOCATION/SPOT (Lowest Priority)
                const spotCounts: Record<string, number> = {};
                activeMembers.forEach(m => {
                    if (m.loc?.type === 'SPOT') {
                        spotCounts[m.loc.name] = (spotCounts[m.loc.name] || 0) + 1;
                    }
                });
                // Only show LOC if > 1 member is there
                const dominantSpot = Object.keys(spotCounts).find(key => spotCounts[key] > 1);
                
                if (dominantSpot) {
                    resolvedStatus = { type: 'LOC', text: dominantSpot };
                }
            }
        }
    }

    return (
        <div 
            onClick={() => onSelect(chat)}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
            <div className="relative">
                <img 
                    src={chat.avatarUrl} 
                    className="w-12 h-12 rounded-full object-cover bg-gray-800"
                    alt={chat.name} 
                />
                {chat.online && !resolvedStatus && chat.type === 'DM' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-mint border-2 border-[#0F1115] rounded-full"></div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                {/* Header Line: Name & Time Only */}
                <div className="flex justify-between items-start mb-0.5">
                    <h3 className={`font-bold truncate text-sm leading-tight pr-2 ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                        {chat.name}
                    </h3>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0 pt-0.5">{chat.timestamp}</span>
                </div>
                
                {/* Subtitle Line: Status or Message */}
                {resolvedStatus ? (
                    resolvedStatus.type === 'CLUSTER' && resolvedStatus.members && resolvedStatus.members.length > 0 ? (
                        // CLUSTER VIEW (Group Facepile)
                        <div className="flex items-center gap-2 mt-1 min-w-0">
                            <div className="flex -space-x-1.5 shrink-0">
                                {resolvedStatus.members.slice(0, 3).map(m => (
                                    <img key={m.id} src={m.avatarUrl} className="w-4 h-4 rounded-full border border-[#0F1115]" alt={m.displayName} />
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                <div className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 border border-blue-500/20">
                                    <Users size={8} /> Cluster
                                </div>
                                <p className="text-xs text-blue-400 truncate font-medium">
                                    {resolvedStatus.members.map(m => m.displayName.split(' ')[0]).join(', ')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        // GATHERING / LOC / SINGLE CLUSTER VIEW (DM)
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                             <div className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 border
                                ${resolvedStatus.type === 'CLUSTER' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                  resolvedStatus.type === 'GATHERING' ? 'bg-mint/10 text-mint border-mint/20' : 
                                  'bg-purple-500/10 text-purple-400 border-purple-500/20'}
                             `}>
                                 {resolvedStatus.type === 'CLUSTER' ? <Users size={8} /> : 
                                  resolvedStatus.type === 'GATHERING' ? <Flame size={8} className="fill-current" /> : 
                                  <MapPin size={8} />}
                                 
                                 {resolvedStatus.type === 'CLUSTER' ? 'CLUSTER' : 
                                  resolvedStatus.type === 'GATHERING' ? 'LIVE' : 'LOC'}
                             </div>
                             <p className={`text-xs truncate font-medium ${
                                 resolvedStatus.type === 'CLUSTER' ? 'text-blue-300' :
                                 resolvedStatus.type === 'GATHERING' ? 'text-gray-300' : 'text-gray-400'
                             }`}>
                                 {resolvedStatus.text}
                             </p>
                        </div>
                    )
                ) : (
                    <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {chat.lastMessage}
                    </p>
                )}
            </div>
            
            {/* Unread Counter */}
            {chat.unreadCount > 0 && (
                <div className="w-5 h-5 bg-signal rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ml-2">
                    {chat.unreadCount}
                </div>
            )}
        </div>
    );
};

export const ChatList: React.FC<ChatListProps> = ({ 
    chats, 
    events,
    friends,
    friendRequests,
    viewMode,
    onViewModeChange,
    onSelectChat, 
    onSelectEvent,
    onCreateChat,
    onCreateGroup,
    onCreateEvent,
    onAcceptFriendRequest,
    onAddFriend,
    onLogout,
    onRestartOnboarding,
    selectedId 
}) => {
    const { userLocations, currentUser, communities } = useData();
    const { triggerTutorial } = useTutorial();
    const [searchTerm, setSearchTerm] = useState('');
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    // Internal navigation state for "New Chat" flow within the sidebar
    const [creationState, setCreationState] = useState<'NONE' | 'SELECT_FRIEND' | 'CREATE_GROUP' | 'ADD_FRIEND'>('NONE');
    const [groupName, setGroupName] = useState('');
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

    useEffect(() => {
        if (viewMode === 'EVENTS') {
            triggerTutorial('events_intro');
        }
    }, [viewMode, triggerTutorial]);

    // --- FILTERED DATA ---
    const filteredChats = useMemo(() => {
        // Exclude GATHERING type chats from the main list as requested
        const validChats = chats.filter(c => c.type !== 'GATHERING');
        return validChats.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [chats, searchTerm]);

    const filteredEvents = useMemo(() => {
        return events.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [events, searchTerm]);

    const filteredFriends = useMemo(() => {
        return friends.filter(f => f.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || f.handle.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [friends, searchTerm]);

    const availableToAdd = useMemo(() => {
        if (creationState !== 'ADD_FRIEND' || !searchTerm) return [];
        const friendIds = friends.map(f => f.id);
        const lowerTerm = searchTerm.toLowerCase();
        return USER_POOL.filter(u => 
            !friendIds.includes(u.id) && 
            u.id !== currentUser.id &&
            (u.displayName.toLowerCase().includes(lowerTerm) || 
             u.handle.toLowerCase().includes(lowerTerm))
        );
    }, [friends, searchTerm, currentUser.id, creationState]);

    // --- HANDLERS ---
    const handleGroupCreate = () => {
        if (groupName && selectedFriendIds.length > 0) {
            onCreateGroup(groupName, selectedFriendIds);
            setCreationState('NONE');
            setGroupName('');
            setSelectedFriendIds([]);
        }
    };

    const toggleFriendSelection = (id: string) => {
        setSelectedFriendIds(prev => 
            prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
        );
    };

    const handleAddUser = (user: User) => {
        onAddFriend(user);
        setSearchTerm('');
    };

    // --- VIEW: FRIEND SELECTOR (New Chat/Group) ---
    if (creationState !== 'NONE') {
        return (
            <div className="flex flex-col h-full bg-[#0F1115]">
                <div className="p-4 border-b border-white/5">
                    <button 
                        onClick={() => {
                            setCreationState('NONE');
                            setSearchTerm('');
                        }}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-xs font-bold uppercase tracking-wider"
                    >
                        <ChevronRight className="rotate-180" size={14} /> Back
                    </button>
                    <h2 className="text-xl font-bold text-white mb-1">
                        {creationState === 'SELECT_FRIEND' ? 'New Message' : 
                         creationState === 'CREATE_GROUP' ? 'New Group' : 'Add Friend'}
                    </h2>
                    <p className="text-xs text-gray-500">
                        {creationState === 'SELECT_FRIEND' ? 'Select a friend to chat with' : 
                         creationState === 'CREATE_GROUP' ? 'Select members for your group' : 'Find people by name or handle'}
                    </p>
                </div>

                {creationState === 'CREATE_GROUP' && (
                    <div className="p-4 border-b border-white/5 space-y-4">
                        <input 
                            type="text" 
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Group Name"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-signal/50"
                            autoFocus
                        />
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">{selectedFriendIds.length} selected</span>
                            <button 
                                onClick={handleGroupCreate}
                                disabled={!groupName || selectedFriendIds.length === 0}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${groupName && selectedFriendIds.length > 0 ? 'bg-signal text-white' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                            >
                                Create Group
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-2">
                    <input 
                        type="text" 
                        placeholder={creationState === 'ADD_FRIEND' ? "Search for people..." : "Search friends..."} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-signal/50 mb-2"
                        autoFocus={creationState !== 'CREATE_GROUP'}
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {creationState === 'ADD_FRIEND' ? (
                        availableToAdd.length === 0 && searchTerm ? (
                            <div className="text-center py-8 text-gray-500 text-xs">No users found.</div>
                        ) : availableToAdd.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-xs">Search to find new friends.</div>
                        ) : (
                            availableToAdd.map(user => (
                                <div 
                                    key={user.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={user} size="sm" />
                                        <div>
                                            <div className="text-sm font-bold text-white">{user.displayName}</div>
                                            <div className="text-xs text-gray-500">{user.handle}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleAddUser(user)}
                                        className="px-3 py-1.5 bg-signal hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            ))
                        )
                    ) : (
                        filteredFriends.map(friend => {
                            const isSelected = selectedFriendIds.includes(friend.id);
                            return (
                                <div 
                                    key={friend.id}
                                    onClick={() => {
                                        if (creationState === 'SELECT_FRIEND') {
                                            onCreateChat(friend);
                                            setCreationState('NONE');
                                        } else {
                                            toggleFriendSelection(friend.id);
                                        }
                                    }}
                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors ${isSelected ? 'bg-white/10' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={friend} size="sm" showStatus />
                                        <div>
                                            <div className="text-sm font-bold text-white">{friend.displayName}</div>
                                            <div className="text-xs text-gray-500">{friend.handle}</div>
                                        </div>
                                    </div>
                                    {creationState === 'CREATE_GROUP' && (
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-signal border-signal text-white' : 'border-white/20'}`}>
                                            {isSelected && <Check size={12} />}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    // --- MAIN VIEW ---
    return (
        <div className="flex flex-col h-full bg-[#0F1115]">
            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">
                        {viewMode === 'MESSAGES' ? 'Chats' : 'My Events'}
                    </h1>
                    
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setCreationState('ADD_FRIEND')}
                            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                            title="Add Friend"
                        >
                            <UserPlus size={20} />
                        </button>
                        <button 
                            onClick={() => setShowSettingsModal(true)}
                            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                            title="Settings"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                {/* View Toggles */}
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button 
                        onClick={() => onViewModeChange('MESSAGES')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'MESSAGES' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Messages
                    </button>
                    <button 
                        onClick={() => onViewModeChange('EVENTS')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'EVENTS' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Events
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                        type="text" 
                        placeholder={viewMode === 'MESSAGES' ? "Search chats..." : "Search events..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-signal/50 placeholder-gray-600 transition-colors"
                    />
                </div>

                {viewMode === 'EVENTS' && (
                    <button 
                        onClick={onCreateEvent}
                        className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-gray-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        <Calendar size={16} /> Create Event
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                
                {/* VIEW: MESSAGES */}
                {viewMode === 'MESSAGES' && (
                    <>
                        {/* Friend Requests */}
                        {friendRequests.length > 0 && !searchTerm && (
                            <div className="mb-4 animate-in slide-in-from-left-2">
                                <div className="px-2 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
                                    <span>Friend Requests</span>
                                    <span className="bg-signal text-white px-1.5 rounded-full">{friendRequests.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {friendRequests.map(req => (
                                        <div key={req.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                                            <UserAvatar user={req.fromUser} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white text-xs">{req.fromUser.displayName}</div>
                                                <div className="text-[10px] text-gray-500">Sent a request</div>
                                            </div>
                                            <button 
                                                onClick={() => onAcceptFriendRequest(req.id)}
                                                className="p-1.5 bg-signal hover:bg-blue-600 rounded-lg text-white transition-colors"
                                                title="Accept"
                                            >
                                                <UserPlus size={14} />
                                            </button>
                                            <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-gray-400 transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="my-4 h-[1px] bg-white/5 mx-2"></div>
                            </div>
                        )}

                        {filteredChats.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-xs">
                                No chats found.
                                <br />
                                <button 
                                    onClick={() => setCreationState('SELECT_FRIEND')} 
                                    className="mt-2 text-signal hover:underline"
                                >
                                    Start a new conversation
                                </button>
                            </div>
                        ) : (
                            filteredChats.map(chat => (
                                <ChatItem 
                                    key={chat.id} 
                                    chat={chat} 
                                    isSelected={selectedId === chat.id}
                                    onSelect={onSelectChat}
                                    userLocations={userLocations}
                                    friends={friends}
                                    currentUser={currentUser}
                                    communities={communities}
                                />
                            ))
                        )}
                    </>
                )}

                {/* VIEW: EVENTS */}
                {viewMode === 'EVENTS' && (
                    <div className="space-y-2">
                        {filteredEvents.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-xs">
                                No events found.
                            </div>
                        ) : (
                            filteredEvents.map(event => (
                                <div 
                                    key={event.id}
                                    onClick={() => onSelectEvent(event.id)}
                                    className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 cursor-pointer transition-all flex gap-3"
                                >
                                    <div className="w-12 h-12 bg-black/40 rounded-lg flex flex-col items-center justify-center border border-white/10 shrink-0">
                                        <span className="text-[9px] text-red-400 font-bold uppercase">{new Date(event.startTime).toLocaleDateString(undefined, { month: 'short' })}</span>
                                        <span className="text-lg font-bold text-white leading-none">{new Date(event.startTime).getDate()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-sm truncate">{event.name}</h3>
                                        <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-1">
                                            <span className="flex items-center gap-1"><MapPin size={10} /> {event.locationName}</span>
                                            {event.isAttending && <span className="text-green-400 flex items-center gap-1 bg-green-500/10 px-1.5 rounded"><Check size={8} /> Going</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* SETTINGS MODAL */}
            {showSettingsModal && (
                <UserSettingsModal 
                    onClose={() => setShowSettingsModal(false)}
                    onLogout={onLogout}
                    onRestartOnboarding={onRestartOnboarding}
                />
            )}
        </div>
    );
};
