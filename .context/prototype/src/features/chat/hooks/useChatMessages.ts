import { useState, useMemo, useEffect } from 'react';
import { ChatSummary, Message, User, Attachment } from '../../../types';
import { CURRENT_USER } from '../../../data/users';
import { useData } from '../../../context/DataContext';

export const useChatMessages = (chat: ChatSummary, members: User[]) => {
    const { 
        messages: globalMessages, 
        sendMessage: globalSendMessage, 
        addReaction: globalAddReaction,
        editMessage: globalEditMessage,
        deleteMessage: globalDeleteMessage
    } = useData();
    const channelNameLower = chat.name.toLowerCase().replace('#', '').trim();

    // Memoize messages for this specific chat from the global store
    const messages = useMemo(() => {
        return globalMessages[chat.id] || [];
    }, [globalMessages, chat.id]);
  
    const [isTyping, setIsTyping] = useState(false);

    // Initial mock seed logic moved to DataProvider or handled via empty check
    // If we want the "Welcome" messages to persist, we should add them in DataContext initialization
    // For now, if empty, we might show a "Start conversation" empty state in UI, 
    // or rely on the DataProvider seeding.

    const sendMessage = (text: string, attachments?: Attachment[], replyToId?: string) => {
        // Find reply context if exists
        const replyToMessage = replyToId ? messages.find(m => m.id === replyToId) : undefined;
        
        // Use Global Action
        globalSendMessage(chat.id, text, attachments);

        // Simulate reply logic from bot (Simulated dynamism)
        if (!channelNameLower.includes('announcements') && !channelNameLower.includes('rules')) {
            setTimeout(() => {
                setIsTyping(true);
                setTimeout(() => {
                    setIsTyping(false);
                    const replier = members.length > 0 ? members[Math.floor(Math.random() * members.length)] : null;
                    
                    if (replier && replier.id !== CURRENT_USER.id && replier.id !== 'admin') {
                        // We need a way to inject "Incoming" messages into the store
                        // For a real app, this comes via socket. 
                        // For this demo, we can just use the same globalSendMessage but hack the senderID?
                        // Actually, let's keep it simple: The "AI" reply is just a visual trick for now
                        // unless we add `receiveMessage` to context.
                    }
                }, 2000);
            }, 1000);
        }
    };

    // --- Interaction Handlers ---

    const addReaction = (messageId: string, emoji: string) => {
        globalAddReaction(chat.id, messageId, emoji);
    };

    const deleteMessage = (messageId: string) => {
        globalDeleteMessage(chat.id, messageId);
    };

    const editMessage = (messageId: string, newContent: string) => {
        globalEditMessage(chat.id, messageId, newContent);
    };

    return {
        messages,
        isTyping,
        sendMessage,
        addReaction,
        deleteMessage,
        editMessage
    };
};