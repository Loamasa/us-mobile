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
  // ALWAYS null by design (kept for doc-shape compat): users/{uid} is
  // readable by any authenticated user, so a GPS fix here would route the
  // most sensitive data around the friends-only locations gate. Nothing
  // renders it. Never populate it — and never gate broadcasting on it.
  location: GeoPoint | null;
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
  // Firestore TTL target (updatedAt + LOCATION_TTL_MS) — docs left behind by
  // a killed-forever app self-delete via the console TTL policy.
  expireAt?: Timestamp;
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

// Optional weekly active window for a spot. Outside the window the spot
// counts as inactive (no location publishing, no own-zone rendering).
export interface SpotSchedule {
  days: number[]; // ISO weekday numbers: 1 = Monday … 7 = Sunday
  start: string; // "HH:mm" (24h)
  end: string; // "HH:mm" — end before start spans midnight
}

export interface UserSpot {
  id: string;
  name: string;
  emoji: string;
  location: GeoPoint;
  radius: number; // meters
  isActive: boolean;
  // Absent/null = active around the clock (when isActive).
  schedule?: SpotSchedule | null;
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
  // Last location write — cards derive "live now" vs "last seen Xm ago" from
  // it at render time. Null for synthesized entries (resting group rosters).
  updatedAt: Timestamp | null;
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

// ─── Gatherings (data name: broadcasts) ──────────────
// A placeable map event with a TTL (FEATURES.md #1). Two flavors:
// - FRIENDS (solo gathering): pin a spot; all the creator's friends can see
//   it and whether the creator is physically there — like a temporary spot.
// - MEMBERS (group gathering): invite-based; only members + invitees can see
//   the pin/roster, invitees must accept to join.

export type BroadcastVisibility = 'FRIENDS' | 'MEMBERS';

export interface Broadcast {
  id: string;
  createdBy: string;
  emoji: string;
  text: string;
  location: GeoPoint;
  // "Here now" containment radius in meters.
  radius: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  visibility: BroadcastVisibility;
  // Creator + accepted invitees. Invitees move themselves over on accept.
  memberIds: string[];
  invitedIds: string[];
  // Set once "Open Group Chat" spawns the deterministic group chat.
  chatId: string | null;
}
