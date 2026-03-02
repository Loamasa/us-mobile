
import React, { useState, useMemo } from 'react';
import { User, ChatSummary, Event, NotificationSetting } from '../../../types';
import { MessageSquare, UserMinus, UserPlus, Ban, Users, X, MapPin, Eye, EyeOff, HelpCircle, Bell, BellOff, AtSign, Clock, Trash2, ChevronLeft, ChevronRight, LogOut, Archive, Inbox, Eraser, Tag, Plus, Heart, Star } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useMonetization } from '../../../context/MonetizationContext';
import { SharedMediaWidget, SharedMediaGallery } from './SharedMediaGallery';

interface ChatProfileSidebarProps {
  chat: ChatSummary;
  members: User[];
  onClose: () => void;
  events?: Event[];
  communityId?: string;
}

export const ChatProfileSidebar: React.FC<ChatProfileSidebarProps> = ({ chat, members, onClose, events = [], communityId }) => {
  const { 
      updateChat, removeFriend, addFriend, blockUser, unblockUser, currentUser, 
      deleteChat, clearChatHistory, archiveChat, unarchiveChat, users: myFriends, messages: allMessages,
      createFriendCategory, assignFriendToCategory, removeFriendFromCategory, toggleCloseFriend, closeFriendIds
  } = useData();
  const { serverSupporters } = useMonetization();
  
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [showFullGallery, setShowFullGallery] = useState(false);
  
  // Category Management State
  const [isManagingTags, setIsManagingTags] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Navigation State
  const isDM = chat.type === 'DM';
  // For Group Chats, we can drill down into a member
  const [viewedMemberId, setViewedMemberId] = useState<string | null>(null);

  // Get Messages for this chat
  const chatMessages = useMemo(() => allMessages[chat.id] || [], [allMessages, chat.id]);

  // If DM, we always view the other user. If Group, we view selected or null.
  const targetMember = isDM 
    ? (members.find(m => m.id !== currentUser.id) || members[0])
    : (viewedMemberId ? members.find(m => m.id === viewedMemberId) : null);

  // Check if a user is a supporter of the current community
  const checkIsSupporter = (userId: string) => {
      if (!communityId) return false;
      return serverSupporters[communityId]?.includes(userId);
  };

  // --- ACTIONS ---

  const handleStartDM = (userId: string) => {
      window.dispatchEvent(new CustomEvent('start-dm', { detail: userId }));
      onClose();
  };

  const handleNotificationChange = (setting: NotificationSetting) => {
      if (setting === 'MUTED') {
          setShowMuteOptions(!showMuteOptions);
      } else {
          updateChat(chat.id, { notificationSettings: setting, mutedUntil: undefined });
          setShowMuteOptions(false);
      }
  };

  const handleMuteDuration = (duration: '1H' | '8H' | '24H' | 'FOREVER') => {
      let mutedUntil = 'FOREVER';
      if (duration !== 'FOREVER') {
          const date = new Date();
          if (duration === '1H') date.setHours(date.getHours() + 1);
          if (duration === '8H') date.setHours(date.getHours() + 8);
          if (duration === '24H') date.setHours(date.getHours() + 24);
          mutedUntil = date.toISOString();
      }
      updateChat(chat.id, { notificationSettings: 'MUTED', mutedUntil });
      setShowMuteOptions(false);
  };

  const handleDeleteChat = () => {
      const label = chat.type === 'GROUP' ? 'Leave Group' : 'Delete Chat';
      if (window.confirm(`Are you sure you want to ${label}?`)) {
          deleteChat(chat.id);
      }
  };

  const handleClearHistory = () => {
      if (window.confirm("Are you sure you want to clear all messages in this chat? This cannot be undone.")) {
          clearChatHistory(chat.id);
          onClose(); 
      }
  };

  const handleArchiveChat = () => {
      if (chat.isArchived) {
          unarchiveChat(chat.id);
      } else {
          archiveChat(chat.id);
          onClose(); // Close sidebar to return to list, where archived chats might be hidden
      }
  };

  const handleAddCategory = () => {
      if (newCategoryName.trim()) {
          // Check if category exists
          const existing = currentUser.friendCategories?.find(c => c.name.toLowerCase() === newCategoryName.toLowerCase());
          if (existing) {
              // Assign to existing
              if (targetMember) assignFriendToCategory(existing.id, targetMember.id);
          } else {
              createFriendCategory(newCategoryName.trim(), '#'+Math.floor(Math.random()*16777215).toString(16));
          }
          setNewCategoryName('');
      }
  };

  // --- SUB-COMPONENTS ---

  const NotificationSection = () => {
      const currentNotification = chat.notificationSettings || 'ALL';
      
      const getMuteLabel = () => {
        if (currentNotification !== 'MUTED') return "Mute";
        if (!chat.mutedUntil || chat.mutedUntil === 'FOREVER') return "Muted Forever";
        const date = new Date(chat.mutedUntil);
        return `Muted until ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      };

      return (
        <div className="space-y-4 mb-8">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center gap-2">
                <Bell size={12} /> Notifications
            </h3>
            <div className="bg-white/5 rounded-xl p-1 border border-white/5 flex flex-col gap-1">
                <button 
                    onClick={() => handleNotificationChange('ALL')}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${currentNotification === 'ALL' ? 'bg-signal/20 border border-signal/50 text-white shadow-lg shadow-signal/10' : 'hover:bg-white/5 text-gray-400 border border-transparent'}`}
                >
                    <Bell size={16} className={currentNotification === 'ALL' ? 'text-signal' : ''} />
                    <div className="text-left">
                        <div className="text-xs font-bold">All Messages</div>
                        <div className="text-[10px] opacity-70">Get notified for everything</div>
                    </div>
                </button>
                <button 
                    onClick={() => handleNotificationChange('MENTIONS')}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${currentNotification === 'MENTIONS' ? 'bg-orange-500/20 border border-orange-500/50 text-white shadow-lg shadow-orange-500/10' : 'hover:bg-white/5 text-gray-400 border border-transparent'}`}
                >
                    <AtSign size={16} className={currentNotification === 'MENTIONS' ? 'text-orange-500' : ''} />
                    <div className="text-left">
                        <div className="text-xs font-bold">Mentions Only</div>
                        <div className="text-[10px] opacity-70">Only when tagged</div>
                    </div>
                </button>
                <button 
                    onClick={() => handleNotificationChange('MUTED')}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${currentNotification === 'MUTED' ? 'bg-red-500/20 border border-red-500/20 text-white shadow-lg shadow-red-500/10' : 'hover:bg-white/5 text-gray-400 border border-transparent'}`}
                >
                    <BellOff size={16} className={currentNotification === 'MUTED' ? 'text-red-500' : ''} />
                    <div className="text-left">
                        <div className="text-xs font-bold">{getMuteLabel()}</div>
                        <div className="text-[10px] opacity-70">No push notifications</div>
                    </div>
                </button>
                
                {showMuteOptions && (
                    <div className="pl-11 pr-2 pb-2 space-y-1 animate-in slide-in-from-top-2 fade-in">
                        <div className="h-[1px] bg-white/5 mb-2"></div>
                        <button onClick={() => handleMuteDuration('1H')} className="w-full text-left text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-white/5 rounded flex items-center gap-2">
                            <Clock size={12} /> For 1 Hour
                        </button>
                        <button onClick={() => handleMuteDuration('8H')} className="w-full text-left text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-white/5 rounded flex items-center gap-2">
                            <Clock size={12} /> For 8 Hours
                        </button>
                        <button onClick={() => handleMuteDuration('24H')} className="w-full text-left text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-white/5 rounded flex items-center gap-2">
                            <Clock size={12} /> For 24 Hours
                        </button>
                        <button onClick={() => handleMuteDuration('FOREVER')} className="w-full text-left text-xs text-gray-400 hover:text-white py-1.5 px-2 hover:bg-white/5 rounded flex items-center gap-2">
                            <Ban size={12} /> Until I turn it back on
                        </button>
                    </div>
                )}
            </div>
        </div>
      );
  };

  // --- RENDER VIEWS ---

  // 1. MEMBER PROFILE VIEW (Used for DMs or Drilling down in Groups)
  if (targetMember) {
      const isBlocked = currentUser.blockedUserIds?.includes(targetMember.id);
      const isFriend = myFriends.some(friend => friend.id === targetMember.id);
      const isCloseFriend = closeFriendIds.includes(targetMember.id);
      const assignedCategories = currentUser.friendCategories?.filter(c => c.userIds.includes(targetMember.id) && c.id !== 'sys_close_friends') || [];
      const isSupporter = checkIsSupporter(targetMember.id);

      const handleRemoveFriend = () => {
          if (window.confirm(`Remove ${targetMember.displayName} from friends?`)) {
              removeFriend(targetMember.id);
              if (isDM) onClose(); else setViewedMemberId(null);
          }
      };

      const handleAddFriend = () => {
          addFriend(targetMember);
      };

      const handleBlockToggle = () => {
          if (isBlocked) unblockUser(targetMember.id);
          else if (window.confirm(`Block ${targetMember.displayName}?`)) blockUser(targetMember.id);
      };

      return (
        <div className="w-full h-full bg-[#0F1115] flex flex-col relative z-30 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                    {!isDM && (
                        <button onClick={() => setViewedMemberId(null)} className="p-1 -ml-1 text-gray-400 hover:text-white rounded-full hover:bg-white/5">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Profile</span>
                </div>
                <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* FULL GALLERY OVERLAY */}
            {showFullGallery && (
                <SharedMediaGallery 
                    messages={chatMessages} 
                    onClose={() => setShowFullGallery(false)} 
                />
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 flex flex-col">
                {/* Identity */}
                <div className="flex flex-col items-center mb-6 mt-4">
                    <div className="relative mb-5">
                        <img 
                            src={targetMember.avatarUrl} 
                            className="w-32 h-32 rounded-full object-cover border-4 border-[#0F1115] ring-1 ring-white/10 shadow-2xl"
                            alt={targetMember.displayName} 
                        />
                        {targetMember.status === 'ONLINE' && (
                            <div className="absolute bottom-2 right-2 w-6 h-6 bg-mint border-4 border-[#0F1115] rounded-full shadow-sm" title="Online"></div>
                        )}
                        {isSupporter && (
                            <div className="absolute -top-1 -right-1 bg-pink-500 text-white p-1.5 rounded-full border-4 border-[#0F1115] shadow-lg" title="Server Supporter">
                                <Heart size={14} fill="currentColor" />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-white mb-1 text-center tracking-tight">{targetMember.displayName}</h2>
                        {isSupporter && <Heart size={16} className="text-pink-500 fill-pink-500 mb-1" />}
                    </div>
                    <p className="text-sm text-signal font-medium mb-1">{targetMember.handle}</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500"><MapPin size={10} /> Malmö, Sweden</div>
                </div>

                {/* Actions Inline (Primary / Connecting) */}
                <div className="mb-8 space-y-3">
                    {isFriend ? (
                        <div className="flex gap-2">
                            {!isDM && (
                                <button 
                                    onClick={() => handleStartDM(targetMember.id)}
                                    className="flex-1 py-3.5 bg-signal hover:bg-blue-600 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-signal/20 active:scale-[0.98]"
                                >
                                    <MessageSquare size={18} /> Message
                                </button>
                            )}
                            <button
                               onClick={() => toggleCloseFriend(targetMember.id)}
                               className={`
                                   ${!isDM ? 'w-14' : 'w-full'} py-3.5 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg active:scale-[0.98]
                                   ${isCloseFriend 
                                       ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20' 
                                       : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'}
                               `}
                               title={isCloseFriend ? "Remove from Close Friends" : "Add to Close Friends"}
                            >
                               <Star size={20} fill={isCloseFriend ? "currentColor" : "none"} />
                               {isDM && <span className="ml-2">Close Friend</span>} 
                            </button>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={handleAddFriend}
                                className="w-full py-3.5 bg-signal hover:bg-blue-600 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-signal/20 active:scale-[0.98]"
                            >
                                <UserPlus size={18} /> Add Friend
                            </button>

                            {!isDM && (
                                <button 
                                    onClick={() => handleStartDM(targetMember.id)}
                                    className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl font-bold text-gray-400 hover:text-white flex items-center justify-center gap-2 transition-all text-xs active:scale-[0.98]"
                                >
                                    <MessageSquare size={18} /> Message
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* CATEGORIES SECTION (Friend Only) */}
                {isFriend && (
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Tag size={12} /> Tags
                            </h3>
                            <button 
                                onClick={() => setIsManagingTags(!isManagingTags)}
                                className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {assignedCategories.length === 0 && !isManagingTags && (
                                <span className="text-xs text-gray-500 italic px-1">No tags assigned.</span>
                            )}
                            
                            {assignedCategories.map(cat => (
                                <div key={cat.id} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-bold text-gray-300">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                    {cat.name}
                                    {isManagingTags && (
                                        <button 
                                            onClick={() => removeFriendFromCategory(cat.id, targetMember.id)}
                                            className="ml-1 p-0.5 hover:bg-white/10 rounded-full text-gray-500 hover:text-red-400"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add / Manage Tags UI */}
                        {isManagingTags && (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 animate-in slide-in-from-top-2">
                                <div className="mb-3 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {currentUser.friendCategories?.map(cat => {
                                        if (cat.id === 'sys_close_friends') return null; // Skip system category in manual tags
                                        const isAssigned = cat.userIds.includes(targetMember.id);
                                        if (isAssigned) return null; // Already shown above
                                        
                                        return (
                                            <button 
                                                key={cat.id}
                                                onClick={() => assignFriendToCategory(cat.id, targetMember.id)}
                                                className="w-full text-left px-2 py-1.5 hover:bg-white/10 rounded-lg text-xs text-gray-300 flex items-center gap-2"
                                            >
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                                {cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="New tag..."
                                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-signal/50"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                    />
                                    <button 
                                        onClick={handleAddCategory}
                                        disabled={!newCategoryName.trim()}
                                        className="px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {targetMember.bio && (
                    <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5 mb-8 backdrop-blur-sm">
                        <p className="text-sm text-gray-300 leading-relaxed italic">"{targetMember.bio}"</p>
                    </div>
                )}

                {/* SHARED MEDIA WIDGET (DM ONLY) */}
                {isDM && (
                    <SharedMediaWidget 
                        messages={chatMessages} 
                        onClickViewAll={() => setShowFullGallery(true)} 
                    />
                )}

                {/* Only show Notifications in DM view, not when inspecting member in Group */}
                {isDM && <NotificationSection />}

                {/* Mutuals / Stats */}
                <div className="space-y-4 mb-8">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Connections</h3>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-gray-400 border border-white/5">
                            <Users size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">3 Mutual Friends</div>
                            <div className="text-xs text-gray-500">Sarah, Marcus, +1</div>
                        </div>
                    </div>
                </div>

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* BOTTOM ACTIONS (Destructive / Management) */}
                <div className="pt-4 mt-4 border-t border-white/5 space-y-3 shrink-0">
                    {/* DM Specific Actions */}
                    {isDM && (
                        <>
                            <button 
                                onClick={handleArchiveChat}
                                className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                {chat.isArchived ? <Inbox size={18} /> : <Archive size={18} />} 
                                {chat.isArchived ? 'Unarchive Chat' : 'Archive Chat'}
                            </button>
                            <button 
                                onClick={handleClearHistory}
                                className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                <Eraser size={18} /> Clear History
                            </button>
                            <button 
                                onClick={handleDeleteChat}
                                className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 hover:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/5 active:scale-[0.98]"
                            >
                                <Trash2 size={18} /> Delete Chat
                            </button>
                        </>
                    )}

                    {/* Friend Management Actions */}
                    {isFriend && (
                        <button 
                            onClick={handleRemoveFriend}
                            className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl font-bold text-gray-400 hover:text-white flex items-center justify-center gap-2 transition-all text-xs active:scale-[0.98]"
                        >
                            <UserMinus size={16} /> Remove Friend
                        </button>
                    )}
                    
                    <button 
                        onClick={handleBlockToggle}
                        className={`
                            w-full py-3.5 border rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs active:scale-[0.98]
                            ${isBlocked 
                                ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white' 
                                : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/10 hover:border-red-500/30 text-red-500 hover:text-red-400'}
                        `}
                    >
                        <Ban size={16} /> {isBlocked ? 'Unblock User' : 'Block User'}
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // 2. GROUP PROFILE VIEW (Default for Groups)
  return (
    <div className="w-full h-full bg-[#0F1115] flex flex-col relative z-30 shadow-2xl">
        <div className="flex items-center justify-between p-6 pb-2 shrink-0">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Group Info</span>
            <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* FULL GALLERY OVERLAY (Group) */}
        {showFullGallery && (
            <SharedMediaGallery 
                messages={chatMessages} 
                onClose={() => setShowFullGallery(false)} 
            />
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 flex flex-col">
            <div className="flex flex-col items-center mb-6 mt-4">
                <div className="relative mb-5">
                    <img 
                        src={chat.avatarUrl} 
                        className="w-32 h-32 rounded-full object-cover border-4 border-[#0F1115] ring-1 ring-white/10 shadow-2xl"
                        alt={chat.name} 
                    />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1 text-center tracking-tight">{chat.name}</h2>
                <p className="text-sm text-gray-500 font-medium mb-1">{members.length} members</p>
            </div>

            {/* SHARED MEDIA WIDGET (GROUP) */}
            <SharedMediaWidget 
                messages={chatMessages} 
                onClickViewAll={() => setShowFullGallery(true)} 
                />

            <NotificationSection />

            {/* Members List */}
            <div className="space-y-4 mb-8">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center gap-2">
                    <Users size={12} /> Members
                </h3>
                <div className="space-y-1">
                    {members.map(member => {
                        const isSupporter = checkIsSupporter(member.id);
                        
                        return (
                            <button 
                                key={member.id}
                                onClick={() => setViewedMemberId(member.id)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left group"
                            >
                                <div className="relative shrink-0">
                                    <img src={member.avatarUrl} className="w-10 h-10 rounded-full object-cover bg-gray-800" alt={member.displayName} />
                                    {member.status === 'ONLINE' && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-mint rounded-full border-2 border-[#0F1115]"></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <div className="text-sm font-bold text-white group-hover:text-signal transition-colors truncate">{member.displayName}</div>
                                        {isSupporter && <Heart size={10} className="text-pink-500 fill-pink-500" />}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">{member.handle}</div>
                                </div>
                                <ChevronRight size={14} className="text-gray-600 group-hover:text-white" />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Map Settings */}
            <div className="space-y-4 mb-8">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center gap-2">
                    <MapPin size={12} /> Map Visibility
                </h3>
                <div className="bg-white/5 rounded-xl p-1 border border-white/5 flex flex-col gap-1">
                    <button 
                        onClick={() => updateChat(chat.id, { mapVisibility: 'ALWAYS' })}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${chat.mapVisibility === 'ALWAYS' ? 'bg-signal/20 border border-signal/50 text-white' : 'hover:bg-white/5 text-gray-400 border border-transparent'}`}
                    >
                        <Eye size={16} className={chat.mapVisibility === 'ALWAYS' ? 'text-signal' : ''} />
                        <div className="text-left">
                            <div className="text-xs font-bold">Always show</div>
                            <div className="text-[10px] opacity-70">Visible to all members</div>
                        </div>
                    </button>
                    <button 
                        onClick={() => updateChat(chat.id, { mapVisibility: 'ASK' })}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${chat.mapVisibility === 'ASK' ? 'bg-orange-500/20 border border-orange-500/50 text-white shadow-lg shadow-orange-500/10' : 'hover:bg-white/5 text-gray-400 border border-transparent'}`}
                    >
                        <HelpCircle size={16} className={chat.mapVisibility === 'ASK' ? 'text-orange-500' : ''} />
                        <div className="text-left">
                            <div className="text-xs font-bold">Ask to show</div>
                            <div className="text-[10px] opacity-70">Confirm before showing</div>
                        </div>
                    </button>
                    <button 
                        onClick={() => updateChat(chat.id, { mapVisibility: 'NEVER' })}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${chat.mapVisibility === 'NEVER' ? 'bg-red-500/20 border border-red-500/50 text-white shadow-lg shadow-red-500/10' : 'hover:bg-white/5 text-gray-400 border border-transparent'}`}
                    >
                        <EyeOff size={16} className={chat.mapVisibility === 'NEVER' ? 'text-red-500' : ''} />
                        <div className="text-left">
                            <div className="text-xs font-bold">Don't show</div>
                            <div className="text-[10px] opacity-70">Hidden from map</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Leave Group Button - Moved to bottom */}
            <div className="pt-4 mt-4 border-t border-white/5 space-y-3 shrink-0">
                <button 
                    onClick={handleArchiveChat}
                    className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    {chat.isArchived ? <Inbox size={18} /> : <Archive size={18} />} 
                    {chat.isArchived ? 'Unarchive Group' : 'Archive Group'}
                </button>
                <button 
                    onClick={handleClearHistory}
                    className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    <Eraser size={18} /> Clear History
                </button>
                <button 
                    onClick={handleDeleteChat}
                    className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 hover:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/5 active:scale-[0.98]"
                >
                    <LogOut size={18} /> Leave Group
                </button>
            </div>
        </div>
    </div>
  );
};
