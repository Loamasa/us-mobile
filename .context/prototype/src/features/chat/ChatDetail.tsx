
import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatSummary, Message, Event } from '../../types';
import { getChatMembers, getSenderDetails } from './utils';
import { useChatMessages } from './hooks/useChatMessages';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { ChatProfileSidebar } from './components/ChatProfileSidebar';
import { ChatHeader } from './components/ChatHeader';
import { useTutorial } from '../../context/TutorialContext';
import { useData } from '../../context/DataContext';
import { useMonetization } from '../../context/MonetizationContext';

interface ChatDetailProps {
  chat: ChatSummary;
  onBack: () => void;
  onPromote: () => void;
  showHeaderActions?: boolean;
  events?: Event[];
  communityId?: string;
}

export const ChatDetail: React.FC<ChatDetailProps> = ({ chat, onBack, onPromote, showHeaderActions = true, events, communityId }) => {
  const { triggerTutorial } = useTutorial();
  const { currentUser, unblockUser } = useData();
  const { serverSupporters } = useMonetization();
  
  const members = getChatMembers(chat.memberIds);
  const { 
      messages, 
      isTyping, 
      sendMessage, 
      addReaction,
      deleteMessage,
      editMessage
  } = useChatMessages(chat, members);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  // Interaction State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);

  // Get list of supporters for this specific community context
  const supporters = communityId ? (serverSupporters[communityId] || []) : [];

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
      triggerTutorial('first_chat');
  }, [triggerTutorial]);

  const handleSend = (text: string, attachments?: any[]) => {
      sendMessage(text, attachments, replyingTo?.id);
  };

  const otherMember = members.find(m => m.id !== currentUser.id);
  const isBlocked = otherMember && currentUser.blockedUserIds?.includes(otherMember.id);

  return (
    <div className="flex h-full w-full bg-void relative isolate overflow-hidden">
        {/* Main Chat Column 
            CRITICAL FIX: 'min-w-0' allows this flex child to shrink below its content size.
            Without this, long messages force the sidebar out of view.
        */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative z-0">
            
            <ChatHeader 
                chat={chat}
                members={members}
                onBack={onBack}
                onToggleProfile={() => setShowProfileSidebar(!showProfileSidebar)}
                showActions={showHeaderActions}
            />

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 pb-4 custom-scrollbar z-10">
                <div className="flex justify-center pb-2">
                    <button className="text-xs text-gray-600 hover:text-gray-400 font-medium transition-colors py-2 px-4 rounded-full hover:bg-white/5">
                        Today
                    </button>
                </div>

                {messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        sender={getSenderDetails(msg.senderId, members)} 
                        onReact={addReaction}
                        onReply={(m) => setReplyingTo(m)}
                        onDelete={deleteMessage}
                        onEdit={(m) => setEditingMsg(m)}
                        isSupporter={supporters.includes(msg.senderId)}
                    />
                ))}

                {isTyping && (
                <div className="flex justify-start gap-3">
                    <div className="w-8"></div>
                    <div className="bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>

            {isBlocked && chat.type === 'DM' ? (
                <div className="p-4 bg-void border-t border-white/5 z-20 flex flex-col items-center justify-center gap-3 py-8">
                    <p className="text-sm text-gray-500 font-medium">You have blocked this user.</p>
                    <button 
                        onClick={() => otherMember && unblockUser(otherMember.id)} 
                        className="text-xs font-bold text-white bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        Unblock
                    </button>
                </div>
            ) : (
                <ChatInput 
                    chatName={chat.name} 
                    onSend={handleSend} 
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    editingMessage={editingMsg}
                    onUpdateMessage={editMessage}
                    onCancelEdit={() => setEditingMsg(null)}
                />
            )}
        </div>

        {/* Sidebar Logic */}
        {showProfileSidebar && (
            <>
                {/* Mobile Overlay: Rendered via Portal. 
                    CRITICAL FIX: Using '100dvh' ensures full height on mobile browsers with address bars. 
                */}
                {createPortal(
                    <div className="md:hidden fixed inset-0 z-[9999] bg-[#0F1115] w-screen h-[100dvh]">
                        <ChatProfileSidebar 
                            chat={chat} 
                            members={members} 
                            onClose={() => setShowProfileSidebar(false)}
                            events={events} 
                            communityId={communityId}
                        />
                    </div>,
                    document.body
                )}

                {/* Desktop Sidebar: 
                    CRITICAL FIX: 'shrink-0' prevents flex compression. 
                    z-50 ensures it floats above any potential chat headers.
                */}
                <div className="hidden md:block w-80 shrink-0 border-l border-white/5 bg-[#0F1115] h-full relative z-50 shadow-2xl">
                    <ChatProfileSidebar 
                        chat={chat} 
                        members={members} 
                        onClose={() => setShowProfileSidebar(false)}
                        events={events} 
                        communityId={communityId}
                    />
                </div>
            </>
        )}
    </div>
  );
};
