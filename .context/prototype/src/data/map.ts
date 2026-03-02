
import { MapEntity } from '../types';
import { MOCK_FRIENDS, GROUP_MEMBER_IDS } from './users';

// --- MOCK MAP DATA ---
// We are now using real coordinates centered around Malmö
// Center point approx: 55.604984, 13.003822

const MALMO_CENTER = { lat: 55.6050, lng: 13.0038 };
const SPREAD = 0.03; // roughly 3km spread

const randomOffset = () => (Math.random() - 0.5) * SPREAD;

// Helper to find friend objects
const getFriends = (ids: string[]) => MOCK_FRIENDS.filter(f => ids.includes(f.id));

export const MOCK_MAP_NODES: MapEntity[] = [
  // 1. Map every friend EXCEPT the ones in the group
  ...MOCK_FRIENDS
    .filter(friend => !GROUP_MEMBER_IDS.includes(friend.id))
    .map((friend, i) => ({
      id: `node-${friend.id}`,
      type: 'FRIEND' as const,
      location: { 
        lat: MALMO_CENTER.lat + randomOffset(),
        lng: MALMO_CENTER.lng + randomOffset() * 1.5 
      },
      data: {
        name: friend.displayName,
        avatarUrl: friend.avatarUrl,
        status: friend.status
      },
      communityId: i % 3 === 0 ? 'com1' : (i % 3 === 1 ? 'com2' : 'com3')
    })),

  // 2. The "Local Friends Group" Merged Node at Möllevångstorget
  {
    id: 'node-group-mollevangen',
    type: 'GROUP',
    location: { lat: 55.5917, lng: 13.0070 }, // Möllevångstorget
    data: { 
      name: 'Friends Nearby',
      friends: getFriends(GROUP_MEMBER_IDS)
    }
  },

  // 3. Gatherings (Connected to Local Communities)
  
  // Malmö Ravers Open
  {
    id: 'node-gathering-3',
    type: 'GATHERING',
    location: { lat: 55.6150, lng: 13.0250 }, // Frihamnen area
    data: { name: 'The Harbor Bunker', memberCount: 24 }, // Matches Spot Name in communities.ts
    chatId: 'c_gathering_3',
    communityId: 'com_ravers' 
  },
  
  // Community House
  {
    id: 'node-gathering-ch-1',
    type: 'GATHERING',
    location: { lat: 55.5950, lng: 13.0050 }, // Community House exact location
    data: { name: 'Community House', memberCount: 18 },
    chatId: 'c_gh_kitchen',
    communityId: 'com_community_house'
  },

  // 4. PRIVATE Gatherings (Linked to 'Skyddsrum' Tag)
  // Visible ONLY if CURRENT_USER has the privateGroupId in their privateGroups
  {
    id: 'node-gathering-private-1',
    type: 'GATHERING',
    location: { lat: 55.6000, lng: 13.0100 }, // Near Triangeln
    data: { name: 'Basement Exit', memberCount: 12 },
    chatId: 'c_gathering_p1',
    privateGroupId: 'pg_1' // Skyddsrum (User HAS this)
  }
];
