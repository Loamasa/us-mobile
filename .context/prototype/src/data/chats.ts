
import { ChatSummary, Message } from '../types';
import { GROUP_MEMBER_IDS } from './users';

export const MOCK_CHATS: ChatSummary[] = [
  {
    id: 'c_analog_talk',
    name: 'Analog Gear Talk',
    avatarUrl: 'https://picsum.photos/seed/analog_gear/200/200',
    lastMessage: 'Anyone tried the new Kodak Gold 200?',
    timestamp: '1h ago',
    unreadCount: 4,
    type: 'GROUP',
    memberIds: ['u1', 'f1', 'f11'] // Lucas included
  },
  {
    id: 'c_skate_session',
    name: 'Skate Session',
    avatarUrl: 'https://picsum.photos/seed/skate_chat/200/200',
    lastMessage: 'Park is dry, let\'s go.',
    timestamp: '20m ago',
    unreadCount: 2,
    type: 'GROUP',
    memberIds: ['u1', 'f12', 'f4'] // Sofia included
  },
  {
    id: 'c_lucas_dm',
    name: 'Lucas N',
    avatarUrl: 'https://picsum.photos/seed/lucas/200/200',
    lastMessage: 'Found that lens you wanted!',
    timestamp: '2h ago',
    unreadCount: 1,
    type: 'DM',
    online: true,
    memberIds: ['f11']
  },
  {
    id: 'c_sofia_dm',
    name: 'Sofia K',
    avatarUrl: 'https://picsum.photos/seed/sofia/200/200',
    lastMessage: 'Did you see the clip?',
    timestamp: 'Yesterday',
    unreadCount: 0,
    type: 'DM',
    online: false,
    memberIds: ['f12']
  },
  {
    id: 'c_mollevangen',
    name: 'Möllevången Crew',
    avatarUrl: 'https://picsum.photos/seed/mollevangen/200/200',
    lastMessage: 'Anyone near the square?',
    timestamp: 'Now',
    unreadCount: 1,
    type: 'GROUP',
    // 9 members total as requested, representing the full group
    memberIds: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9'], 
    mapVisibility: 'ALWAYS',
    fixedLocation: { lat: 55.5917, lng: 13.0070 } // Möllevångstorget
  },
  {
    id: 'c_triangeln',
    name: 'Triangeln Coffee',
    avatarUrl: 'https://picsum.photos/seed/coffee_group/200/200',
    lastMessage: 'Meet at 3?',
    timestamp: '15m ago',
    unreadCount: 0,
    type: 'GROUP',
    memberIds: ['f8', 'f9', 'f10'], 
    mapVisibility: 'ALWAYS',
    fixedLocation: { lat: 55.6000, lng: 13.0000 } // Triangeln
  },
  {
    id: 'c_harbor_session',
    name: 'Harbor Skaters',
    avatarUrl: 'https://picsum.photos/seed/harbor_skate/200/200',
    lastMessage: 'The ground is dry finally!',
    timestamp: '1h ago',
    unreadCount: 0,
    type: 'GROUP',
    memberIds: ['f1', 'f4', 'f9'],
    mapVisibility: 'ALWAYS',
    fixedLocation: { lat: 55.6140, lng: 12.9800 } // Western Harbor
  },
  {
    id: 'c1',
    name: 'Photography Club',
    avatarUrl: 'https://picsum.photos/seed/photo/200/200',
    lastMessage: 'Who is coming to the golden hour shoot?',
    timestamp: '10:42 AM',
    unreadCount: 3,
    type: 'GROUP',
    memberIds: ['f1', 'f3', 'f4'],
    mapVisibility: 'ASK'
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
    memberIds: ['f2', 'f9', 'f10'],
    mapVisibility: 'NEVER'
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
    id: 'c_gh_kitchen',
    name: 'Kitchen Table',
    avatarUrl: 'https://picsum.photos/seed/communityhouseicon/200/200',
    lastMessage: 'Soup is ready!',
    timestamp: '2m ago',
    unreadCount: 2,
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
    memberIds: ['f8', 'f7', 'f5'],
    mapVisibility: 'ALWAYS'
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
    id: 'c_ryan_dm',
    name: 'Ryan O\'Connell',
    avatarUrl: 'https://picsum.photos/seed/ryan/200/200',
    lastMessage: 'Heading to the bunker?',
    timestamp: '5m ago',
    unreadCount: 0,
    type: 'DM',
    online: true,
    memberIds: ['f8']
  },
  {
    id: 'c_elena_dm',
    name: 'Elena Rodriguez',
    avatarUrl: 'https://picsum.photos/seed/elena/200/200',
    lastMessage: 'Check out these photos!',
    timestamp: '1h ago',
    unreadCount: 2,
    type: 'DM',
    online: true,
    memberIds: ['f3']
  }
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'm1', senderId: 'u2', content: 'Hey, are you going to the meetup?', timestamp: '10:30 AM', isMe: false, type: 'TEXT' },
  { id: 'm2', senderId: 'u1', content: 'I think so! What time does it start?', timestamp: '10:31 AM', isMe: true, type: 'TEXT' },
  { id: 'm3', senderId: 'u2', content: 'Around 7 PM. I can pick you up.', timestamp: '10:32 AM', isMe: false, type: 'TEXT' },
];
