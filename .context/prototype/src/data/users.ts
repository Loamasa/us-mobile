import { User, FriendRequest, UserStatus } from '../types';

export const CURRENT_USER: User = {
  id: 'u1',
  displayName: 'Alex Chen',
  handle: '@alexc',
  avatarUrl: 'https://picsum.photos/seed/alex/200/200',
  bio: 'Digital nomad & coffee enthusiast',
  status: UserStatus.ONLINE,
  subscriptionTier: 'PREMIUM', // Mock Premium Status
  userSpots: [
    { 
        id: 's_u1_home', 
        ownerId: 'u1', 
        name: 'Home Base', 
        icon: '🏠', 
        radius: 200, 
        location: { lat: 55.6049, lng: 13.0038 }, // Gamla Staden / Central
        isActive: true 
    },
    { 
        id: 's_u1_work', 
        ownerId: 'u1', 
        name: 'Coworking', 
        icon: '💻', 
        radius: 300, 
        location: { lat: 55.6110, lng: 12.9850 }, // Västra Hamnen
        isActive: true 
    },
    { 
        id: 's_u1_chill', 
        ownerId: 'u1', 
        name: 'Folkets Park', 
        icon: '🌳', 
        radius: 400, 
        location: { lat: 55.5940, lng: 13.0140 }, // Möllevången area
        isActive: true 
    },
    { 
        id: 's_u1_skate', 
        ownerId: 'u1', 
        name: 'Stapelbäddsparken', 
        icon: '🛹', 
        radius: 150, 
        location: { lat: 55.6140, lng: 12.9800 }, // Skate Park
        isActive: true 
    }
  ],
  settings: {
    globalLocationSharing: true,
    notificationDefaults: 'MENTIONS',
    readReceiptsEnabled: true,
    showOnlineStatus: true,
    allowFriendRequests: true,
    shareActivityStatus: true,
    enableSounds: true,
    enablePushNotifications: true,
    emailDigestFrequency: 'WEEKLY'
  },
  privateGroups: [
    { 
      id: 'pg_1', 
      name: 'Skyddsrum', 
      color: '#F43F5E', 
      memberCount: 15,
      communityId: 'com_ravers',
      // Explicitly list generated IDs so they match the pool
      memberIds: [
          'f1', 'f4', 'f7', 
          'u_raver_0', 'u_raver_1', 'u_raver_2', 'u_raver_3', 'u_raver_4', 
          'u_raver_5', 'u_raver_6', 'u_raver_7', 'u_raver_8', 'u_raver_9'
      ],
      channels: [
        { id: 'pg_c1', name: 'general', type: 'text', category: 'Channels' },
        { id: 'pg_c2', name: 'planning', type: 'text', category: 'Channels' }
      ]
    },
    { 
      id: 'pg_2', 
      name: 'Synth Modders', 
      color: '#8B5CF6', 
      memberCount: 5,
      communityId: 'com3',
      channels: [
        { id: 'pg_c3', name: 'lounge', type: 'text', category: 'Channels' }
      ]
    },
    { 
      id: 'pg_3', 
      name: 'Roof Team', 
      color: '#F59E0B', 
      memberCount: 4,
      communityId: 'com1',
      channels: [
        { id: 'pg_c4', name: 'access-codes', type: 'text', category: 'Channels' }
      ]
    },
    { 
      id: 'pg_residents', 
      name: 'Core Collective', 
      color: '#F472B6', 
      memberCount: 8,
      communityId: 'com_community_house',
      channels: [
        { id: 'pg_ch_res_1', name: 'house-logistics', type: 'text', category: 'Internal' },
        { id: 'pg_ch_res_2', name: 'buying-food', type: 'text', category: 'Internal' }
      ]
    },
    { 
      id: 'pg_4', 
      name: 'High Rollers', 
      color: '#10B981', 
      memberCount: 8,
      communityId: 'com2',
      channels: [
        { id: 'pg_c5', name: 'wagers', type: 'text', category: 'Channels' }
      ]
    }
  ]
};

export const MOCK_FRIENDS: User[] = [
  {
    id: 'f1',
    displayName: 'Sarah Jenkins',
    handle: '@sarahj',
    avatarUrl: 'https://picsum.photos/seed/sarah/200/200',
    bio: 'Photographer',
    status: UserStatus.ONLINE,
    subscriptionTier: 'BASIC',
    userSpots: [
        { id: 's_f1_home', ownerId: 'f1', name: 'Möllevången', icon: '🏠', radius: 1200, location: { lat: 55.592, lng: 13.010 }, isActive: true } 
    ]
  },
  {
    id: 'f2',
    displayName: 'David Kim',
    handle: '@dkim_dev',
    avatarUrl: 'https://picsum.photos/seed/david/200/200',
    bio: 'Software Engineer',
    status: UserStatus.ONLINE,
    userSpots: [
        { id: 's_f2_office', ownerId: 'f2', name: 'Office', icon: '💼', radius: 500, location: { lat: 55.612, lng: 12.980 }, isActive: true }
    ]
  },
  {
    id: 'f3',
    displayName: 'Elena Rodriguez',
    handle: '@elena_r',
    avatarUrl: 'https://picsum.photos/seed/elena/200/200',
    bio: 'Artist',
    status: UserStatus.ONLINE,
    subscriptionTier: 'PREMIUM',
    userSpots: [
        { id: 's_f3_studio', ownerId: 'f3', name: 'Art Studio', icon: '🎨', radius: 1000, location: { lat: 55.590, lng: 13.020 }, isActive: true }
    ]
  },
  {
    id: 'f4',
    displayName: 'Marcus Johnson',
    handle: '@mj_music',
    avatarUrl: 'https://picsum.photos/seed/marcus/200/200',
    bio: 'Musician',
    status: UserStatus.ONLINE,
    subscriptionTier: 'PREMIUM',
    userSpots: [
        { id: 's_f4_home', ownerId: 'f4', name: 'The Lab', icon: '🎵', radius: 800, location: { lat: 55.606, lng: 13.004 }, isActive: true }
    ]
  },
  {
    id: 'f5',
    displayName: 'Jessica Wong',
    handle: '@jess_w',
    avatarUrl: 'https://picsum.photos/seed/jessica/200/200',
    bio: 'UX Researcher',
    status: UserStatus.ONLINE,
    userSpots: [
        { id: 's_f5_gym', ownerId: 'f5', name: 'Climbing Gym', icon: '🧗‍♀️', radius: 300, location: { lat: 55.598, lng: 13.005 }, isActive: true }
    ]
  },
  {
    id: 'f6',
    displayName: 'Tom Baker',
    handle: '@baker_st',
    avatarUrl: 'https://picsum.photos/seed/tom/200/200',
    bio: 'Pastry Chef',
    status: UserStatus.AWAY,
    userSpots: [
        { id: 's_f6_bakery', ownerId: 'f6', name: 'Bakery', icon: '🥐', radius: 200, location: { lat: 55.600, lng: 13.000 }, isActive: true }
    ]
  },
  {
    id: 'f7',
    displayName: 'Aisha Patel',
    handle: '@aisha_p',
    avatarUrl: 'https://picsum.photos/seed/aisha/200/200',
    bio: 'Yoga Instructor',
    status: UserStatus.ONLINE,
    subscriptionTier: 'BASIC',
    userSpots: [
        { id: 's_f7_park', ownerId: 'f7', name: 'Folkets Park', icon: '🌳', radius: 500, location: { lat: 55.594, lng: 13.014 }, isActive: true }
    ]
  },
  {
    id: 'f8',
    displayName: 'Ryan O\'Connell',
    handle: '@ryano',
    avatarUrl: 'https://picsum.photos/seed/ryan/200/200',
    bio: 'Pro Cyclist',
    status: UserStatus.ONLINE, // Changed to ONLINE to ensure he appears in the Gathering
    userSpots: [
        { id: 's_f8_home', ownerId: 'f8', name: 'Home', icon: '🏠', radius: 1000, location: { lat: 55.585, lng: 13.010 }, isActive: true }
    ]
  },
  {
    id: 'f9',
    displayName: 'Wei Chen',
    handle: '@wei_c',
    avatarUrl: 'https://picsum.photos/seed/wei/200/200',
    bio: 'Architect',
    status: UserStatus.ONLINE,
    userSpots: [
        { id: 's_f9_site', ownerId: 'f9', name: 'Work Site', icon: '🏗️', radius: 400, location: { lat: 55.610, lng: 13.030 }, isActive: true }
    ]
  },
  {
    id: 'f10',
    displayName: 'Zoe Miller',
    handle: '@zoem',
    avatarUrl: 'https://picsum.photos/seed/zoe/200/200',
    bio: 'PhD Student',
    status: UserStatus.AWAY,
    userSpots: [
        { id: 's_f10_uni', ownerId: 'f10', name: 'University', icon: '🎓', radius: 800, location: { lat: 55.608, lng: 12.995 }, isActive: true }
    ]
  },
  {
    id: 'f11',
    displayName: 'Lucas N',
    handle: '@lucas_analog',
    avatarUrl: 'https://picsum.photos/seed/lucas/200/200',
    bio: 'Film is not dead. 35mm & 120.',
    status: UserStatus.ONLINE,
    userSpots: []
  },
  {
    id: 'f12',
    displayName: 'Sofia K',
    handle: '@sofia_sk8',
    avatarUrl: 'https://picsum.photos/seed/sofia/200/200',
    bio: 'Kickflip queen. Stapelbäddsparken local.',
    status: UserStatus.AWAY,
    userSpots: []
  }
];

export const MOCK_STRANGERS: User[] = [
  {
    id: 'stranger1',
    displayName: 'Erik Svensson',
    handle: '@erik_s',
    avatarUrl: 'https://picsum.photos/seed/erik/200/200',
    bio: 'Local guide and foodie.',
    status: UserStatus.ONLINE
  },
  {
    id: 'stranger2',
    displayName: 'Lisa Anderson',
    handle: '@lisa_a',
    avatarUrl: 'https://picsum.photos/seed/lisa/200/200',
    bio: 'Cycling enthusiast.',
    status: UserStatus.OFFLINE
  }
];

export const MOCK_FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: 'fr1',
    fromUser: {
      id: 'u99',
      displayName: 'Jordan Lee',
      handle: '@jlee_design',
      avatarUrl: 'https://picsum.photos/seed/jordan/200/200',
      bio: 'UI Designer',
      status: UserStatus.ONLINE
    },
    // Fix: Added missing 'toUserId' property
    toUserId: 'u1',
    status: 'PENDING',
    timestamp: '2h ago'
  }
];

export const MOCK_SUGGESTED_FRIENDS: User[] = [
  {
    id: 'sf1',
    displayName: 'Kai O',
    handle: '@kai_zen',
    avatarUrl: 'https://picsum.photos/seed/kai/200/200',
    bio: 'Minimalist. Tea drinker.',
    status: UserStatus.OFFLINE
  },
  {
    id: 'sf2',
    displayName: 'Luna S',
    handle: '@lunar_s',
    avatarUrl: 'https://picsum.photos/seed/luna/200/200',
    bio: 'Stargazer & Night owl.',
    status: UserStatus.ONLINE
  },
  {
    id: 'sf3',
    displayName: 'Jax M',
    handle: '@jax_beats',
    avatarUrl: 'https://picsum.photos/seed/jax/200/200',
    bio: 'Bedroom producer.',
    status: UserStatus.AWAY
  },
  {
    id: 'sf4',
    displayName: 'Nova K',
    handle: '@supernova',
    avatarUrl: 'https://picsum.photos/seed/nova/200/200',
    bio: 'Tech enthusiast.',
    status: UserStatus.ONLINE
  },
  {
    id: 'sf5',
    displayName: 'Ryu',
    handle: '@street_ryu',
    avatarUrl: 'https://picsum.photos/seed/ryu/200/200',
    bio: 'Urban explorer.',
    status: UserStatus.OFFLINE
  }
];

// Define friends in the local group
export const GROUP_MEMBER_IDS = ['f1', 'f4', 'f7']; // Sarah, Marcus, Aisha
