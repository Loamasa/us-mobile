
import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageStatus, Attachment } from '../../../types';
import { ShieldPlus, Check, CheckCheck, SmilePlus, Reply, MoreVertical, Trash2, Edit2, Zap, Star, Heart } from 'lucide-react';
import { UserAvatar } from '../../../components/UserAvatar';

interface MessageBubbleProps {
  message: Message;
  sender: any;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onEdit: (message: Message) => void;
  isSupporter?: boolean; // New Prop
}

const StatusIndicator = ({ status }: { status?: MessageStatus }) => {
    if (!status || status === 'SENT') return <Check size={12} className="text-gray-400" />;
    if (status === 'DELIVERED') return <CheckCheck size={12} className="text-gray-400" />;
    if (status === 'READ') return <CheckCheck size={12} className="text-mint" />;
    return null;
};

const QuickReactions = ({ onSelect }: { onSelect: (e: string) => void }) => {
    const emojis = ['❤️', '😂', '😮', '👍', '🔥'];
    return (
        <div className="flex gap-1 p-1 bg-black/80 backdrop-blur-md rounded-full border border-white/10 shadow-xl animate-in zoom-in duration-200">
            {emojis.map(e => (
                <button key={e} onClick={() => onSelect(e)} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full text-lg transition-colors">
                    {e}
                </button>
            ))}
        </div>
    );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
    message, 
    sender,
    onReply,
    onReact,
    onDelete,
    onEdit,
    isSupporter = false
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setShowMenu(false);
            setShowReactionPicker(false);
        }
    };

    if (showMenu || showReactionPicker) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showReactionPicker]);

  if (message.type === 'SYSTEM') {
    return (
        <div className="flex justify-center my-4">
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-3 max-w-md">
                <ShieldPlus size={20} className="text-signal shrink-0" />
                <div className="text-xs text-gray-300 text-center">
                    {message.content}
                </div>
            </div>
        </div>
    );
  }

  // Group reactions by emoji
  const reactionGroups = (message.reactions || []).reduce((acc: any, curr) => {
      acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
      return acc;
  }, {});

  const hasAttachments = message.attachments && message.attachments.length > 0;
  const replyTo = message.replyToMessage;
  const isPremium = sender.subscriptionTier === 'PREMIUM';
  const isBasic = sender.subscriptionTier === 'BASIC';

  return (
    <div 
        className={`flex gap-3 ${message.isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 mb-1`}
    >
      {!message.isMe && (
          <div className="flex flex-col justify-end pb-1">
              <UserAvatar user={sender} size="sm" className="mb-0" />
          </div>
      )}
      
      <div className={`flex flex-col max-w-[75%] ${message.isMe ? 'items-end' : 'items-start'}`}>
          {!message.isMe && (
              <div className="ml-1 mb-1 flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold ${isPremium ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-400' : 'text-gray-500'}`}>
                      {sender.displayName}
                  </span>
                  
                  {/* ICONS */}
                  {isSupporter && (
                      <div className="text-pink-500 bg-pink-500/10 rounded-full p-0.5" title="Community Supporter">
                          <Heart size={8} fill="currentColor" />
                      </div>
                  )}
                  {isPremium && <Zap size={10} className="text-yellow-400 fill-yellow-400" />}
                  {isBasic && <Star size={10} className="text-blue-400 fill-blue-400" />}
              </div>
          )}

          {/* Reply Context */}
          {replyTo && (
              <div className={`
                  mb-1 text-xs px-3 py-1 rounded-lg bg-white/5 border-l-2 border-gray-500 text-gray-400 flex flex-col gap-0.5 max-w-full truncate opacity-80
                  ${message.isMe ? 'mr-0' : 'ml-0'}
              `}>
                  <span className="font-bold text-[10px] flex items-center gap-1">
                      <Reply size={8} /> Replying to {replyTo.isMe ? 'You' : 'User'}
                  </span>
                  <span className="truncate italic">"{replyTo.content}"</span>
              </div>
          )}

          {/* Main Bubble Wrapper with Anchored Menu */}
          <div className="relative group/bubble">
              
              {/* Interaction Menu (Anchored to side of bubble) */}
              <div 
                  ref={menuRef}
                  className={`
                    absolute top-0 z-20 h-full flex items-center opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200
                    ${(showMenu || showReactionPicker) ? 'opacity-100' : ''}
                    ${message.isMe ? 'right-full mr-2' : 'left-full ml-2'}
                  `}
              >
                  <div className="flex items-center bg-[#1A1D21] rounded-full border border-white/10 shadow-lg p-1">
                       {/* Quick React */}
                       <div className="relative">
                           <button 
                                onClick={() => setShowReactionPicker(!showReactionPicker)} 
                                className="p-1.5 hover:bg-white/20 rounded-full text-gray-400 hover:text-yellow-400 transition-colors"
                            >
                               <SmilePlus size={16} />
                           </button>
                           {showReactionPicker && (
                               <div className="absolute bottom-full left-0 mb-2 z-50">
                                   <QuickReactions onSelect={(e) => { onReact(message.id, e); setShowReactionPicker(false); }} />
                               </div>
                           )}
                       </div>

                       <button onClick={() => onReply(message)} className="p-1.5 hover:bg-white/20 rounded-full text-gray-400 hover:text-white transition-colors">
                           <Reply size={16} />
                       </button>
                       
                       {/* More Actions */}
                       <div className="relative">
                            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-white/20 rounded-full text-gray-400 hover:text-white transition-colors">
                                <MoreVertical size={16} />
                            </button>
                            {showMenu && (
                                <div className="absolute bottom-full mb-2 bg-[#1A1D21] border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[120px] z-50 flex flex-col py-1">
                                     {message.isMe && (
                                         <button onClick={() => onEdit(message)} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-xs text-gray-300 text-left">
                                             <Edit2 size={12} /> Edit
                                         </button>
                                     )}
                                     <button onClick={() => { navigator.clipboard.writeText(message.content); setShowMenu(false); }} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-xs text-gray-300 text-left">
                                         Copy
                                     </button>
                                     {message.isMe && (
                                        <button onClick={() => onDelete(message.id)} className="flex items-center gap-2 px-3 py-2 hover:bg-red-500/10 text-xs text-red-400 text-left">
                                            <Trash2 size={12} /> Delete
                                        </button>
                                     )}
                                </div>
                            )}
                       </div>
                  </div>
              </div>

              {/* Bubble */}
              <div className={`
                rounded-2xl shadow-sm relative group-active/bubble:scale-[0.99] transition-transform
                ${hasAttachments ? 'p-1' : 'px-4 py-2.5'}
                ${message.isMe 
                  ? 'bg-signal text-white rounded-tr-sm' 
                  : 'bg-[#2b2d31] text-gray-100 rounded-tl-sm'}
              `}>
                 {/* Attachments */}
                 {message.attachments?.map((att, i) => (
                     <div key={i} className={`overflow-hidden rounded-xl ${message.content ? 'mb-2' : ''}`}>
                         {att.type === 'IMAGE' && (
                             <img src={att.url} alt="attachment" className="max-w-full h-auto object-cover max-h-60 w-full" />
                         )}
                         {att.type === 'VIDEO' && (
                             <div className="relative bg-black h-40 flex items-center justify-center">
                                 <span className="text-white text-xs font-bold border border-white p-2 rounded">VIDEO PLACEHOLDER</span>
                             </div>
                         )}
                     </div>
                 ))}

                {/* Text Content */}
                {message.content && (
                    <div className={`${hasAttachments ? 'px-3 pb-2 pt-1' : ''}`}>
                        <div className="whitespace-pre-line text-sm leading-relaxed">{message.content}</div>
                        {message.isEdited && <span className="text-[9px] opacity-60 italic ml-1">(edited)</span>}
                    </div>
                )}
                
                {/* Timestamp & Status */}
                <div className={`
                    flex items-center gap-1 justify-end mt-1
                    ${hasAttachments && !message.content ? 'absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full' : ''}
                `}>
                    <span className={`text-[9px] ${hasAttachments && !message.content ? 'text-white' : 'opacity-60'}`}>
                        {message.timestamp}
                    </span>
                    {message.isMe && <StatusIndicator status={message.status} />}
                </div>
              </div>
          </div>

          {/* Reactions */}
          {Object.keys(reactionGroups).length > 0 && (
              <div className={`flex gap-1 mt-1 ${message.isMe ? 'justify-end' : 'justify-start'}`}>
                  {Object.entries(reactionGroups).map(([emoji, count]) => (
                      <div key={emoji} className="bg-[#1E1E1E] border border-white/10 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 text-gray-300 shadow-sm">
                          <span>{emoji}</span>
                          {(count as number) > 1 && <span className="font-bold">{count as number}</span>}
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};
