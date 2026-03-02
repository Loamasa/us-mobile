import React, { useState, useRef, useEffect } from 'react';
import { 
  Globe, Map as MapIcon, Tag, ChevronDown, X, 
  UserPlus, Settings, Plus, FolderPlus, Calendar, 
  Bell, Shield, EyeOff, Eye, LogOut, Map as MapIconLucide
} from 'lucide-react';
import { Community } from '../../../../types';
import { ViewMode } from '../../hooks/useCommunityLogic';
import { useCommunityContext } from '../../context/CommunityContext';
import { useData } from '../../../../context/DataContext';
import { ServerSupportHeader } from '../../../monetization/components/ServerSupportHeader';

interface SidebarHeaderProps {
  community: Community;
  communityTags?: Community[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onBack: () => void;
  tabs: { id: ViewMode; label: string }[];
  onCreateEvent?: () => void;
  onOpenCommunityMap?: () => void; 
  onOpenSettings?: () => void;
  onCreateChannel?: () => void;
  onInvitePeople?: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  community,
  communityTags = [],
  viewMode,
  setViewMode,
  onBack,
  tabs,
  onCreateEvent,
  onOpenCommunityMap,
  onOpenSettings,
  onCreateChannel,
  onInvitePeople
}) => {
  const { onLeaveCommunity, openCreateCategoryModal, userRole } = useCommunityContext();
  const { currentUser, updateUserProfile } = useData();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isTopic = community.type === 'TOPIC';

  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const toggleHideMuted = () => {
      updateUserProfile({
          settings: {
              ...currentUser.settings!,
              hideMutedChannels: !currentUser.settings?.hideMutedChannels
          }
      });
  };

  const handleOpenSupport = () => {
      window.dispatchEvent(new CustomEvent('open-server-support-modal', { detail: community.id }));
  };

  const MenuItem = ({ 
    icon: Icon, 
    label, 
    onClick, 
    destructive = false, 
    colorClass = "text-gray-400 group-hover:text-white" 
  }: any) => (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
        setIsMenuOpen(false);
      }}
      className={`
        w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group
        ${destructive 
            ? 'hover:bg-red-500/10 text-red-400 hover:text-red-300' 
            : 'hover:bg-white/5 text-gray-200 hover:text-white'}
      `}
    >
      <span className="text-sm font-medium">{label}</span>
      <Icon size={18} className={destructive ? "text-red-400" : colorClass} />
    </button>
  );

  const MenuSeparator = () => <div className="h-[1px] bg-white/5 my-1.5 mx-2" />;

  // MENU RENDERER
  const renderMenu = () => {
    return (
        <div className="flex flex-col">
            <MenuItem icon={UserPlus} label="Invite People" onClick={onInvitePeople} colorClass="text-signal" />
            {isAdmin && (
                <>
                    <MenuItem icon={Settings} label="Community Settings" onClick={onOpenSettings} />
                    {!isTopic && <MenuItem icon={Plus} label="Create Channel" onClick={onCreateChannel} />}
                    {!isTopic && <MenuItem icon={FolderPlus} label="Create Category" onClick={openCreateCategoryModal} />}
                    {!isTopic && <MenuItem icon={Calendar} label="Create Event" onClick={onCreateEvent} />}
                </>
            )}
            {!isTopic && <MenuItem icon={MapIconLucide} label="Community Map" onClick={onOpenCommunityMap} />}
            <MenuSeparator />
            <MenuItem icon={Bell} label="Notification Settings" />
            <MenuItem 
                icon={currentUser.settings?.hideMutedChannels ? Eye : EyeOff} 
                label={currentUser.settings?.hideMutedChannels ? "Show Muted Channels" : "Hide Muted Channels"} 
                onClick={toggleHideMuted}
            />
            <MenuSeparator />
            <MenuItem icon={LogOut} label="Leave Community" onClick={onLeaveCommunity} destructive />
        </div>
    );
  };

  return (
    <div className="shrink-0 flex flex-col bg-[#0F1115] z-10 pb-2 relative">
        
        {/* Main Header Click Area */}
        <div 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`
                flex flex-col px-4 pt-4 pb-3 border-b border-white/5 mb-4 cursor-pointer transition-colors
                hover:bg-white/5 group relative
            `}
        >
             {/* Top Row: Icon and Name Details */}
             <div className="flex items-start gap-3 w-full">
                <img 
                    src={community.iconUrl} 
                    className="w-12 h-12 rounded-xl border border-white/10 shadow-lg group-hover:border-white/30 transition-colors object-cover shrink-0 mt-0.5" 
                    alt={community.name} 
                />
                
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between w-full gap-2">
                        <h1 className="font-bold text-white text-lg truncate leading-tight">
                            {community.name}
                        </h1>
                        {isMenuOpen ? <X size={16} className="text-gray-500 shrink-0" /> : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
                    </div>
                    <span className={`text-[10px] font-medium flex items-center gap-1.5 ${isTopic ? 'text-mint' : 'text-gray-500'} mt-0.5`}>
                        {isTopic ? <Globe size={10} className="text-mint" /> : <MapIcon size={10} />}
                        {isTopic ? 'Culture' : 'Local Community'}
                    </span>
                </div>
             </div>
             
             {/* Second Row: Badges (Moved below to prevent text cutoff) */}
             {(!isTopic) && (
                 <div className="flex flex-wrap items-center gap-2 mt-3 animate-in fade-in slide-in-from-top-1 duration-300">
                     <ServerSupportHeader communityId={community.id} onOpenSupport={handleOpenSupport} />
                     
                     {communityTags.length > 0 && (
                         <>
                            <div className="w-[1px] h-4 bg-white/10 mx-1 hidden sm:block"></div>
                            {communityTags.map(tag => (
                                 <div key={tag.id} className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-full px-2 py-0.5 text-[10px] text-gray-400">
                                     <Tag size={10} />
                                     {tag.name}
                                 </div>
                             ))}
                         </>
                     )}
                 </div>
             )}
             
             {/* Topic Tags only */}
             {isTopic && communityTags.length > 0 && (
                 <div className="flex flex-wrap gap-1.5 mt-2">
                     {communityTags.map(tag => (
                         <div key={tag.id} className="flex items-center gap-1 bg-white/5 border border-white/5 rounded px-1.5 py-0.5 text-[10px] text-gray-300">
                             <Tag size={8} />
                             {tag.name}
                         </div>
                     ))}
                 </div>
             )}

             {/* DROPDOWN MENU - Positioned relative to header container */}
             {isMenuOpen && (
                <div 
                    ref={menuRef}
                    className="absolute top-full left-0 right-0 mt-1 mx-2 bg-[#111111] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[60] p-1 animate-in fade-in slide-in-from-top-2 duration-200 cursor-default"
                    onClick={(e) => e.stopPropagation()}
                >
                    {renderMenu()}
                </div>
            )}
        </div>
        
        {/* Tabs */}
        <div className="px-4 mb-2">
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setViewMode(tab.id)}
                        className={`
                            flex-1 py-2 rounded-lg text-[10px] font-bold transition-all duration-200 uppercase tracking-wider
                            ${viewMode === tab.id 
                                ? 'bg-white/10 text-white shadow-sm border border-white/5' 
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};