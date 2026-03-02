
import { useState, useMemo, useCallback } from 'react';
import { Event, MapEntity, User } from '../../../types';
import { MOCK_EVENTS } from '../../../data/communities';
import { CURRENT_USER } from '../../../data/users';

export const useEventSystem = (initialEvents: Event[] = MOCK_EVENTS) => {
  const [events, setEvents] = useState<Event[]>(initialEvents);

  // --- ACTIONS ---

  const createEvent = useCallback((eventData: Omit<Event, 'id' | 'attendeeCount' | 'isAttending' | 'publicSlug' | 'attendees'>) => {
    const newEvent: Event = {
      id: `e-${Date.now()}`,
      ...eventData,
      attendeeCount: 1,
      isAttending: true,
      publicSlug: `event-${Date.now()}`,
      attendees: [CURRENT_USER]
    };
    setEvents(prev => [newEvent, ...prev]);
    return newEvent;
  }, []);

  const toggleRsvp = useCallback((eventId: string) => {
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        const isAttending = !e.isAttending;
        let newAttendees = e.attendees || [];
        if (isAttending) {
          newAttendees = [...newAttendees, CURRENT_USER];
        } else {
          newAttendees = newAttendees.filter(u => u.id !== CURRENT_USER.id);
        }

        return {
          ...e,
          isAttending,
          attendeeCount: isAttending ? e.attendeeCount + 1 : e.attendeeCount - 1,
          attendees: newAttendees
        };
      }
      return e;
    }));
  }, []);

  // --- DERIVED DATA ---

  // 1. Map Nodes: Automatically convert events with Geolocation to Map Entities
  const eventMapNodes: MapEntity[] = useMemo(() => {
    return events
      .filter(e => e.geoLocation) // Only map events with specific Lat/Lng
      .map(e => ({
        id: `map-evt-${e.id}`,
        type: 'EVENT',
        location: e.geoLocation!,
        data: {
          name: e.name,
          startTime: e.startTime,
          locationName: e.locationName,
          attendeeCount: e.attendeeCount
        },
        communityId: e.communityId,
        eventId: e.id
      }));
  }, [events]);

  // 2. My Events: Filter for the "Chats -> My Events" tab
  const myEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return {
      all: sorted,
      attending: sorted.filter(e => e.isAttending),
      upcoming: sorted.filter(e => !e.isAttending) // Events in my network I'm not attending yet
    };
  }, [events]);

  return {
    events,
    eventMapNodes,
    myEvents,
    createEvent,
    toggleRsvp
  };
};
