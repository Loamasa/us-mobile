
export enum Visibility {
  PUBLIC = 'PUBLIC',
  LINK_ONLY = 'LINK_ONLY',
  HIDDEN = 'HIDDEN'
}

export enum EventVisibility {
  PUBLIC = 'PUBLIC',
  COMMUNITY_ONLY = 'COMMUNITY_ONLY',
  INVITE_ONLY = 'INVITE_ONLY'
}

export enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY'
}

export type CommunityRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface UserSpot {
  id: string;
  ownerId: string;
  name: string;
  location: { lat: number; lng: number };
  radius: number; // Radius in meters
  icon: string; // Emoji or icon char
  isActive: boolean; // Toggle visibility for this specific spot
}

// NEW: Location Context for UI
export interface UserLocationContext {
  type: 'GATHERING' | 'SPOT' | 'CLUSTER';
  name: string;
  communityId?: string; // For coloring/linking
  timestamp: string;
  coordinates?: { lat: number; lng: number }; // Added for navigation
}

export interface UserSignal {
  id: string;
  emoji: string;
  text: string;
  expiresAt: string; // ISO Date
  audienceIds: string[]; // List of Friend IDs OR Group IDs OR 'GLOBAL'
  location: { lat: number; lng: number }; // Snapshot of location at time of setting
}

export interface UserSettings {
  globalLocationSharing: boolean;
  notificationDefaults: 'ALL' | 'MENTIONS' | 'NONE';
  readReceiptsEnabled: boolean;
  language?: string;
  // Privacy Settings
  showOnlineStatus: boolean;
  allowFriendRequests: boolean;
  shareActivityStatus: boolean;
  // Notification Settings
  enableSounds?: boolean;
  enablePushNotifications?: boolean;
  emailDigestFrequency?: 'DAILY' | 'WEEKLY' | 'NEVER';
  // Accessibility
  fontSize?: 'SMALL' | 'MEDIUM' | 'LARGE';
  reducedMotion?: boolean;
  highContrast?: boolean;
  // Interface
  hideMutedChannels?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  unreadCount?: number;
  category?: string;
  isMuted?: boolean;
  notificationSettings?: NotificationSetting;
}

export interface PrivateGroup {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  channels?: Channel[]; // User's private channels within this tag
  communityId: string; // Scoped to a specific community
  memberIds?: string[]; // Specific list of member IDs for map projection
}

export interface FriendCategory {
  id: string;
  name: string;
  color: string; // Hex color
  userIds: string[];
}

export interface User {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  status: UserStatus;
  settings?: UserSettings;
  privateGroups?: PrivateGroup[]; // User's private tags/groups
  blockedUserIds?: string[]; 
  friendCategories?: FriendCategory[]; 
  nickname?: string; // Custom nickname for friends
  subscriptionTier?: SubscriptionTier; // Added: Subscription Tier
  userSpots?: UserSpot[]; // Added: Personal User Spots
  currentSignal?: UserSignal; // Added: Live Signal
}

export type SubscriptionTier = 'FREE' | 'BASIC' | 'PREMIUM';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  features: string[];
  limits: {
    maxUploadSizeBytes: number;
    maxServers: number;
    customBadges: boolean;
    animatedAvatars: boolean;
  };
}

export interface UserSubscription {
  tier: SubscriptionTier;
  since: string;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED';
  nextBilling?: string;
}

export interface FriendRequest {
  id: string;
  fromUser: User;
  toUserId: string; // Target of the request
  status: 'PENDING' | 'ACCEPTED' | 'IGNORED';
  timestamp: string;
}

export interface CommunitySpot {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  radius: number; // Radius in meters
  minPeople: number; // Threshold to show on map
  communityId: string;
  type: 'COMMUNITY' | 'PRIVATE'; 
  privateGroupId?: string; // Linked Private Group
  icon?: string; // Custom icon/emoji for the spot
}

export type CommunityType = 'LOCAL' | 'TOPIC';

export interface Community {
  id: string;
  ownerId: string; 
  name: string;
  description: string;
  coverImageUrl: string;
  iconUrl: string;
  memberCount: number;
  memberIds?: string[]; // Added: Specific list of member IDs for referential integrity
  location: {
    city: string;
    coordinates: { lat: number; lng: number };
    radius?: number; 
  };
  visibility: Visibility;
  channels: Channel[];
  categories?: string[]; 
  type: CommunityType;
  topicIds?: string[];
  spots?: CommunitySpot[];
  vanitySlug?: string; // Added: Custom invite slug for boosted servers
  
  // Notification Defaults
  defaultNotificationLevel?: NotificationSetting;
  allowEveryoneMention?: boolean;
  allowHereMention?: boolean;
}

// NEW: Invite Type
export interface CommunityInvite {
  code: string;
  communityId: string;
  creatorId: string;
  createdAt: string; // ISO String
  expiresAt: string | 'never'; // ISO String or 'never'
  maxUses: number | 'unlimited';
  uses: number;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface Attachment {
  type: 'IMAGE' | 'VIDEO' | 'AUDIO';
  url: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string; 
  isMe: boolean;
  type?: 'TEXT' | 'SYSTEM' | 'INVITE';
  
  // New Features
  status?: MessageStatus;
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyToId?: string; 
  replyToMessage?: Message; 
  isEdited?: boolean;
}

export type ChatType = 'DM' | 'GROUP' | 'GATHERING';
export type MapVisibility = 'ALWAYS' | 'ASK' | 'NEVER';
export type NotificationSetting = 'ALL' | 'MENTIONS' | 'MUTED';

export interface ChatSummary {
  id: string;
  name: string;
  avatarUrl: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  type: ChatType;
  online?: boolean;
  memberIds?: string[];
  
  // New Settings
  mapVisibility?: MapVisibility;
  fixedLocation?: { lat: number; lng: number }; 
  notificationSettings?: NotificationSetting;
  mutedUntil?: string; 
  isArchived?: boolean; 
}

export type RecurrenceFrequency = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  endDate?: string; 
}

export interface Event {
  id: string;
  hostId?: string;
  communityId: string;
  name: string;
  description: string;
  coverImageUrl?: string; 
  startTime: string;
  locationName: string;
  attendeeCount: number;
  isAttending: boolean;
  publicSlug: string;
  coordinates?: { x: number; y: number };
  geoLocation?: { lat: number; lng: number };
  attendees?: User[];
  spotId?: string; 
  recurrence?: RecurrenceConfig;
  visibility?: EventVisibility;
  status?: 'ACTIVE' | 'CANCELLED'; 
  cancellationReason?: string; 
}

export interface MapEntity {
  id: string;
  type: 'FRIEND' | 'COMMUNITY' | 'GATHERING' | 'GROUP' | 'EVENT';
  location: { lat: number; lng: number };
  data: any;
  chatId?: string;
  communityId?: string;
  privateGroupId?: string;
  eventId?: string;
}

export interface LocationPresence {
  userId: string;
  coordinates: { lat: number; lng: number };
  lastUpdated: string;
  precision: 'EXACT' | 'APPROXIMATE';
}

export interface CommunitySupporter {
  userId: string;
  since: string;
}
