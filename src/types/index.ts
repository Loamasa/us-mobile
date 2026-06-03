import { GeoPoint, Timestamp } from 'firebase/firestore';

// ─── User ────────────────────────────────────────────

export interface UserProfile {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  bio: string;
  phoneNumber: string;
  createdAt: Timestamp;
  settings: UserSettings;
  currentSignal: UserSignal | null;
}

export interface UserSettings {
  globalLocationSharing: boolean; // true = sharing, false = ghost mode
  allowFriendRequests: boolean;
  showOnlineStatus: boolean;
}

export interface UserSignal {
  emoji: string;
  text: string;
  expiresAt: Timestamp;
  location: GeoPoint;
}

// ─── Friends ─────────────────────────────────────────

export interface Friend {
  userId: string;
  status: 'ACTIVE';
  since: Timestamp;
  nickname: string | null;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Timestamp;
}

// ─── Location ────────────────────────────────────────

export interface LocationPresence {
  userId: string;
  geohash: string;
  geopoint: GeoPoint;
  lat: number;
  lng: number;
  updatedAt: Timestamp;
  precision: 'EXACT' | 'APPROXIMATE';
  // Snapshot of the active spot containing the user at the time of this write.
  // Friends render this circle on the map. Only leaks the current spot, not
  // all spots, and only while the user is visible anyway.
  spot?: {
    id: string;
    name: string;
    emoji: string;
    center: GeoPoint;
    radius: number;
  };
}

// ─── Spots ───────────────────────────────────────────

export interface UserSpot {
  id: string;
  name: string;
  emoji: string;
  location: GeoPoint;
  radius: number; // meters
  isActive: boolean;
}

// ─── Map (client-side only, not stored in Firestore) ─

export type MapEntityType = 'FRIEND' | 'CLUSTER';

export interface MapEntity {
  id: string;
  type: MapEntityType;
  location: { lat: number; lng: number };
  friends: FriendOnMap[];
  signal?: { emoji: string; text: string };
  // Set when a named group chat (mapVisibility = 'ALWAYS') matches this cluster.
  // `fixed` = the cluster was synthesized at the chat's fixedLocation because its
  // members are NOT physically clustered right now (resting "home base" pin),
  // as opposed to a live proximity cluster decorated with the group's name.
  groupChat?: { id: string; name: string; fixed?: boolean };
}

export interface FriendOnMap {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  location: { lat: number; lng: number };
  signal: UserSignal | null;
  isOnline: boolean;
  // Name + emoji of the friend's current containing spot, for the popup status line.
  spot: { name: string; emoji: string } | null;
}

// ─── Chats ───────────────────────────────────────────

export type ChatType = 'DM' | 'GROUP';
export type MapVisibility = 'ALWAYS' | 'ASK' | 'NEVER';

export interface ChatSummary {
  id: string;
  // DMs store null and derive the title per-viewer from the peer's profile.
  name: string | null;
  avatarUrl: string | null;
  type: ChatType;
  memberIds: string[];
  createdBy: string;
  createdAt: Timestamp;
  lastMessage: string | null;
  lastMessageAt: Timestamp | null;
  // Named groups that pin to the map even without proximity clustering.
  mapVisibility?: MapVisibility;
  fixedLocation?: GeoPoint;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: Timestamp;
}
