import React, { useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, MessageCircle, Trash2, Edit2, XCircle, AlertCircle } from 'lucide-react';
import { Event, Community } from '../../../types';
import { MapVisualizer } from '../../map/MapVisualizer';
import { CreateEventModal } from './modals/CreateEventModal';
import { useData } from '../../../context/DataContext';

interface EventViewProps {
  event: Event;
  community: Community;
  onBack: () => void;
  onToggleRsvp: (id: string) => void;
  onJoinEventChat?: (event: Event) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, data: Partial<Event>) => void;
}

export const EventView: React.FC<EventViewProps> = ({ event, community, onBack, onToggleRsvp, onJoinEventChat, onDelete, onUpdate }) => {
  const { currentUser, cancelEvent } = useData();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const isHost = event.hostId === currentUser.id;
  const isCancelled = event.status === 'CANCELLED';

  // Find linked spot if any
  const linkedSpot = useMemo(() => {
      if (!event.spotId || !community.spots) return null;
      return community.spots.find(s => s.id === event.spotId);
  }, [event.spotId, community.spots]);

  // Comprehensive safety check for coordinates
  const sanitizedLoc = useMemo(() => {
      const loc = linkedSpot ? linkedSpot.location : event.geoLocation;
      if (loc && typeof loc.lat === 'number' && !isNaN(loc.lat) && isFinite(loc.lat) &&
          typeof loc.lng === 'number' && !isNaN(loc.lng) && isFinite(loc.lng)) {
          return loc;
      }
      return null;
  }, [linkedSpot, event.geoLocation]);

  const handleUpdate = (data: any) => {
      if (onUpdate) {
          onUpdate(event.id, data);
          setShowEditModal(false);
      }
  };

  const handleCancelEvent = () => {
      if (window.confirm("Are you sure you want to cancel this event? Attendees will be notified.")) {
          cancelEvent(event.id, cancelReason);
          setShowCancelPrompt(false);
      }
  };

  return (
     <div className="flex flex-col h-full animate-in slide-in-from-right-10 fade-in duration-300 overflow-y-auto custom-scrollbar bg-void">
         {/* Cover Image Header */}
         {event.coverImageUrl ? (
            <div className="relative h-64 md:h-80 w-full overflow-hidden shrink-0">
                <img src={event.coverImageUrl} className={`w-full h-full object-cover ${isCancelled ? 'grayscale' : ''}`} alt={event.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />
                <button 
                  onClick={onBack} 
                  className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md hover:bg-white/20 rounded-full text-white transition-colors z-30 border border-white/10"
                >
                    <ArrowLeft size={20} />
                </button>
                {isCancelled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-red-500 text-white font-black text-4xl px-8 py-4 rounded-xl shadow-2xl rotate-12 border-4 border-white animate-in zoom-in-125 duration-500">
                            CANCELLED
                        </div>
                    </div>
                )}
            </div>
         ) : (
            <div className="flex items-center p-4 border-b border-white/5 sticky top-0 bg-void/90 backdrop-blur-md z-20 shrink-0">
                <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white mr-2 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="font-bold text-white text-sm">Back to Events</h2>
                {isCancelled && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Cancelled</span>
                )}
            </div>
         )}

         <div className="p-8 max-w-4xl mx-auto w-full relative z-10">
              {/* Cancellation Message Banner */}
              {isCancelled && (
                  <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
                      <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
                      <div>
                          <h3 className="text-red-400 font-bold text-lg mb-1">This event has been cancelled</h3>
                          <p className="text-gray-400 leading-relaxed">
                              {event.cancellationReason || "No specific reason provided by the host."}
                          </p>
                      </div>
                  </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
                  <div className="flex-1 min-w-0">
                       <div className="flex flex-wrap gap-2 mb-3">
                           {isCancelled ? (
                               <div className="inline-block px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 uppercase tracking-wider">
                                   CANCELLED
                               </div>
                           ) : (
                               <div className="inline-block px-3 py-1 rounded-full bg-signal/20 text-signal text-xs font-bold border border-signal/20 uppercase tracking-wider">
                                    UPCOMING
                               </div>
                           )}
                           {linkedSpot && (
                               <div className="inline-block px-3 py-1 rounded-full bg-mint/10 text-mint text-xs font-bold border border-mint/20 flex items-center gap-1 uppercase tracking-wider">
                                    <MapPin size={12} />
                                    AT COMMUNITY SPOT
                               </div>
                           )}
                       </div>
                       
                       <h1 className={`text-4xl font-black text-white mb-2 tracking-tight leading-tight ${isCancelled ? 'line-through opacity-50' : ''}`}>{event.name}</h1>
                       <div className="flex flex-wrap items-center gap-4 text-gray-400 mt-2">
                            <span className="flex items-center gap-2 font-medium"><Calendar size={16} className="text-signal"/> {new Date(event.startTime).toLocaleDateString()}</span>
                            <span className="flex items-center gap-2 font-medium"><Clock size={16} className="text-signal"/> {new Date(event.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            <span className="flex items-center gap-2 font-medium">
                                <MapPin size={16} className="text-signal"/> 
                                {linkedSpot ? linkedSpot.name : event.locationName}
                            </span>
                       </div>
                  </div>
                  <div className="flex gap-3 items-center shrink-0">
                       {isHost && !isCancelled && (
                           <button
                               onClick={() => setShowCancelPrompt(true)}
                               className="px-5 py-3 rounded-xl font-bold text-sm transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 flex items-center gap-2 shadow-lg"
                               title="Cancel Event"
                           >
                               <XCircle size={18} />
                               <span>Cancel</span>
                           </button>
                       )}
                       {onUpdate && !isCancelled && (
                           <button
                               onClick={() => setShowEditModal(true)}
                               className="p-3 rounded-xl transition-all bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5"
                               title="Edit Event"
                           >
                               <Edit2 size={18} />
                           </button>
                       )}
                       {onDelete && (
                           <button
                               onClick={() => onDelete(event.id)}
                               className="p-3 rounded-xl transition-all bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5"
                               title="Delete Event"
                           >
                               <Trash2 size={18} />
                           </button>
                       )}
                       {onJoinEventChat && (
                           <button 
                                onClick={() => onJoinEventChat(event)}
                                className="px-5 py-3 rounded-xl font-bold text-sm transition-all bg-white/10 text-white hover:bg-white/20 flex items-center gap-2 border border-white/5 shadow-lg"
                           >
                               <MessageCircle size={18} />
                               <span className="hidden sm:inline">Chat</span>
                           </button>
                       )}
                       {!isCancelled && (
                           <button 
                              onClick={() => onToggleRsvp(event.id)} 
                              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xl active:scale-95 ${event.isAttending ? 'bg-white text-black hover:bg-gray-100' : 'bg-signal text-white hover:bg-blue-600 shadow-signal/20'}`}
                           >
                              {event.isAttending ? 'Attending' : 'RSVP Now'}
                           </button>
                       )}
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t border-white/5">
                  <div className="lg:col-span-2 space-y-8">
                      <section>
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">About the event</h3>
                        <p className={`text-gray-300 leading-relaxed text-lg whitespace-pre-line ${isCancelled ? 'opacity-50' : ''}`}>{event.description}</p>
                      </section>
                      
                      <section>
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Location</h3>
                        <div className={`h-72 w-full rounded-3xl overflow-hidden bg-black/50 border border-white/10 relative shadow-2xl ${isCancelled ? 'opacity-30' : ''}`}>
                            {sanitizedLoc ? (
                                <MapVisualizer 
                                    nodes={[{
                                        id: event.id, 
                                        type: 'GATHERING', 
                                        location: sanitizedLoc, 
                                        data: { name: event.name, memberCount: event.attendeeCount },
                                        communityId: community.id
                                    }]}
                                    spots={linkedSpot ? [linkedSpot] : []} 
                                    ghostMode={false} 
                                    toggleGhostMode={() => {}} 
                                    mode="EMBEDDED"
                                    centerOnNode={sanitizedLoc}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                                    <MapPin size={32} className="mb-2 opacity-20" />
                                    <p className="text-sm">Location coordinates not set for this event.</p>
                                </div>
                            )}

                            {linkedSpot && (
                                <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md border border-mint/30 p-4 rounded-2xl flex items-center gap-4 z-[400] shadow-2xl">
                                    <div className="w-12 h-12 rounded-2xl bg-mint/20 flex items-center justify-center text-mint border border-mint/20">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-mint font-black uppercase tracking-widest mb-0.5">Community Spot</div>
                                        <div className="font-bold text-white text-lg">{linkedSpot.name}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                      </section>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 shadow-inner">
                          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex justify-between items-center">
                            <span>Attendees</span>
                            <span className="bg-white/5 px-2 py-0.5 rounded text-white">{event.attendeeCount}</span>
                          </h3>
                          <div className="flex flex-wrap gap-2">
                              {event.attendees?.map(u => (
                                  <div key={u.id} className="relative group">
                                      <img src={u.avatarUrl} className={`w-10 h-10 rounded-full border-2 border-void group-hover:border-signal transition-colors object-cover ${isCancelled ? 'grayscale opacity-50' : ''}`} title={u.displayName} alt={u.displayName} />
                                      {u.status === 'ONLINE' && !isCancelled && <div className="absolute bottom-0 right-0 w-3 h-3 bg-mint rounded-full border-2 border-void"></div>}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
         </div>

         {/* Cancellation Prompt Modal */}
         {showCancelPrompt && (
             <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                 <div className="bg-void border border-red-500/30 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
                     <div className="flex items-center gap-3 mb-6">
                         <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                             <XCircle size={24} />
                         </div>
                         <div>
                             <h2 className="text-xl font-bold text-white">Cancel Event</h2>
                             <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Notify attendees</p>
                         </div>
                     </div>

                     <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                         Are you sure you want to cancel <span className="text-white font-bold">{event.name}</span>? You can provide a reason below which will be shown to all attendees.
                     </p>

                     <div className="space-y-4">
                         <div>
                             <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Reason (Optional)</label>
                             <textarea 
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="e.g. Due to bad weather, we are moving this to next week..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-red-500/50 h-32 resize-none transition-all"
                             />
                         </div>
                     </div>

                     <div className="flex gap-3 mt-8">
                         <button 
                            onClick={() => setShowCancelPrompt(false)}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm text-gray-300 transition-colors"
                         >
                             Wait, go back
                         </button>
                         <button 
                            onClick={handleCancelEvent}
                            className="flex-1 py-4 bg-red-500 hover:bg-red-600 rounded-2xl font-bold text-sm text-white transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                         >
                             Confirm Cancellation
                         </button>
                     </div>
                 </div>
             </div>
         )}

         {showEditModal && (
             <CreateEventModal
                 onClose={() => setShowEditModal(false)}
                 onSubmit={handleUpdate}
                 spots={community.spots}
                 initialData={event}
             />
         )}
     </div>
  );
};