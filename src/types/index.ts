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
}

export interface FriendOnMap {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  location: { lat: number; lng: number };
  signal: UserSignal | null;
  isOnline: boolean;
}
