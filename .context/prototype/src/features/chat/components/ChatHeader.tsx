
import React, { useState, useRef, useEffect } from 'react';
import { ChatSummary, User } from '../../../types';
import { ArrowLeft, Video, Info, Phone, Hash, Globe, Users, Edit2, Flame, MapPin } from 'lucide-react';
import { useData } from '../../../context/DataContext';

interface ChatHeaderProps {
  chat: ChatSummary;
  members: User[];
  onBack: () => void;
  onToggleProfile: () => void;
  showActions?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
    chat, 
    members, 
    onBack, 
    onToggleProfile, 
    showActions = true 
}) => {
    const { updateChat, userLocations, currentUser, users: myFriends } = useData();
    
    // Edit State
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(chat.name);
    
    const inputRef = useRef<HTMLInputElement>(null);
    
    // --- 1. DETERMINE TYPE ---
    const isChannel = chat.name.startsWith('#') || (chat.type === 'GROUP' && chat.id.startsWith('channel-'));
    const isGathering = chat.type === 'GATHERING';
    const isDM = chat.type === 'DM';
    const isGroup = chat.type === 'GROUP' && !isChannel;

    // Only DMs and User-created Groups are interactive (open profile) via header click
    const isInteractive = isDM || isGroup;

    useEffect(() => {
        setEditedName(chat.name || "Group Chat");
    }, [chat.name]);

    useEffect(() => {
        if (isEditingName && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditingName]);

    const handleSaveName = () => {
        if (editedName.trim() && editedName !== chat.name) {
            updateChat(chat.id, { name: editedName.trim() });
        }
        setIsEditingName(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            setEditedName(chat.name || "Group Chat");
            setIsEditingName(false);
        }
    };

    // --- 2. SUB-COMPONENTS ---

    const DMHeader = () => {
        const otherUser = members.find(m => !m.id.startsWith('u1')) || members[0]; 
        const presence = otherUser ? userLocations[otherUser.id] : null;
        
        const handleLocationClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (presence?.coordinates) {
                window.dispatchEvent(new CustomEvent('view-map-location', { detail: presence.coordinates }));
            }
        };

        const isGatheringType = presence?.type === 'GATHERING';
        const isClusterType = presence?.type === 'CLUSTER';

        return (
            <div className="flex items-center gap-3.5">
                <div className="relative">
                    <img 
                        src={chat.avatarUrl} 
                        className="w-10 h-10 rounded-full object-cover bg-gray-800 border border-white/10" 
                        alt={chat.name} 
                    />
                    {chat.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-mint border-2 border-void rounded-full shadow-sm"></div>
                    )}
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-base text-white leading-tight truncate">
                            {chat.name}
                        </h2>
                        {presence && (
                            <button
                                onClick={handleLocationClick}
                                className={`
                                    px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border transition-transform hover:scale-105 active:scale-95
                                    ${isClusterType ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                      isGatheringType ? 'bg-mint/10 text-mint border-mint/20' : 
                                      'bg-purple-500/10 text-purple-400 border-purple-500/20'}
                                `}
                            >
                                {isClusterType ? <Users size={8} /> : 
                                 isGatheringType ? <Flame size={8} className="fill-current" /> : 
                                 <MapPin size={8} />}
                                {isClusterType ? (presence.name || 'With Friends') : 
                                 isGatheringType ? 'At Gathering' : 'At Place'}
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 font-medium truncate flex items-center gap-1">
                        {otherUser?.handle || '@username'} 
                        {presence ? (
                            <button onClick={handleLocationClick} className="text-white flex items-center gap-1 hover:underline decoration-white/30">
                                • {presence.name}
                            </button>
                        ) : chat.online ? (
                            <span className="text-mint">• Active now</span>
                        ) : ''}
                    </p>
                </div>
            </div>
        );
    };

    const GroupHeader = () => {
        const facepileMembers = members.slice(0, 3);
        
        // --- HIERARCHY LOGIC FOR HEADER ---
        const activeMembers = members.map(m => ({ id: m.id, loc: userLocations[m.id] })).filter(m => m.loc);
        let resolvedStatus: { type: 'CLUSTER' | 'GATHERING' | 'LOC'; text: string; coordinates?: any } | null = null;

        // 1. Cluster Check
        const clusterMatch = activeMembers.find(m => m.loc?.type === 'CLUSTER' && m.loc.name === chat.name);
        if (clusterMatch && clusterMatch.loc) {
            resolvedStatus = { type: 'CLUSTER', text: 'WITH FRIENDS', coordinates: clusterMatch.loc.coordinates };
        } else {
            // 2. Gathering Check
            const gatheringCounts: Record<string, { count: number, coords: any }> = {};
            activeMembers.forEach(m => {
                if (m.loc?.type === 'GATHERING') {
                    gatheringCounts[m.loc.name] = { 
                        count: (gatheringCounts[m.loc.name]?.count || 0) + 1,
                        coords: m.loc.coordinates
                    };
                }
            });
            const dominantGathering = Object.entries(gatheringCounts).find(e => e[1].count > 1);
            if (dominantGathering) {
                resolvedStatus = { type: 'GATHERING', text: dominantGathering[0], coordinates: dominantGathering[1].coords };
            } else {
                // 3. Loc Check
                const spotCounts: Record<string, { count: number, coords: any }> = {};
                activeMembers.forEach(m => {
                    if (m.loc?.type === 'SPOT') {
                        spotCounts[m.loc.name] = {
                            count: (spotCounts[m.loc.name]?.count || 0) + 1,
                            coords: m.loc.coordinates
                        };
                    }
                });
                // Only show if > 1 member at spot
                const dominantSpot = Object.entries(spotCounts).find(e => e[1].count > 1);
                if (dominantSpot) {
                    resolvedStatus = { type: 'LOC', text: dominantSpot[0], coordinates: dominantSpot[1].coords };
                }
            }
        }

        const handleStatusClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (resolvedStatus?.coordinates) {
                window.dispatchEvent(new CustomEvent('view-map-location', { detail: resolvedStatus.coordinates }));
            }
        };
        
        return (
            <div className="flex items-center gap-3.5">
                <div className="flex items-center pl-1">
                    {members.length > 0 ? (
                        <div className="flex -space-x-3">
                            {facepileMembers.map((m, i) => (
                                <img 
                                    key={m.id}
                                    src={m.avatarUrl}
                                    className="w-9 h-9 rounded-full border-2 border-void object-cover ring-1 ring-white/10 z-10"
                                    style={{ zIndex: 30 - i * 10 }}
                                    alt={m.displayName}
                                />
                            ))}
                            {members.length > 3 && (
                                <div className="w-9 h-9 rounded-full bg-white/10 border-2 border-void flex items-center justify-center text-[10px] font-bold text-white z-0 relative -ml-3">
                                    +{members.length - 3}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-gray-400">
                            <Users size={20} />
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex flex-col justify-center flex-1">
                    <div className="flex items-center gap-2">
                        {isEditingName ? (
                            <input
                                ref={inputRef}
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                onBlur={handleSaveName}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="font-bold text-base text-white bg-black/50 border border-white/20 rounded px-1.5 py-0.5 w-full focus:outline-none focus:border-signal"
                            />
                        ) : (
                            <div 
                               className="group/name flex items-center gap-2 -ml-1.5 px-1.5 py-0.5 rounded hover:bg-white/10 border border-transparent hover:border-white/5 transition-all cursor-text w-fit max-w-full"
                               onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
                               title="Click to rename group"
                            >
                                <h2 className="font-bold text-base text-white leading-tight truncate">
                                    {chat.name || "Group Chat"}
                                </h2>
                                <Edit2 size={10} className="text-gray-500 opacity-0 group-hover/name:opacity-100" />
                            </div>
                        )}

                        {resolvedStatus && (
                            <button
                                onClick={handleStatusClick}
                                className={`
                                    px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border transition-transform hover:scale-105 active:scale-95 shrink-0
                                    ${resolvedStatus.type === 'CLUSTER' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                      resolvedStatus.type === 'GATHERING' ? 'bg-mint/10 text-mint border-mint/20' : 
                                      'bg-purple-500/10 text-purple-400 border-purple-500/20'}
                                `}
                            >
                                {resolvedStatus.type === 'CLUSTER' ? <Users size={8} /> : 
                                 resolvedStatus.type === 'GATHERING' ? <Flame size={8} className="fill-current" /> : 
                                 <MapPin size={8} />}
                                {resolvedStatus.type === 'CLUSTER' ? 'WITH FRIENDS' : resolvedStatus.text}
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                        {members.map(m => m.displayName.split(' ')[0]).join(', ')}
                    </p>
                </div>
            </div>
        );
    };

    const ChannelHeader = () => {
        return (
            <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-300 border border-white/10">
                    <Hash size={20} />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                    <h2 className="font-bold text-base text-white leading-tight truncate flex items-center gap-2">
                        {chat.name}
                    </h2>
                    <p className="text-xs text-gray-400 font-medium truncate flex items-center gap-1.5">
                        <Globe size={10} /> Community Channel
                    </p>
                </div>
            </div>
        );
    };

    const GatheringHeader = () => {
        // Filter out current user from display logic to say "X others"
        const otherMembers = members.filter(m => m.id !== currentUser.id);
        
        // Identify friends present (using global friends list)
        const friendIds = new Set(myFriends.map(f => f.id));
        const friendsHere = otherMembers.filter(m => friendIds.has(m.id));
        const strangersHere = otherMembers.filter(m => !friendIds.has(m.id));
        
        // Sort for Facepile: Friends first, then strangers
        const displayMembers = [...friendsHere, ...strangersHere];
        const totalHere = displayMembers.length;

        // Navigation Action
        const handleLocationClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (chat.fixedLocation) {
                window.dispatchEvent(new CustomEvent('view-map-location', { detail: chat.fixedLocation }));
            }
        };

        return (
             <div className="flex items-center gap-3.5">
                {/* Live Icon Indicator */}
                <div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center text-mint border border-mint/50 relative shrink-0">
                    <div className="absolute inset-0 bg-mint/20 rounded-full animate-ping opacity-75"></div>
                    <Flame size={20} className="fill-mint/20 relative z-10" />
                    <div className="absolute -bottom-1 -right-1 bg-mint text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-[#0F1115] z-20 shadow-lg">
                        LIVE
                    </div>
                </div>

                <div className="min-w-0 flex flex-col justify-center">
                    <h2 className="font-bold text-base text-mint leading-tight truncate">
                        {chat.name}
                    </h2>
                    
                    {/* Dynamic Status Line */}
                    <div className="flex items-center gap-2 mt-0.5">
                        
                        {/* Map Navigation Pill */}
                        <button
                            onClick={handleLocationClick}
                            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border transition-transform hover:scale-105 active:scale-95 bg-mint/10 text-mint border-mint/20 shrink-0"
                        >
                            <MapPin size={8} /> View Map
                        </button>

                        {/* Facepile - Only show if there are other people */}
                        {totalHere > 0 && (
                            <div className="flex -space-x-2 shrink-0">
                                {displayMembers.slice(0, 3).map((m, i) => {
                                    const isFriend = friendIds.has(m.id);
                                    return (
                                        <img 
                                            key={m.id}
                                            src={m.avatarUrl}
                                            className={`w-5 h-5 rounded-full object-cover z-10 ${isFriend ? 'border-2 border-mint ring-1 ring-mint/50' : 'border-2 border-void ring-1 ring-white/10'}`}
                                            style={{ zIndex: 30 - i * 10 }}
                                            alt={m.displayName}
                                            title={isFriend ? `${m.displayName} (Friend)` : m.displayName}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        <p className="text-xs font-medium truncate flex items-center gap-1">
                            {friendsHere.length > 0 ? (
                                <>
                                    <span className="text-mint font-bold">{friendsHere.length} Friend{friendsHere.length !== 1 ? 's' : ''}</span>
                                    {strangersHere.length > 0 && <span className="text-gray-500">• {strangersHere.length} others</span>}
                                </>
                            ) : (
                                <span className="text-gray-400">
                                    {totalHere === 0 ? 'Be the first here' : `${totalHere} people here`}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // --- 3. RENDER ---

    return (
        <div className={`
            h-18 min-h-[72px] flex items-center px-4 justify-between backdrop-blur-xl z-20 sticky top-0 border-b
            ${isGathering ? 'bg-mint/5 border-mint/10' : 'bg-void/90 border-white/5'}
        `}>
            
            {/* Left Side: Back & Info */}
            <div className="flex items-center gap-1 flex-1 min-w-0">
                <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white md:hidden mr-1">
                    <ArrowLeft size={20} />
                </button>
                
                {/* Clickable Area for Profile - Changed from button to div to allow nested interactive elements */}
                <div 
                    onClick={isInteractive ? onToggleProfile : undefined}
                    className={`flex-1 text-left group rounded-xl p-1 -ml-1 transition-colors ${isInteractive ? 'hover:bg-white/5 cursor-pointer' : ''}`}
                    role={isInteractive ? "button" : undefined}
                    tabIndex={isInteractive ? 0 : undefined}
                >
                   {isDM && <DMHeader />}
                   {isGroup && <GroupHeader />}
                   {isChannel && <ChannelHeader />}
                   {isGathering && <GatheringHeader />}
                </div>
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-1 relative pl-2">
                {showActions && (
                    <>
                        {isDM && (
                            <button className="p-2.5 hover:bg-white/10 rounded-full text-signal hover:text-white transition-colors">
                                <Phone size={20} />
                            </button>
                        )}
                        {(isDM || isGroup) && (
                            <button className="p-2.5 hover:bg-white/10 rounded-full text-signal hover:text-white transition-colors">
                                <Video size={20} />
                            </button>
                        )}
                        <button 
                            onClick={onToggleProfile}
                            className="p-2.5 rounded-full hover:bg-white/10 text-signal hover:text-white transition-colors"
                        >
                            <Info size={20} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
