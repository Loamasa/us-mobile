import React, { useMemo, useState } from 'react';
import { Event } from '../../../types';
import { Calendar, MapPin, Users, ArrowRight, Sparkles, Flame, Clock, MessageCircle, XCircle, Edit, Trash2, AlertCircle } from 'lucide-react';
import { useData } from '../../../context/DataContext';

interface RecommendedEventsDashboardProps {
  events: Event[];
  onSelectEvent: (eventId: string) => void;
  joinedCommunityIds: string[];
}

type EventTab = 'HIGHLIGHTS' | 'GOING' | 'HOSTING';

export const RecommendedEventsDashboard: React.FC<RecommendedEventsDashboardProps> = ({ 
    events, 
    onSelectEvent,
    joinedCommunityIds
}) => {
    const { currentUser, toggleRsvp, deleteEvent } = useData();
    const [activeTab, setActiveTab] = useState<EventTab>('HIGHLIGHTS');

    // Filter and Sort Logic
    const { spotlight, recommended, upcoming, attending, hosting } = useMemo(() => {
        const now = new Date();
        const sortedEvents = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        // Active and Future events
        const futureEvents = sortedEvents.filter(e => new Date(e.startTime) > now);
        
        const attendingList = futureEvents.filter(e => e.isAttending && e.hostId !== currentUser.id);
        const hostingList = sortedEvents.filter(e => e.hostId === currentUser.id);
        const joinedSet = new Set(joinedCommunityIds);
        const recommendedList = futureEvents.filter(e => joinedSet.has(e.communityId) && !e.isAttending && e.status !== 'CANCELLED');
        
        let spotlightEvent = null;
        if (attendingList.length > 0) spotlightEvent = attendingList[0];
        else if (recommendedList.length > 0) spotlightEvent = recommendedList[0];
        else if (futureEvents.length > 0) spotlightEvent = futureEvents[0];
        
        const remainingRecommended = recommendedList.filter(e => e.id !== spotlightEvent?.id);
        const remainingUpcoming = futureEvents.filter(e => 
            e.id !== spotlightEvent?.id && 
            !remainingRecommended.slice(0, 4).includes(e)
        );

        return {
            spotlight: spotlightEvent,
            recommended: remainingRecommended.slice(0, 4),
            upcoming: remainingUpcoming,
            attending: attendingList,
            hosting: hostingList
        };
    }, [events, joinedCommunityIds, currentUser.id]);

    const handleCancelRsvp = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Cancel your RSVP?")) {
            toggleRsvp(id);
        }
    };

    const handleDeleteEvent = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this event? This will notify all attendees.")) {
            deleteEvent(id);
        }
    };

    const TabButton = ({ id, label, count }: { id: EventTab, label: string, count?: number }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all relative ${activeTab === id ? 'bg-signal text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}
        >
            {label}
            {count !== undefined && count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === id ? 'bg-white/20' : 'bg-white/10 text-gray-400'}`}>
                    {count}
                </span>
            )}
        </button>
    );

    const EventGridItem: React.FC<{ event: Event; isHost?: boolean }> = ({ event, isHost }) => {
        const isCancelled = event.status === 'CANCELLED';
        
        return (
            <div 
                onClick={() => onSelectEvent(event.id)}
                className={`bg-white/5 border border-white/5 rounded-3xl p-6 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group flex flex-col h-full ${isCancelled ? 'opacity-60 grayscale' : ''}`}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 bg-black/40 rounded-2xl flex flex-col items-center justify-center border border-white/10 group-hover:border-signal/50 transition-colors">
                        <span className="text-[10px] text-red-400 font-bold uppercase">{new Date(event.startTime).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="text-xl font-bold text-white leading-none">{new Date(event.startTime).getDate()}</span>
                    </div>
                    <div className="flex gap-2">
                        {isCancelled ? (
                            <div className="bg-red-500 text-white px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1 border border-white/20">
                                CANCELLED
                            </div>
                        ) : isHost ? (
                            <div className="bg-signal/20 text-signal px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border border-signal/20">
                                HOSTING
                            </div>
                        ) : (
                            <div className="bg-green-500/20 text-green-500 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border border-green-500/20">
                                GOING
                            </div>
                        )}
                    </div>
                </div>
                <h4 className={`text-xl font-bold text-white mb-2 group-hover:text-signal transition-colors line-clamp-1 ${isCancelled ? 'line-through' : ''}`}>{event.name}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <Clock size={12} /> {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <span>•</span>
                    <MapPin size={12} /> {event.locationName}
                </div>
                
                <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
                    {isHost ? (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onSelectEvent(event.id); }}
                                className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-300 flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Edit size={12} /> {isCancelled ? 'View Details' : 'Edit'}
                            </button>
                            <button 
                                onClick={(e) => handleDeleteEvent(e, event.id)}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                                title="Delete Event"
                            >
                                <Trash2 size={12} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-300 flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <MessageCircle size={12} /> Chat
                            </button>
                            {!isCancelled && (
                                <button 
                                    onClick={(e) => handleCancelRsvp(e, event.id)}
                                    className="p-2 bg-white/5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                                    title="Cancel RSVP"
                                >
                                    <XCircle size={12} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-[#0F1115] relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-signal to-purple-600 rounded-2xl shadow-lg shadow-signal/20 text-white">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Events Hub</h1>
                            <p className="text-gray-400 font-medium text-xs">Manage your personal schedule</p>
                        </div>
                    </div>
                    
                    <div className="flex bg-white/5 p-1 rounded-full border border-white/5 self-start md:self-center">
                        <TabButton id="HIGHLIGHTS" label="Discover" />
                        <TabButton id="GOING" label="Going" count={attending.length} />
                        <TabButton id="HOSTING" label="Hosting" count={hosting.length} />
                    </div>
                </div>

                {/* HIGHLIGHTS TAB */}
                {activeTab === 'HIGHLIGHTS' && (
                    <div className="space-y-10 animate-in fade-in duration-300">
                        {spotlight && (
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        {spotlight.status === 'CANCELLED' ? (
                                            <><AlertCircle size={14} className="text-red-500" /> Cancelled Event</>
                                        ) : spotlight.isAttending ? (
                                            <><Calendar size={14} className="text-signal" /> Your Next Event</>
                                        ) : (
                                            <><Flame size={14} className="text-orange-500" /> Top Pick</>
                                        )}
                                    </h2>
                                </div>
                                <div 
                                    onClick={() => onSelectEvent(spotlight.id)}
                                    className={`group relative w-full h-[360px] md:h-[400px] rounded-3xl overflow-hidden cursor-pointer border border-white/10 shadow-2xl transition-all hover:scale-[1.01] hover:shadow-signal/10 ${spotlight.status === 'CANCELLED' ? 'grayscale' : ''}`}
                                >
                                     <div className="absolute inset-0 bg-gray-900">
                                         <img 
                                            src={spotlight.coverImageUrl || `https://picsum.photos/seed/${spotlight.id}/1200/800`} 
                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
                                            alt={spotlight.name}
                                         />
                                     </div>
                                     <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                     <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                                         <div className="flex flex-wrap items-center gap-2 mb-4">
                                             <span className={`px-3 py-1 text-white text-xs font-bold rounded-full shadow-lg ${spotlight.status === 'CANCELLED' ? 'bg-red-500' : 'bg-signal'}`}>
                                                {spotlight.status === 'CANCELLED' ? 'CANCELLED' : new Date(spotlight.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                             </span>
                                             <span className="px-3 py-1 bg-black/40 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/10 flex items-center gap-1.5">
                                                <MapPin size={12} className="text-gray-300" /> {spotlight.locationName}
                                             </span>
                                         </div>
                                         <h3 className={`text-3xl md:text-5xl font-black text-white mb-3 leading-tight group-hover:text-signal transition-colors ${spotlight.status === 'CANCELLED' ? 'line-through opacity-50' : ''}`}>{spotlight.name}</h3>
                                         <p className="text-gray-300 line-clamp-2 max-w-3xl text-sm md:text-lg font-medium leading-relaxed">{spotlight.description}</p>
                                     </div>
                                </div>
                            </section>
                        )}

                        {recommended.length > 0 && (
                            <section>
                                 <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Recommended for You</h2>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {recommended.map(event => (
                                         <EventGridItem key={event.id} event={event} />
                                     ))}
                                 </div>
                            </section>
                        )}
                    </div>
                )}

                {/* GOING TAB */}
                {activeTab === 'GOING' && (
                    <div className="animate-in fade-in duration-300">
                        {attending.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
                                <XCircle size={48} className="mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-white mb-2">Not attending anything yet</h3>
                                <p className="text-sm max-w-xs">RSVP to events in your communities to see them here.</p>
                                <button onClick={() => setActiveTab('HIGHLIGHTS')} className="mt-6 text-signal font-bold text-sm hover:underline">Discover Events</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {attending.map(event => (
                                    <EventGridItem key={event.id} event={event} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* HOSTING TAB */}
                {activeTab === 'HOSTING' && (
                    <div className="animate-in fade-in duration-300">
                        {hosting.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
                                <Edit size={48} className="mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-white mb-2">No events hosted</h3>
                                <p className="text-sm max-w-xs">Create your own gatherings and invite your community.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {hosting.map(event => (
                                    <EventGridItem key={event.id} event={event} isHost />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};