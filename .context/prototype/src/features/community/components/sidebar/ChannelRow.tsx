
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Megaphone, BookOpen, Info, Radio, Gamepad, Hash, Camera, Wrench, Map as MapIcon, Flame, Settings, Trash2, Check, X, Edit2, Bell, BellOff, AtSign } from 'lucide-react';
import { Channel, NotificationSetting } from '../../../../types';

interface ChannelRowProps {
  id?: string;
  name: string;
  type?: 'text' | 'voice';
  category?: string;
  notificationSettings?: NotificationSetting;
  isActive: boolean;
  onClick: () => void;
  onUpdate?: (data: Partial<Channel>) => void;
  onDelete?: () => void;
}

export const ChannelRow: React.FC<ChannelRowProps> = ({ 
    id, 
    name, 
    type = 'text', 
    category, 
    notificationSettings,
    isActive, 
    onClick, 
    onUpdate, 
    onDelete 
}) => {
  const isGathering = category === 'Live Gatherings';
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (isEditing && inputRef.current) {
          inputRef.current.focus();
      }
  }, [isEditing]);

  const handleSave = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (editedName.trim() && editedName !== name) {
          if (onUpdate) onUpdate({ name: editedName.trim() });
      } else {
          setEditedName(name); // Revert if empty or same
      }
      setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') {
          setEditedName(name);
          setIsEditing(false);
      }
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDelete) onDelete();
  };

  const toggleNotifications = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onUpdate) return;

      const current = notificationSettings || 'ALL';
      let next: NotificationSetting;

      if (current === 'ALL') next = 'MENTIONS';
      else if (current === 'MENTIONS') next = 'MUTED';
      else next = 'ALL';

      onUpdate({ notificationSettings: next });
  };

  const getNotificationIcon = () => {
      if (notificationSettings === 'MUTED') return <BellOff size={12} className="text-gray-500" />;
      if (notificationSettings === 'MENTIONS') return <AtSign size={12} className="text-orange-500" />;
      return <Bell size={12} className="text-gray-500" />;
  };

  const getChannelIcon = () => {
    if (category === 'Live Gatherings') return <Flame size={16} className="animate-pulse text-mint" />;
    if (type === 'voice') return <Mic size={16} />;
    const n = name.toLowerCase();
    if (n.includes('announcement')) return <Megaphone size={16} />;
    if (n.includes('welcome') || n.includes('rules')) return <BookOpen size={16} />;
    if (n.includes('info')) return <Info size={16} />;
    if (n.includes('music') || n.includes('jam')) return <Radio size={16} />;
    if (n.includes('game') || n.includes('nintendo') || n.includes('sega')) return <Gamepad size={16} />;
    if (n.includes('photo')) return <Camera size={16} />;
    if (n.includes('gear') || n.includes('modular') || n.includes('repair')) return <Wrench size={16} />;
    if (n.includes('place') || n.includes('trail')) return <MapIcon size={16} />;
    return <Hash size={16} />;
  };

  return (
    <div 
        ref={containerRef}
        onClick={!isEditing ? onClick : undefined}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        className={`
            relative flex items-center gap-3 px-4 py-3 mx-2 rounded-xl cursor-pointer transition-all duration-200 border group
            ${isActive 
                ? `bg-white/5 border-white/10 text-white shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-sm` 
                : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }
            ${isGathering && !isActive ? 'bg-mint/5 border-mint/10 text-mint' : ''}
        `}
    >
        <div className={`
            flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0
            ${isActive 
                ? (isGathering ? 'bg-mint text-black shadow-lg shadow-mint/20' : 'bg-signal text-white shadow-lg shadow-signal/20') 
                : 'bg-white/5 text-gray-500'
            }
        `}>
            {getChannelIcon()}
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
            {isEditing ? (
                <div className="flex items-center">
                    <input 
                        ref={inputRef}
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        onBlur={() => handleSave()}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-black/50 text-white text-sm px-1 py-0.5 rounded border border-white/20 w-full focus:outline-none focus:border-signal"
                    />
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm leading-none truncate ${isActive ? 'text-white' : ''}`}>
                        {name}
                    </span>
                    {/* Always show muted/mention status if explicitly set, otherwise show on hover */}
                    {(!isGathering && onUpdate && !showActions && notificationSettings && notificationSettings !== 'ALL') && (
                        <div className="opacity-70">{getNotificationIcon()}</div>
                    )}
                    {isActive && <span className={`text-[10px] mt-0.5 font-medium animate-pulse ${isGathering ? 'text-mint' : 'text-signal'}`}>Active now</span>}
                </div>
            )}
        </div>

        {/* Action Buttons (Edit/Notification/Delete) */}
        {!isGathering && (onUpdate || onDelete) && !isEditing && (
            <div className={`flex items-center gap-1 absolute right-2 bg-[#0F1115] pl-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {onUpdate && (
                    <>
                        <button 
                            onClick={toggleNotifications}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
                            title={`Notifications: ${notificationSettings || 'ALL'}`}
                        >
                            {getNotificationIcon()}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditedName(name); }}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
                            title="Rename Channel"
                        >
                            <Edit2 size={12} />
                        </button>
                    </>
                )}
                {onDelete && (
                    <button 
                        onClick={handleDelete}
                        className="p-1.5 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete Channel"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        )}

        {/* Active Indicator (Hidden when actions shown to prevent overlap clutter) */}
        {isActive && !showActions && !isEditing && (
            <div className={`absolute right-4 w-1.5 h-1.5 rounded-full shadow-[0_0_8px] ${isGathering ? 'bg-mint shadow-mint' : 'bg-signal shadow-signal'}`} />
        )}
    </div>
  );
};