
import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { useCommunityContext } from '../context/CommunityContext';
import { ChatDetail } from '../../chat';
import { EventView } from './EventView';

/**
 * CommunityMainArea
 * 
 * Handles the logic for what is displayed in the main content area (Right Pane).
 * It switches between Chat View, Event View, and Empty States based on ViewMode.
 */
export const CommunityMainArea: React.FC = () => {
    const { 
        selectedCommunity, 
        viewMode, 
        activeChannelChat, 
        selectedEvent,
        selectedEventId,
        setSelectedEventId,
        handleBackFromChat,
        mobileShowChat,
        onToggleRsvp,
        onJoinEventChat,
        onDeleteEvent,
        onUpdateEvent,
        communityEvents
    } = useCommunityContext();

    const getEmptyStateText = () => {
        switch (viewMode) {
            case 'HAPPENINGS': return 'Select a Gathering or Event';
            case 'GATHERINGS': return 'Join an active gathering to chat';
            case 'EVENTS': return 'Select an event to view details';
            case 'PRIVATE': return 'Select a private channel';
            case 'LOCAL_COMMUNITIES': return 'Select a community to view';
            default: return 'Select a Channel'; // OPEN
        }
    };

    const shouldShowChat = (viewMode === 'OPEN' || viewMode === 'PRIVATE' || viewMode === 'GATHERINGS' || viewMode === 'HAPPENINGS');

    return (
        <div className={`flex-1 flex flex-col min-w-0 bg-void relative ${mobileShowChat ? 'flex w-full md:w-auto' : 'hidden md:flex'}`}>
            {shouldShowChat && activeChannelChat ? (
                <div className="h-full flex flex-col relative w-full">
                    {/* Mobile Back Button (Overlay) */}
                    <div className="md:hidden absolute top-3 left-3 z-50">
                        <button onClick={handleBackFromChat} className="p-2 bg-black/50 backdrop-blur-md text-white rounded-full border border-white/10">
                            <ChevronRight className="rotate-180" size={20} />
                        </button>
                    </div>
                    <ChatDetail 
                        chat={activeChannelChat} 
                        onBack={handleBackFromChat} 
                        onPromote={() => {}} 
                        showHeaderActions={false}
                        events={communityEvents}
                        communityId={selectedCommunity?.id}
                    />
                </div>
            ) : (
                <div className="h-full bg-void w-full">
                    {selectedEventId && selectedEvent && selectedCommunity ? (
                        <EventView 
                            event={selectedEvent} 
                            community={selectedCommunity}
                            onBack={() => setSelectedEventId(null)}
                            onToggleRsvp={onToggleRsvp}
                            onJoinEventChat={onJoinEventChat}
                            onDelete={() => onDeleteEvent(selectedEvent.id)}
                            onUpdate={(id, data) => onUpdateEvent(id, data)}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Calendar size={32} className="text-gray-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                {viewMode === 'EVENTS' ? 'Select an Event' : 'Community Hub'}
                            </h2>
                            <p className="text-gray-400 max-w-sm">
                                {getEmptyStateText()}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
