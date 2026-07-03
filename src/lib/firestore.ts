import {
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  arrayRemove,
  arrayUnion,
  GeoPoint,
  Timestamp,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { LOCATION_TTL_MS } from '@/config/constants';
import type {
  UserProfile,
  Friend,
  FriendRequest,
  LocationPresence,
  UserSpot,
  ChatSummary,
  Message,
  Broadcast,
} from '@/types';

// ─── Listener error handling ─────────────────────────

// Every onSnapshot gets an error callback: without one, a single
// permission-denied (e.g. the teardown race while switching accounts, when a
// listener fires with auth momentarily null) becomes an "Uncaught Error in
// snapshot listener" red box AND silently kills the listener. Subscriptions
// re-wire on auth change, so logging is the right recovery here.
function onSnapshotError(label: string) {
  return (err: unknown) => {
    console.warn(`[firestore] ${label} listener error:`, err);
  };
}

// ─── User Profile ────────────────────────────────────

export function userRef(userId: string): DocumentReference {
  return doc(db, 'users', userId);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(userRef(userId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as UserProfile;
  } catch (e) {
    // Firestore offline or emulator not running — treat as no profile
    console.warn('getUserProfile failed (Firestore offline?):', e);
    return null;
  }
}

export function onUserProfile(
  userId: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  return onSnapshot(
    userRef(userId),
    (snap) => {
      if (!snap.exists()) return callback(null);
      callback({ id: snap.id, ...snap.data() } as UserProfile);
    },
    onSnapshotError('onUserProfile')
  );
}

// ─── Handle Uniqueness ───────────────────────────────

export async function isHandleAvailable(handle: string, currentUserId?: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'handles', handle.toLowerCase()));
  if (!snap.exists()) return true;
  // Allow re-using your own handle
  if (currentUserId && snap.data()?.userId === currentUserId) return true;
  return false;
}

export async function reserveHandle(handle: string, userId: string): Promise<void> {
  await setDoc(doc(db, 'handles', handle.toLowerCase()), { userId });
}

// ─── Friends ─────────────────────────────────────────

export function onFriends(
  userId: string,
  callback: (friends: Friend[]) => void
): Unsubscribe {
  const friendsCol = collection(db, 'users', userId, 'friends');
  const q = query(friendsCol, where('status', '==', 'ACTIVE'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ userId: d.id, ...d.data() } as Friend)));
    },
    onSnapshotError('onFriends')
  );
}

export function onFriendRequests(
  userId: string,
  callback: (requests: FriendRequest[]) => void
): Unsubscribe {
  const reqCol = collection(db, 'users', userId, 'friendRequests');
  const q = query(reqCol, where('status', '==', 'PENDING'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest)));
    },
    onSnapshotError('onFriendRequests')
  );
}

export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<void> {
  const reqCol = collection(db, 'users', toUserId, 'friendRequests');
  const requestDoc = doc(reqCol);
  await setDoc(requestDoc, {
    fromUserId,
    toUserId,
    status: 'PENDING',
    createdAt: serverTimestamp(),
  });
}

export async function acceptFriendRequest(
  myUserId: string,
  requestId: string,
  theirUserId: string
): Promise<void> {
  const batch = writeBatch(db);

  // Update request status
  const reqRef = doc(db, 'users', myUserId, 'friendRequests', requestId);
  batch.update(reqRef, { status: 'ACCEPTED' });

  // Add to both friend lists
  const myFriendRef = doc(db, 'users', myUserId, 'friends', theirUserId);
  batch.set(myFriendRef, {
    status: 'ACTIVE',
    since: serverTimestamp(),
    nickname: null,
  });

  const theirFriendRef = doc(db, 'users', theirUserId, 'friends', myUserId);
  batch.set(theirFriendRef, {
    status: 'ACTIVE',
    since: serverTimestamp(),
    nickname: null,
  });

  await batch.commit();
}

export async function rejectFriendRequest(
  myUserId: string,
  requestId: string
): Promise<void> {
  const reqRef = doc(db, 'users', myUserId, 'friendRequests', requestId);
  await updateDoc(reqRef, { status: 'REJECTED' });
}

/**
 * Ends a friendship in both directions. Rules authorize each delete because
 * every write touches an edge where the caller is userId or friendId (the
 * same both-parties rule that lets acceptFriendRequest batch both inserts).
 * Location visibility revokes automatically — the rules read gate checks
 * exists(users/{owner}/friends/{reader}).
 */
export async function removeFriend(
  userId: string,
  friendId: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', userId, 'friends', friendId));
  batch.delete(doc(db, 'users', friendId, 'friends', userId));
  await batch.commit();
}

// ─── Location ────────────────────────────────────────

export function onLocation(
  userId: string,
  callback: (location: LocationPresence | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'locations', userId),
    (snap) => {
      if (!snap.exists()) return callback(null);
      callback({ userId: snap.id, ...snap.data() } as LocationPresence);
    },
    onSnapshotError('onLocation')
  );
}

export async function updateLocation(
  userId: string,
  data: Omit<LocationPresence, 'userId' | 'updatedAt' | 'expireAt'>
): Promise<void> {
  await setDoc(doc(db, 'locations', userId), {
    ...data,
    updatedAt: serverTimestamp(),
    // Firestore TTL target: a console TTL policy on locations.expireAt makes
    // a doc left behind by a killed-forever app self-delete (GDPR retention
    // + no immortal frozen markers). Client clock is fine at day granularity.
    expireAt: Timestamp.fromMillis(Date.now() + LOCATION_TTL_MS),
  });
}

export async function deleteLocation(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'locations', userId));
}

// ─── User Spots ──────────────────────────────────────

export function onUserSpots(
  userId: string,
  callback: (spots: UserSpot[]) => void
): Unsubscribe {
  const spotsCol = collection(db, 'users', userId, 'spots');
  return onSnapshot(
    spotsCol,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserSpot)));
    },
    onSnapshotError('onUserSpots')
  );
}

export async function createUserSpot(
  userId: string,
  spot: Omit<UserSpot, 'id'>
): Promise<string> {
  const spotsCol = collection(db, 'users', userId, 'spots');
  const spotDoc = doc(spotsCol);
  await setDoc(spotDoc, spot);
  return spotDoc.id;
}

export async function updateUserSpot(
  userId: string,
  spotId: string,
  data: Partial<Omit<UserSpot, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'spots', spotId), data);
}

export async function deleteUserSpot(
  userId: string,
  spotId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'spots', spotId));
}

export async function toggleUserSpot(
  userId: string,
  spotId: string,
  isActive: boolean
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'spots', spotId), { isActive });
}

// ─── Chats ───────────────────────────────────────────

export function onChats(
  userId: string,
  callback: (chats: ChatSummary[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'chats'),
    where('memberIds', 'array-contains', userId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const chats = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as ChatSummary)
      );
      // Sort client-side to avoid a composite index on (memberIds, lastMessageAt).
      chats.sort((a, b) => {
        const aT = a.lastMessageAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
        const bT = b.lastMessageAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
        return bT - aT;
      });
      callback(chats);
    },
    onSnapshotError('onChats')
  );
}

export function onChatSummary(
  chatId: string,
  callback: (chat: ChatSummary | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'chats', chatId),
    (snap) => {
      if (!snap.exists()) return callback(null);
      callback({ id: snap.id, ...snap.data() } as ChatSummary);
    },
    onSnapshotError('onChatSummary')
  );
}

export function onMessages(
  chatId: string,
  callback: (messages: Message[]) => void,
  max = 100
): Unsubscribe {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(
        snap.docs.map(
          (d) => ({ id: d.id, chatId, ...d.data() } as Message)
        )
      );
    },
    onSnapshotError('onMessages')
  );
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  content: string
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;

  const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId,
    content: trimmed,
    createdAt: serverTimestamp(),
  });

  // Update chat's lastMessage for list previews. Non-fatal if it fails.
  try {
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: trimmed,
      lastMessageAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('sendMessage: failed to update lastMessage', e);
  }

  return void msgRef;
}

// ─── Group Broadcasts ────────────────────────────────
// Visibility is members + invitees only (rules-enforced). Expiry is checked
// client-side against expiresAt, same as signals.

export function onMyBroadcasts(
  userId: string,
  callback: (broadcasts: Broadcast[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'broadcasts'),
    where('memberIds', 'array-contains', userId)
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Broadcast)));
    },
    onSnapshotError('onMyBroadcasts')
  );
}

export function onBroadcastInvites(
  userId: string,
  callback: (broadcasts: Broadcast[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'broadcasts'),
    where('invitedIds', 'array-contains', userId)
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Broadcast)));
    },
    onSnapshotError('onBroadcastInvites')
  );
}

/**
 * A friend's SOLO gatherings (visibility 'FRIENDS'). The query pins
 * createdBy + visibility so the rules' friendship `exists()` check is
 * statically satisfiable — never widen it or the whole query gets denied.
 */
export function onFriendSoloBroadcasts(
  friendId: string,
  callback: (broadcasts: Broadcast[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'broadcasts'),
    where('createdBy', '==', friendId),
    where('visibility', '==', 'FRIENDS')
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Broadcast)));
    },
    onSnapshotError('onFriendSoloBroadcasts')
  );
}

export async function createBroadcast(params: {
  createdBy: string;
  emoji: string;
  text: string;
  location: { latitude: number; longitude: number };
  radius: number;
  expiresAt: Date;
  visibility: 'FRIENDS' | 'MEMBERS';
  invitedIds: string[];
}): Promise<string> {
  const {
    createdBy,
    emoji,
    text,
    location,
    radius,
    expiresAt,
    visibility,
    invitedIds,
  } = params;
  const ref = await addDoc(collection(db, 'broadcasts'), {
    createdBy,
    emoji,
    text,
    location: new GeoPoint(location.latitude, location.longitude),
    radius,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    visibility,
    memberIds: [createdBy],
    invitedIds,
    chatId: null,
  });
  return ref.id;
}

/** Invitee accepts: moves THEMSELVES from invitedIds into memberIds. */
export async function acceptBroadcastInvite(
  broadcastId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, 'broadcasts', broadcastId), {
    memberIds: arrayUnion(userId),
    invitedIds: arrayRemove(userId),
  });
}

export async function declineBroadcastInvite(
  broadcastId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, 'broadcasts', broadcastId), {
    invitedIds: arrayRemove(userId),
  });
}

export async function setBroadcastChat(
  broadcastId: string,
  chatId: string
): Promise<void> {
  await updateDoc(doc(db, 'broadcasts', broadcastId), { chatId });
}

export async function deleteBroadcast(broadcastId: string): Promise<void> {
  await deleteDoc(doc(db, 'broadcasts', broadcastId));
}

/**
 * Find an existing GROUP chat whose memberIds exactly match the given set,
 * or create a new one. Deterministic on (memberIds, type), so tapping
 * "Open Group Chat" for the same cluster reuses the chat.
 */
export async function getOrCreateGroupChat(params: {
  memberIds: string[];
  createdBy: string;
  name: string;
  mapVisibility?: 'ALWAYS' | 'ASK' | 'NEVER';
  fixedLocation?: { latitude: number; longitude: number };
}): Promise<string> {
  const { memberIds, createdBy, name, mapVisibility, fixedLocation } = params;
  const sorted = [...memberIds].sort();

  // Look up existing chat by membership + type.
  const q = query(
    collection(db, 'chats'),
    where('type', '==', 'GROUP'),
    where('memberIds', 'array-contains', createdBy)
  );
  const snap = await getDocs(q);
  const existing = snap.docs.find((d) => {
    const data = d.data() as ChatSummary;
    const theirs = [...(data.memberIds ?? [])].sort();
    if (theirs.length !== sorted.length) return false;
    return theirs.every((id, i) => id === sorted[i]);
  });
  if (existing) return existing.id;

  const ref = await addDoc(collection(db, 'chats'), {
    name,
    avatarUrl: null,
    type: 'GROUP',
    memberIds: sorted,
    createdBy,
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageAt: null,
    ...(mapVisibility ? { mapVisibility } : {}),
    ...(fixedLocation
      ? { fixedLocation: new GeoPoint(fixedLocation.latitude, fixedLocation.longitude) }
      : {}),
  });
  return ref.id;
}

/**
 * Leave a group chat: remove yourself from memberIds. Authorized by the
 * rules' self-removal branch (only memberIds may change, only you may be
 * removed). Navigate away BEFORE awaiting — losing membership kills the
 * caller's own chat listeners.
 */
export async function leaveGroupChat(
  chatId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, 'chats', chatId), { memberIds: arrayRemove(userId) });
}

/**
 * Find or create a DM chat between two users. The doc id is deterministic —
 * `dm_${sortedMemberIds.join('_')}` — so two clients racing to create the
 * same DM converge on one doc instead of each adding their own room.
 * Stores `name: null` — the viewer derives the title from the peer's profile.
 */
export function dmChatId(a: string, b: string): string {
  return `dm_${[a, b].sort().join('_')}`;
}

export async function getOrCreateDmChat(params: {
  viewerId: string;
  peerId: string;
}): Promise<string> {
  const { viewerId, peerId } = params;
  if (viewerId === peerId) throw new Error('Cannot DM yourself');
  const sorted = [viewerId, peerId].sort();
  const chatId = dmChatId(viewerId, peerId);
  const ref = doc(db, 'chats', chatId);

  const snap = await getDoc(ref);
  if (snap.exists()) return chatId;

  await setDoc(
    ref,
    {
      name: null,
      avatarUrl: null,
      type: 'DM',
      memberIds: sorted,
      createdBy: viewerId,
      createdAt: serverTimestamp(),
      lastMessage: null,
      lastMessageAt: null,
    },
    { merge: true }
  );
  return chatId;
}
