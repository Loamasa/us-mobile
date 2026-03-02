
import React from 'react';
import { MessageCircle, Map as MapIcon, MapPin } from 'lucide-react';
import { Event, CommunitySpot } from '../../../../../types';

interface EventListViewProps {
  events: Event[];
  spots?: CommunitySpot[];
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
  onCreateEvent: () => void;
  isTopic: boolean;
}

export const EventListView: React.FC<EventListViewProps> = ({ 
    events, 
    spots = [],
    selectedEventId, 
    onSelectEvent, 
    onCreateEvent, 
    isTopic 
}) => {
  
  const getSpotName = (spotId?: string) => {
      if (!spotId) return null;
      return spots.find(s => s.id === spotId)?.name;
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 space-y-3">
        <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs font-bold text-gray-500 uppercase">Calendar</span>
            <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400">{events.length} Upcoming</span>
        </div>
        
        {events.length === 0 && (
            <div className="text-center text-gray-500 py-8 text-xs">No upcoming events found.</div>
        )}

        {events.map(event => {
            const spotName = getSpotName(event.spotId);
            
            return (
                <div 
                    key={event.id} 
                    onClick={() => onSelectEvent(event.id)}
                    className={`
                        group relative p-4 rounded-xl cursor-pointer transition-all border
                        ${selectedEventId === event.id 
                            ? 'bg-signal/10 border-signal/50 shadow-[0_0_20px_rgba(46,92,255,0.1)]' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
                    `}
                >
                    <div className="flex justify-between items-start mb-2">
                         <div className={`
                            text-[10px] font-bold px-2 py-1 rounded-md uppercase
                            ${selectedEventId === event.id ? 'bg-signal text-white' : 'bg-white/10 text-gray-400 group-hover:text-white'}
                         `}>
                            {new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                         </div>
                         {event.isAttending && <div className="w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>}
                    </div>
                    <div className="font-bold text-white text-sm mb-1 group-hover:text-signal transition-colors">{event.name}</div>
                    
                    {/* Location / Spot Indicator */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 group-hover:text-gray-400">
                        {spotName ? (
                            <span className="flex items-center gap-1 text-mint font-medium">
                                <MapPin size={12} /> {spotName}
                            </span>
                        ) : (
                            <span className="flex items-center gap-1">
                                <MapIcon size={12} /> {event.locationName}
                            </span>
                        )}
                    </div>
                </div>
            );
        })}
         
         {!isTopic && (
             <button 
                onClick={onCreateEvent}
                className="w-full py-4 border border-dashed border-white/10 text-gray-500 rounded-xl hover:text-white hover:bg-white/5 text-xs font-bold flex items-center justify-center gap-2 transition-all mt-4 group"
             >
                 <div className="p-1 bg-white/5 rounded-full group-hover:bg-signal group-hover:text-white transition-colors"><MessageCircle size={14} /></div>
                 Create New Event
             </button>
         )}
    </div>
  );
};
