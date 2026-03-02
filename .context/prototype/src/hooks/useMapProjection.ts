
import { useMemo } from 'react';
import { MapEntity, User, Event, Community, ChatSummary, UserLocationContext } from '../types';
import { USER_POOL } from '../data/userPool';
import { GROUP_MEMBER_IDS } from '../data/users'; 

interface ProjectionProps {
  users: User[];
  events: Event[];
  communities: Community[];
  chats?: ChatSummary[];
  joinedCommunityIds: string[];
  currentUser: User;
  userLocations: Record<string, UserLocationContext>;
}

export const useMapProjection = ({ 
  users, 
  events, 
  communities, 
  chats = [], 
  joinedCommunityIds,
  currentUser,
  userLocations
}: ProjectionProps) => {
  
  return useMemo(() => {
    const nodes: MapEntity[] = [];
    
    // Track users processed to avoid duplicate individual pins
    const processedUserIds = new Set<string>();

    // 1. FRIENDS CLUSTER PROJECTION
    // Project the specific group cluster node first
    const clusterMembers = users.filter(u => GROUP_MEMBER_IDS.includes(u.id));
    
    if (clusterMembers.length > 0) {
        const clusterLocation = { lat: 55.5917, lng: 13.0070 }; // Möllevångstorget
        
        nodes.push({
            id: `node-cluster-mollevangen`,
            type: 'GROUP',
            location: clusterLocation,
            data: {
                name: "Möllevången Crew", 
                friends: clusterMembers,
                visibility: 'ALWAYS'
            }
        });

        // Mark these users as processed so they don't appear as separate pins
        clusterMembers.forEach(u => processedUserIds.add(u.id));
    }

    // 2. PROJECT COMMUNITY SPOTS (Live Gatherings)
    // We process this BEFORE individual friends. If a friend is in a gathering, they contribute to the gathering count
    // and are NOT shown as an individual pin (because we mark them as processed).
    const userTagIds = currentUser.privateGroups?.map(pg => pg.id) || [];
    
    communities.forEach(community => {
        const isJoined = joinedCommunityIds.includes(community.id);
        if (!isJoined || !community.spots) return;

        community.spots.forEach(spot => {
            // 1. Get all members of this community from USER_POOL (Active Population)
            const memberIds = community.memberIds || [];
            let eligibleMembers = USER_POOL.filter(u => memberIds.includes(u.id));

            if (spot.type === 'PRIVATE') {
                if (!spot.privateGroupId || !userTagIds.includes(spot.privateGroupId)) {
                    return;
                }
                
                // Enforce Private Group Roster
                const privateGroup = currentUser.privateGroups?.find(pg => pg.id === spot.privateGroupId);
                if (privateGroup?.memberIds) {
                    eligibleMembers = eligibleMembers.filter(u => privateGroup.memberIds!.includes(u.id));
                }
            }

            // 2. Check for active users in this spot based on the source of truth (userLocations)
            const presentMembers = eligibleMembers.filter(u => {
                // IMPORTANT: For Gatherings, we do NOT skip if processedUserIds has them yet.
                // We want to count them in the gathering. 
                // We will mark them processed AFTER deciding to create the gathering node.
                
                const loc = userLocations[u.id];
                // Check if their location matches this spot's coordinates approximately
                if (loc && loc.type === 'GATHERING' && loc.name === spot.name) {
                    return true;
                }
                return false;
            });

            const count = presentMembers.length;
            const threshold = spot.minPeople;

            // Only show if enough real users are "present"
            if (count >= threshold) {
                nodes.push({
                    id: `node-spot-live-${spot.id}`,
                    type: 'GATHERING',
                    location: spot.location,
                    communityId: community.id,
                    chatId: `chat-spot-${spot.id}`,
                    privateGroupId: spot.privateGroupId,
                    data: {
                        name: spot.name,
                        memberCount: count,
                        members: presentMembers,
                        communityName: community.name,
                        communityIconUrl: community.iconUrl,
                        privateGroupName: spot.privateGroupId ? "Restricted Area" : undefined,
                        customIcon: spot.icon 
                    }
                });

                // RESTORED: Mark these users as processed so they don't appear as separate pins
                presentMembers.forEach(u => processedUserIds.add(u.id));
            }
        });
    });

    // 3. PROJECT INDIVIDUAL FRIENDS (Leftovers)
    users.forEach(user => {
        if (user.id === currentUser.id || processedUserIds.has(user.id)) return;
        
        const locationContext = userLocations[user.id];

        // Only map if they have a valid location context
        // STRICT: Only show individual pins for personal SPOTS. Gatherings are handled by Step 2.
        if (locationContext && locationContext.type === 'SPOT' && locationContext.coordinates) {
            
            nodes.push({
                id: `node-${user.id}`,
                type: 'FRIEND',
                location: locationContext.coordinates,
                data: {
                    name: user.displayName,
                    avatarUrl: user.avatarUrl,
                    status: user.status,
                    spotName: locationContext.name,
                    signal: user.currentSignal 
                }
            });
            processedUserIds.add(user.id);
        }
    });

    // 4. PROJECT EVENTS
    const now = new Date();
    events.forEach(event => {
        const startTime = new Date(event.startTime);
        if (startTime > now && event.geoLocation && event.status !== 'CANCELLED') {
            nodes.push({
                id: `map-evt-${event.id}`,
                type: 'EVENT',
                location: event.geoLocation,
                data: {
                    name: event.name,
                    startTime: event.startTime,
                    locationName: event.locationName,
                    attendeeCount: event.attendeeCount
                },
                communityId: event.communityId,
                eventId: event.id
            });
        }
    });

    return nodes;
  }, [users, events, communities, chats, joinedCommunityIds, currentUser, userLocations]);
};
