
import { Community, Event, Visibility, CommunitySpot, EventVisibility } from '../types';
import { MOCK_FRIENDS, CURRENT_USER } from './users';
import { USER_POOL, GET_USERS_BY_TYPE } from './userPool';

// Helper to extract IDs
const getIds = (users: any[]) => users.map(u => u.id);

// --- TOPIC COMMUNITIES ---
const TOPIC_UNDERGROUND: Community = {
    id: 'topic_underground',
    ownerId: 'u1', // Updated to Current User for Admin Rights
    name: 'Underground',
    description: 'A global network for hidden culture, secret spots, and alternative lifestyles.',
    coverImageUrl: 'https://picsum.photos/seed/underground/800/400',
    iconUrl: 'https://picsum.photos/seed/underground_icon/200/200',
    memberCount: 15000,
    memberIds: [], // Topics are too big for full ID lists in this mock
    location: { city: 'Global', coordinates: { lat: 0, lng: 0 }, radius: 0 },
    visibility: Visibility.PUBLIC,
    channels: [],
    type: 'TOPIC'
};

const TOPIC_RAVE: Community = {
    id: 'topic_rave',
    ownerId: 'u_admin_topic_2',
    name: 'Rave',
    description: 'The collective movement of electronic music, warehouse parties, and dance culture.',
    coverImageUrl: 'https://picsum.photos/seed/rave/800/400',
    iconUrl: 'https://picsum.photos/seed/rave_icon/200/200',
    memberCount: 8200,
    memberIds: [],
    location: { city: 'Global', coordinates: { lat: 0, lng: 0 }, radius: 0 },
    visibility: Visibility.PUBLIC,
    channels: [],
    type: 'TOPIC'
};

const TOPIC_ANALOG: Community = {
    id: 'topic_analog',
    ownerId: 'u_admin_analog',
    name: 'Analog',
    description: 'For the love of film photography, vinyl records, and vintage gear.',
    coverImageUrl: 'https://picsum.photos/seed/analog/800/400',
    iconUrl: 'https://picsum.photos/seed/analog_icon/200/200',
    memberCount: 3400,
    memberIds: [],
    location: { city: 'Global', coordinates: { lat: 0, lng: 0 }, radius: 0 },
    visibility: Visibility.PUBLIC,
    channels: [],
    type: 'TOPIC'
};

const TOPIC_STREET: Community = {
    id: 'topic_street',
    ownerId: 'u_admin_street',
    name: 'Street',
    description: 'Skateboarding, street art, and urban fashion.',
    coverImageUrl: 'https://picsum.photos/seed/street/800/400',
    iconUrl: 'https://picsum.photos/seed/street_icon/200/200',
    memberCount: 5600,
    memberIds: [],
    location: { city: 'Global', coordinates: { lat: 0, lng: 0 }, radius: 0 },
    visibility: Visibility.PUBLIC,
    channels: [],
    type: 'TOPIC'
};

// --- LOCAL COMMUNITIES ---

// 1. Malmö Ravers
// Members: Current User + Friends + All Generated Ravers (15) + Some Locals
// Added 'f8' (Ryan) explicitly to ensure he appears in gatherings
const raverIds = [
    CURRENT_USER.id, 
    ...getIds(MOCK_FRIENDS.slice(0, 5)),
    'f8', 
    ...getIds(GET_USERS_BY_TYPE('RAVER')), 
    ...getIds(GET_USERS_BY_TYPE('LOCAL').slice(0, 5))
];

const COM_MALMO_RAVERS: Community = {
    id: 'com_ravers',
    ownerId: 'u1', 
    name: 'Malmö Ravers',
    description: 'The pulse of Malmös industrial district.',
    coverImageUrl: 'https://picsum.photos/seed/ravers/800/400',
    iconUrl: 'https://picsum.photos/seed/ravers_icon/200/200',
    memberCount: raverIds.length,
    memberIds: raverIds,
    location: { city: 'Malmö', coordinates: { lat: 55.61, lng: 13.02 }, radius: 3000 },
    visibility: Visibility.PUBLIC,
    type: 'LOCAL',
    topicIds: ['topic_underground', 'topic_rave'],
    channels: [
        { id: 'mr_1', name: 'general', type: 'text', category: 'Main' },
        { id: 'mr_4', name: 'Bass Bunker', type: 'voice', category: 'Voice' }
    ],
    spots: [
        {
            id: 'spot_1',
            name: 'The Harbor Bunker',
            location: { lat: 55.6150, lng: 13.0250 },
            radius: 300, 
            minPeople: 3, 
            communityId: 'com_ravers',
            type: 'COMMUNITY',
            icon: '🏢' // Custom Icon Added
        },
        {
            id: 'spot_ue_secret',
            name: 'Basement Exit',
            location: { lat: 55.6000, lng: 13.0100 },
            radius: 150,
            minPeople: 2, 
            communityId: 'com_ravers',
            type: 'PRIVATE',
            privateGroupId: 'pg_1'
        }
    ]
};

// 2. Community House
const houseIds = [
    CURRENT_USER.id, 
    ...getIds(MOCK_FRIENDS), 
    ...getIds(GET_USERS_BY_TYPE('TECHIE')), 
    ...getIds(GET_USERS_BY_TYPE('LOCAL'))
];

const COM_COMMUNITY_HOUSE: Community = {
    id: 'com_community_house',
    ownerId: 'u_ch_admin',
    name: 'Community House',
    description: 'A radical experiment in co-living and shared creativity.',
    coverImageUrl: 'https://picsum.photos/seed/communityhouse/800/400',
    iconUrl: 'https://picsum.photos/seed/communityhouseicon/200/200',
    memberCount: houseIds.length,
    memberIds: houseIds,
    location: { city: 'Malmö', coordinates: { lat: 55.595, lng: 13.005 }, radius: 500 },
    visibility: Visibility.PUBLIC,
    type: 'LOCAL',
    topicIds: ['topic_underground'],
    channels: [
        { id: 'ch_ch_1', name: 'lobby', type: 'text', category: 'House' },
    ],
    spots: [
        {
            id: 'spot_ch_main',
            name: 'The House',
            location: { lat: 55.595, lng: 13.005 },
            radius: 100,
            minPeople: 3, 
            communityId: 'com_community_house',
            type: 'COMMUNITY',
            icon: '🏠' // Custom Icon Added
        }
    ]
};

// 3. Urban Explorers
const explorerIds = [
    ...getIds(MOCK_FRIENDS.slice(5, 10)), 
    ...getIds(GET_USERS_BY_TYPE('EXPLORER')), 
    ...getIds(GET_USERS_BY_TYPE('LOCAL').slice(10, 15))
];

const COM_URBAN_EXPLORERS: Community = {
    id: 'com1',
    ownerId: 'u_ue_admin',
    name: 'Urban Explorers',
    description: 'Discovering the hidden side of the city.',
    coverImageUrl: 'https://picsum.photos/seed/urban/800/400',
    iconUrl: 'https://picsum.photos/seed/urbanicon/200/200',
    memberCount: explorerIds.length,
    memberIds: explorerIds,
    location: { city: 'Malmö', coordinates: { lat: 55.6049, lng: 13.0038 }, radius: 5000 },
    visibility: Visibility.PUBLIC,
    type: 'LOCAL',
    topicIds: ['topic_underground'],
    channels: [
        { id: 'ue_7', name: 'general', type: 'text', category: 'Discussion' }
    ],
    spots: [] // No spots
};

// 4. Folkets Park Gardeners
const gardenerIds = [
    ...getIds(MOCK_FRIENDS.slice(2, 5)), 
    ...getIds(GET_USERS_BY_TYPE('GARDENER')), 
    ...getIds(GET_USERS_BY_TYPE('LOCAL').slice(5, 10))
];

const COM_GARDENERS: Community = {
    id: 'com_gardeners',
    ownerId: 'u_gardener_admin',
    name: 'Folkets Park Gardeners',
    description: 'Urban gardening, guerrilla planting, and park life.',
    coverImageUrl: 'https://picsum.photos/seed/garden/800/400',
    iconUrl: 'https://picsum.photos/seed/garden_icon/200/200',
    memberCount: gardenerIds.length,
    memberIds: gardenerIds,
    location: { city: 'Malmö', coordinates: { lat: 55.594, lng: 13.014 }, radius: 800 },
    visibility: Visibility.PUBLIC,
    type: 'LOCAL',
    topicIds: ['topic_underground'],
    channels: [
        { id: 'ch_g_1', name: 'general', type: 'text', category: 'Main' },
        { id: 'ch_g_2', name: 'seed-swap', type: 'text', category: 'Trade' }
    ],
    spots: [] // No spots
};

const COM_ANALOG_MALMO: Community = {
    id: 'com_analog_malmo',
    ownerId: 'f11', // Lucas
    name: 'Malmö Analog Club',
    description: 'Weekly photo walks and darkroom sessions.',
    coverImageUrl: 'https://picsum.photos/seed/analog_club/800/400',
    iconUrl: 'https://picsum.photos/seed/analog_club_icon/200/200',
    memberCount: 145,
    memberIds: ['u1', 'f1', 'f11', 'f3'],
    location: { city: 'Malmö', coordinates: { lat: 55.5945, lng: 13.0005 }, radius: 1500 }, // Triangeln
    visibility: Visibility.PUBLIC,
    type: 'LOCAL',
    topicIds: ['topic_analog'],
    channels: [
        { id: 'ch_ana_1', name: 'general', type: 'text', category: 'Main' },
        { id: 'ch_ana_2', name: 'gear-swap', type: 'text', category: 'Market' }
    ],
    spots: [
        {
            id: 'spot_darkroom',
            name: 'The Darkroom',
            location: { lat: 55.5950, lng: 13.0010 },
            radius: 50,
            minPeople: 2,
            communityId: 'com_analog_malmo',
            type: 'COMMUNITY',
            icon: '🎞️'
        }
    ]
};

const COM_SKATE: Community = {
    id: 'com_skate',
    ownerId: 'f12', // Sofia
    name: 'Concrete Surfers',
    description: 'Stapelbäddsparken locals.',
    coverImageUrl: 'https://picsum.photos/seed/skate/800/400',
    iconUrl: 'https://picsum.photos/seed/skate_icon/200/200',
    memberCount: 230,
    memberIds: ['u1', 'f12', 'f4', 'f9'],
    location: { city: 'Malmö', coordinates: { lat: 55.6140, lng: 12.9800 }, radius: 1000 },
    visibility: Visibility.PUBLIC,
    type: 'LOCAL',
    topicIds: ['topic_street'],
    channels: [
        { id: 'ch_sk8_1', name: 'session-planning', type: 'text', category: 'Main' },
        { id: 'ch_sk8_2', name: 'clips', type: 'text', category: 'Media' }
    ],
    spots: [
        {
            id: 'spot_bowl',
            name: 'The Bowl',
            location: { lat: 55.6145, lng: 12.9810 }, // Stapelbäddsparken
            radius: 100,
            minPeople: 3,
            communityId: 'com_skate',
            type: 'COMMUNITY',
            icon: '🛹'
        }
    ]
};

export const MOCK_COMMUNITIES: Community[] = [
    TOPIC_UNDERGROUND,
    TOPIC_RAVE,
    TOPIC_ANALOG,
    TOPIC_STREET,
    COM_MALMO_RAVERS,
    COM_COMMUNITY_HOUSE,
    COM_URBAN_EXPLORERS,
    COM_GARDENERS,
    COM_ANALOG_MALMO,
    COM_SKATE
];

// Helper to get a date in the future
const getFutureDate = (days: number, hours: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(d.getHours() + hours);
    return d.toISOString();
};

export const MOCK_EVENTS: Event[] = [
    {
        id: 'e_map_2',
        hostId: 'f4',
        communityId: 'com1',
        name: 'Sunset Silo Climb',
        description: 'Watching the sun go down from the top of the old grain silo.',
        coverImageUrl: 'https://picsum.photos/seed/silo/800/400',
        startTime: getFutureDate(0, 6),
        locationName: 'Old Grain Silo',
        attendeeCount: 12,
        isAttending: false,
        publicSlug: 'silo-climb',
        geoLocation: { lat: 55.6120, lng: 13.0150 },
        visibility: EventVisibility.COMMUNITY_ONLY,
        status: 'ACTIVE'
    },
    {
        id: 'e_vinyl_swap',
        hostId: 'f11',
        communityId: 'com_analog_malmo',
        name: 'Sunday Vinyl Swap',
        description: 'Bring your crates. Trade, buy, or just listen.',
        coverImageUrl: 'https://picsum.photos/seed/vinyl/800/400',
        startTime: getFutureDate(2, 14), // 2 days from now, 2 PM
        locationName: 'Mitt Möllan',
        attendeeCount: 28,
        isAttending: true,
        publicSlug: 'vinyl-swap-sunday',
        geoLocation: { lat: 55.5920, lng: 13.0080 },
        visibility: EventVisibility.PUBLIC,
        status: 'ACTIVE'
    }
];
