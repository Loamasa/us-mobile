

import { User, Community, ChatSummary, MapEntity, UserStatus, Message, Event, FriendRequest, Visibility } from './types';

export const CURRENT_USER: User = {
  id: 'u1',
  displayName: 'Alex Chen',
  handle: '@alexc',
  avatarUrl: 'https://picsum.photos/seed/alex/200/200',
  bio: 'Digital nomad & coffee enthusiast',
  status: UserStatus.ONLINE,
  settings: {
    globalLocationSharing: true,
    notificationDefaults: 'MENTIONS',
    // Fix: Added missing required properties for UserSettings
    readReceiptsEnabled: true,
    showOnlineStatus: true,
    allowFriendRequests: true,
    shareActivityStatus: true
  }
};

export const MOCK_FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: 'fr1',
    fromUser: {
      id: 'u99',
      displayName: 'Jordan Lee',
      handle: '@jlee_design',
      avatarUrl: 'https://picsum.photos/seed/jordan/200/200',
      bio: 'UI Designer',
      status: UserStatus.OFFLINE
    },
    status: 'PENDING',
    timestamp: '2h ago'
  }
];

export const MOCK_FRIENDS: User[] = [
  {
    id: 'f1',
    displayName: 'Sarah Jenkins',
    handle: '@sarahj',
    avatarUrl: 'https://picsum.photos/seed/sarah/200/200',
    bio: 'Photographer',
    status: UserStatus.ONLINE
  },
  {
    id: 'f2',
    displayName: 'David Kim',
    handle: '@dkim_dev',
    avatarUrl: 'https://picsum.photos/seed/david/200/200',
    bio: 'Software Engineer',
    status: UserStatus.OFFLINE
  },
  {
    id: 'f3',
    displayName: 'Elena Rodriguez',
    handle: '@elena_r',
    avatarUrl: 'https://picsum.photos/seed/elena/200/200',
    bio: 'Artist',
    status: UserStatus.AWAY
  },
  {
    id: 'f4',
    displayName: 'Marcus Johnson',
    handle: '@mj_music',
    avatarUrl: 'https://picsum.photos/seed/marcus/200/200',
    bio: 'Musician',
    status: UserStatus.ONLINE
  },
  {
    id: 'f5',
    displayName: 'Jessica Wong',
    handle: '@jess_w',
    avatarUrl: 'https://picsum.photos/seed/jessica/200/200',
    bio: 'UX Researcher',
    status: UserStatus.ONLINE
  },
  {
    id: 'f6',
    displayName: 'Tom Baker',
    handle: '@baker_st',
    avatarUrl: 'https://picsum.photos/seed/tom/200/200',
    bio: 'Pastry Chef',
    status: UserStatus.AWAY
  },
  {
    id: 'f7',
    displayName: 'Aisha Patel',
    handle: '@aisha_p',
    avatarUrl: 'https://picsum.photos/seed/aisha/200/200',
    bio: 'Yoga Instructor',
    status: UserStatus.ONLINE
  },
  {
    id: 'f8',
    displayName: 'Ryan O\'Connell',
    handle: '@ryano',
    avatarUrl: 'https://picsum.photos/seed/ryan/200/200',
    bio: 'Pro Cyclist',
    status: UserStatus.OFFLINE
  },
  {
    id: 'f9',
    displayName: 'Wei Chen',
    handle: '@wei_c',
    avatarUrl: 'https://picsum.photos/seed/wei/200/200',
    bio: 'Architect',
    status: UserStatus.ONLINE
  },
  {
    id: 'f10',
    displayName: 'Zoe Miller',
    handle: '@zoem',
    avatarUrl: 'https://picsum.photos/seed/zoe/200/200',
    bio: 'PhD Student',
    status: UserStatus.AWAY
  }
];

// Define friends in the local group
const GROUP_MEMBER_IDS = ['f1', 'f4', 'f7']; // Sarah, Marcus, Aisha

export const MOCK_CHATS: ChatSummary[] = [
  {
    id: 'c_mollevangen',
    name: 'Möllevången Crew',
    avatarUrl: 'https://picsum.photos/seed/mollevangen/200/200',
    lastMessage: 'Anyone near the square?',
    timestamp: 'Now',
    unreadCount: 1,
    type: 'GROUP',
    memberIds: GROUP_MEMBER_IDS
  },
  {
    id: 'c1',
    name: 'Photography Club',
    avatarUrl: 'https://picsum.photos/seed/photo/200/200',
    lastMessage: 'Who is coming to the golden hour shoot?',
    timestamp: '10:42 AM',
    unreadCount: 3,
    type: 'GROUP',
    memberIds: ['f1', 'f3', 'f4']
  },
  {
    id: 'c2',
    name: 'Sarah Jenkins',
    avatarUrl: 'https://picsum.photos/seed/sarah/200/200',
    lastMessage: 'Sent you the location pin.',
    timestamp: '9:15 AM',
    unreadCount: 0,
    type: 'DM',
    online: true,
    memberIds: ['f1']
  },
  {
    id: 'c3',
    name: 'Library Study Group',
    avatarUrl: 'https://picsum.photos/seed/books/200/200',
    lastMessage: 'Room 304 is open now.',
    timestamp: 'Yesterday',
    unreadCount: 0,
    type: 'GROUP',
    memberIds: ['f2', 'f9', 'f10']
  },
  {
    id: 'c4',
    name: 'David Kim',
    avatarUrl: 'https://picsum.photos/seed/david/200/200',
    lastMessage: 'Sounds good!',
    timestamp: 'Yesterday',
    unreadCount: 0,
    type: 'DM',
    online: false,
    memberIds: ['f2']
  },
  {
    id: 'c5',
    name: 'Chess Club @ Library',
    avatarUrl: 'https://picsum.photos/seed/chessclub/200/200',
    lastMessage: 'System: 5 members detected nearby.',
    timestamp: 'Just now',
    unreadCount: 1,
    type: 'GATHERING'
  },
  {
    id: 'c6',
    name: 'Weekend Hikers',
    avatarUrl: 'https://picsum.photos/seed/hike/200/200',
    lastMessage: 'Trail conditions look perfect for Saturday.',
    timestamp: '11:20 AM',
    unreadCount: 5,
    type: 'GROUP',
    memberIds: ['f8', 'f7', 'f5']
  },
  {
    id: 'c7',
    name: 'Lunch Crew',
    avatarUrl: 'https://picsum.photos/seed/tacos/200/200',
    lastMessage: 'Tacos today?',
    timestamp: '11:45 AM',
    unreadCount: 2,
    type: 'GROUP',
    memberIds: ['f6', 'f9', 'f2']
  },
  {
    id: 'c8',
    name: 'Jessica Wong',
    avatarUrl: 'https://picsum.photos/seed/jessica/200/200',
    lastMessage: 'Did you see the new Figma update?',
    timestamp: '2m ago',
    unreadCount: 1,
    type: 'DM',
    online: true,
    memberIds: ['f5']
  },
  {
    id: 'c9',
    name: 'Tom Baker',
    avatarUrl: 'https://picsum.photos/seed/tom/200/200',
    lastMessage: 'Saved you a croissant.',
    timestamp: '1h ago',
    unreadCount: 0,
    type: 'DM',
    online: false,
    memberIds: ['f6']
  },
  {
    id: 'c10',
    name: 'Aisha Patel',
    avatarUrl: 'https://picsum.photos/seed/aisha/200/200',
    lastMessage: 'Class starts in 10 mins!',
    timestamp: '5m ago',
    unreadCount: 1,
    type: 'DM',
    online: true,
    memberIds: ['f7']
  },
  {
    id: 'c11',
    name: 'Ryan O\'Connell',
    avatarUrl: 'https://picsum.photos/seed/ryan/200/200',
    lastMessage: 'Send me that Strava link.',
    timestamp: 'Yesterday',
    unreadCount: 0,
    type: 'DM',
    online: false,
    memberIds: ['f8']
  },
  {
    id: 'c12',
    name: 'Wei Chen',
    avatarUrl: 'https://picsum.photos/seed/wei/200/200',
    lastMessage: 'The blueprints look solid.',
    timestamp: 'Mon',
    unreadCount: 0,
    type: 'DM',
    online: true,
    memberIds: ['f9']
  },
  {
    id: 'c13',
    name: 'Zoe Miller',
    avatarUrl: 'https://picsum.photos/seed/zoe/200/200',
    lastMessage: 'Coffee later?',
    timestamp: 'Mon',
    unreadCount: 0,
    type: 'DM',
    online: false,
    memberIds: ['f10']
  },
  {
    id: 'c14',
    name: 'Elena Rodriguez',
    avatarUrl: 'https://picsum.photos/seed/elena/200/200',
    lastMessage: 'Loved the exhibition opening!',
    timestamp: 'Sun',
    unreadCount: 0,
    type: 'DM',
    online: false,
    memberIds: ['f3']
  },
  {
    id: 'c15',
    name: 'Marcus Johnson',
    avatarUrl: 'https://picsum.photos/seed/marcus/200/200',
    lastMessage: 'Sent you the demo track.',
    timestamp: 'Sun',
    unreadCount: 0,
    type: 'DM',
    online: true,
    memberIds: ['f4']
  }
];

export const MOCK_COMMUNITIES: Community[] = [
  {
    id: 'com1',
    // Fix: Added missing required properties for Community
    ownerId: 'f1',
    name: 'Urban Explorers',
    description: 'Discovering the hidden side of the city.',
    coverImageUrl: 'https://picsum.photos/seed/urban/800/400',
    iconUrl: 'https://picsum.photos/seed/urbanicon/200/200',
    memberCount: 1240,
    location: { city: 'Malmö', coordinates: { lat: 55.6049, lng: 13.0038 } },
    visibility: Visibility.PUBLIC,
    channels: [],
    type: 'LOCAL'
  },
  {
    id: 'com2',
    // Fix: Added missing required properties for Community
    ownerId: 'f2',
    name: 'Midnight Chess',
    description: 'Late night games for insomniacs.',
    coverImageUrl: 'https://picsum.photos/seed/chess/800/400',
    iconUrl: 'https://picsum.photos/seed/chessicon/200/200',
    memberCount: 85,
    location: { city: 'Malmö', coordinates: { lat: 55.593, lng: 13.000 } },
    visibility: Visibility.HIDDEN,
    channels: [],
    type: 'LOCAL'
  },
  {
    id: 'com3',
    // Fix: Added missing required properties for Community
    ownerId: 'f3',
    name: 'Möllevången Synthesizers',
    description: 'Modular synth jamming and workshops.',
    coverImageUrl: 'https://picsum.photos/seed/synth/800/400',
    iconUrl: 'https://picsum.photos/seed/synthicon/200/200',
    memberCount: 312,
    location: { city: 'Malmö', coordinates: { lat: 55.5917, lng: 13.0072 } },
    visibility: Visibility.PUBLIC,
    channels: [],
    type: 'LOCAL'
  }
];

export const MOCK_EVENTS: Event[] = [
  {
    id: 'e1',
    communityId: 'com1',
    name: 'Turning Torso Sunset Shoot',
    description: 'Meeting at the base of Turning Torso to catch the sunset over the Öresund bridge. Bring your tripods and wide angle lenses.',
    startTime: '2023-10-12T18:30:00',
    locationName: 'Västra Hamnen',
    attendeeCount: 42,
    isAttending: true,
    publicSlug: 'sunset-shoot-2023',
    geoLocation: { lat: 55.6133, lng: 12.9764 },
    attendees: [MOCK_FRIENDS[0], MOCK_FRIENDS[3], CURRENT_USER]
  },
  {
    id: 'e2',
    communityId: 'com1',
    name: 'Castle Park Night Walk',
    description: 'Exploring the old Kungsparken at night. Bring a flashlight. We will end at the old windmill.',
    startTime: '2023-10-15T20:00:00',
    locationName: 'Slottsparken',
    attendeeCount: 15,
    isAttending: false,
    publicSlug: 'park-walk',
    geoLocation: { lat: 55.6030, lng: 12.9900 },
    attendees: [MOCK_FRIENDS[1]]
  },
  {
    id: 'e3',
    communityId: 'com2',
    name: 'Blitz at Folkets Park',
    description: '5 minute games near the Moriska Paviljongen. Entry fee is 50 SEK. Spectators welcome.',
    startTime: '2023-10-13T22:00:00',
    locationName: 'Folkets Park',
    attendeeCount: 8,
    isAttending: true,
    publicSlug: 'blitz-tourney-oct',
    geoLocation: { lat: 55.5932, lng: 13.0135 },
    attendees: [MOCK_FRIENDS[2], CURRENT_USER]
  }
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'm1', senderId: 'u2', content: 'Hey, are you going to the meetup?', timestamp: '10:30 AM', isMe: false, type: 'TEXT' },
  { id: 'm2', senderId: 'u1', content: 'I think so! What time does it start?', timestamp: '10:31 AM', isMe: true, type: 'TEXT' },
  { id: 'm3', senderId: 'u2', content: 'Around 7 PM. I can pick you up.', timestamp: '10:32 AM', isMe: false, type: 'TEXT' },
];

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
        avatarUrl: friend.avatarUrl 
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

  // 3. Community Hubs removed as requested

  // 4. Gathering (Renamed from Active Gathering)
  {
    id: 'node-gathering-1',
    type: 'GATHERING',
    location: { lat: 55.6080, lng: 13.0000 }, // Central Station / Canal area
    data: { name: 'Live Match', memberCount: 12 },
    chatId: 'c5',
    communityId: 'com2'
  }
];
