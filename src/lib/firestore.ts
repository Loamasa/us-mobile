import {
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
  Bytes,
  GeoPoint,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Query,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { LOCATION_TTL_MS } from '@/config/constants';
import {
  open,
  seal,
  toHex,
  type Envelope,
  type KeyPair,
  type Opened,
} from '@/features/e2ee/envelope';
import {
  isTrustedKey,
  loadIdentity,
  onTrustChange,
  resolveKeys,
} from '@/features/e2ee/keystore';
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

// ─── End-to-end encryption ───────────────────────────
// Message text and group names only exist as envelopes in Firestore; everything
// above this file sees plain strings. The design and its limits are in
// docs/encryption.md.

type WireEnvelope = {
  v: 1;
  from: Bytes;
  n: Bytes;
  body: Bytes;
  grants: Record<string, Bytes>;
};

function toWire(envelope: Envelope): WireEnvelope {
  const grants: Record<string, Bytes> = {};
  for (const [uid, grant] of Object.entries(envelope.grants)) {
    grants[uid] = Bytes.fromUint8Array(grant);
  }
  return {
    v: envelope.v,
    from: Bytes.fromUint8Array(envelope.from),
    n: Bytes.fromUint8Array(envelope.n),
    body: Bytes.fromUint8Array(envelope.body),
    grants,
  };
}

// Anyone in a chat can write anything the rules let through, so check the shape.
function fromWire(raw: unknown): Envelope | null {
  const wire = raw as Partial<WireEnvelope> | null | undefined;
  if (
    wire?.v !== 1 ||
    !(wire.from instanceof Bytes) ||
    !(wire.n instanceof Bytes) ||
    !(wire.body instanceof Bytes) ||
    typeof wire.grants !== 'object' ||
    wire.grants === null
  ) {
    return null;
  }
  const grants: Record<string, Uint8Array> = {};
  for (const [uid, grant] of Object.entries(wire.grants)) {
    if (grant instanceof Bytes) grants[uid] = grant.toUint8Array();
  }
  return {
    v: 1,
    from: wire.from.toUint8Array(),
    n: wire.n.toUint8Array(),
    body: wire.body.toUint8Array(),
    grants,
  };
}

// Waits for the key pair, then subscribes. A failure to load keys still
// subscribes, with `me` null: lists show "locked" instead of staying empty.
function withIdentity(
  userId: string,
  subscribe: (me: KeyPair | null) => Unsubscribe
): Unsubscribe {
  let unsubscribe: Unsubscribe | undefined;
  let cancelled = false;
  const start = (me: KeyPair | null) => {
    if (!cancelled) unsubscribe = subscribe(me);
  };
  loadIdentity(userId).then(start, (e) => {
    console.warn('[e2ee] could not load keys:', e);
    start(null);
  });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

// Snapshots re-deliver every document, and hashing + decrypting 100 messages on
// each new one would stutter on a phone, so remember results per envelope.
const openedCache = new Map<string, Opened | null>();

function openField(
  raw: unknown,
  viewerId: string,
  me: KeyPair | null,
  scope: string
): Opened | null {
  const envelope = me && fromWire(raw);
  if (!me || !envelope) return null;
  const cacheKey = `${viewerId}:${scope}:${toHex(envelope.n)}`;
  const cached = openedCache.get(cacheKey);
  if (cached !== undefined) return cached;
  if (openedCache.size >= 1000) openedCache.clear();
  const opened = open(envelope, viewerId, me, scope);
  openedCache.set(cacheKey, opened);
  return opened;
}

function isFromClaimedSender(
  opened: Opened,
  senderId: string,
  viewerId: string,
  me: KeyPair | null
): boolean {
  if (senderId === viewerId) return !!me && toHex(opened.from) === toHex(me.publicKey);
  return isTrustedKey(senderId, opened.from);
}

const LOCKED_PREVIEW = '🔒 Encrypted message';
const UNVERIFIED_PREVIEW = '⚠️ Message from an unverified key';

function decodeChat(
  id: string,
  data: DocumentData,
  viewerId: string,
  me: KeyPair | null
): ChatSummary {
  let lastMessage: string | null = null;
  let lastSenderId: string | undefined;
  if (data.lastMessage) {
    const opened = openField(data.lastMessage, viewerId, me, `chat:${id}`);
    if (!opened || !data.memberIds?.includes(opened.senderId)) {
      lastMessage = LOCKED_PREVIEW;
    } else {
      lastSenderId = opened.senderId;
      lastMessage = isFromClaimedSender(opened, opened.senderId, viewerId, me)
        ? opened.text
        : UNVERIFIED_PREVIEW;
    }
  }
  return {
    id,
    ...data,
    name: data.name ? (openField(data.name, viewerId, me, `chat-name:${id}`)?.text ?? null) : null,
    lastMessage,
    lastSenderId,
  } as ChatSummary;
}

function decodeMessage(
  snap: QueryDocumentSnapshot,
  chatId: string,
  viewerId: string,
  me: KeyPair | null
): Message {
  const data = snap.data();
  const base = {
    id: snap.id,
    chatId,
    senderId: data.senderId,
    createdAt: data.createdAt,
  };
  const opened = openField(data.envelope, viewerId, me, `chat:${chatId}`);
  if (!opened || opened.senderId !== data.senderId) {
    return { ...base, content: '', security: 'locked' };
  }
  return {
    ...base,
    content: opened.text,
    security: isFromClaimedSender(opened, data.senderId, viewerId, me) ? 'verified' : 'unverified',
  };
}

// For listeners whose callers don't pass a viewer: they re-subscribe on account
// switch anyway, so the current user is the right one.
function withViewer(
  subscribe: (viewerId: string, me: KeyPair | null) => Unsubscribe
): Unsubscribe {
  const viewerId = auth.currentUser?.uid;
  if (!viewerId) return subscribe('', null);
  return withIdentity(viewerId, (me) => subscribe(viewerId, me));
}

/**
 * Current keys for `ids`, minus any we haven't accepted a change for. Offline,
 * falls back to the keys already pinned. For one-off writes; chat screens stay
 * live through useChatKeys.
 */
async function trustedKeysFor(
  viewerId: string,
  ids: string[]
): Promise<Record<string, Uint8Array>> {
  await loadIdentity(viewerId);
  const directory: Record<string, Uint8Array | null> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const key = (await getDoc(doc(db, 'publicKeys', id))).data()?.key;
        directory[id] = key instanceof Bytes ? key.toUint8Array() : null;
        if (key instanceof Bytes) isTrustedKey(id, key.toUint8Array());
      } catch {
        // Offline: leave it undefined so resolveKeys uses the pinned key.
      }
    })
  );
  return resolveKeys(ids, directory).recipients;
}

async function friendIdsOf(userId: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'friends'));
  return snap.docs.map((d) => d.id);
}

async function sealValue(
  value: unknown,
  scope: string,
  senderId: string,
  recipients: Record<string, Uint8Array>
): Promise<WireEnvelope> {
  const me = await loadIdentity(senderId);
  return toWire(
    seal(JSON.stringify(value), scope, senderId, me, {
      ...recipients,
      [senderId]: me.publicKey,
    })
  );
}

// Null unless it decrypts AND really came from `ownerId`: a stranger's key
// claiming to be a friend must not move their pin on the map. The result still
// comes from another user's device, so callers check the fields they use.
function openValue<T>(
  raw: unknown,
  scope: string,
  ownerId: string,
  viewerId: string,
  me: KeyPair | null
): T | null {
  const opened = openField(raw, viewerId, me, scope);
  if (!opened || opened.senderId !== ownerId) return null;
  if (!isFromClaimedSender(opened, ownerId, viewerId, me)) return null;
  try {
    return JSON.parse(opened.text) as T;
  } catch {
    return null;
  }
}

/** Publishes this device's key so others can encrypt to it. Last device wins. */
export async function publishPublicKey(userId: string): Promise<void> {
  const me = await loadIdentity(userId);
  await setDoc(doc(db, 'publicKeys', userId), {
    key: Bytes.fromUint8Array(me.publicKey),
  });
}

/** null = the server confirms there is no key. Nothing yet = still unknown. */
export function onPublicKey(
  viewerId: string,
  userId: string,
  callback: (key: Uint8Array | null) => void
): Unsubscribe {
  return withIdentity(viewerId, () =>
    onSnapshot(
      doc(db, 'publicKeys', userId),
      (snap) => {
        const key = snap.data()?.key;
        if (key instanceof Bytes) callback(key.toUint8Array());
        else if (!snap.metadata.fromCache) callback(null);
      },
      onSnapshotError('onPublicKey')
    )
  );
}

// ─── User Profile ────────────────────────────────────

export function userRef(userId: string): DocumentReference {
  return doc(db, 'users', userId);
}

export function onUserProfile(
  userId: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  return withViewer((viewerId, me) =>
    onSnapshot(
      userRef(userId),
      (snap) => {
        if (!snap.exists()) return callback(null);
        const signal = openValue<SealedSignal>(
          snap.data().currentSignal,
          `signal:${userId}`,
          userId,
          viewerId,
          me
        );
        callback({
          id: snap.id,
          ...snap.data(),
          currentSignal:
            signal && typeof signal.expiresAt === 'number'
              ? {
                  emoji: String(signal.emoji),
                  text: String(signal.text),
                  expiresAt: Timestamp.fromMillis(signal.expiresAt),
                }
              : null,
        } as UserProfile);
      },
      onSnapshotError('onUserProfile')
    )
  );
}

// ─── Signals ─────────────────────────────────────────

type SealedSignal = { emoji: string; text: string; expiresAt: number };

/**
 * Broadcast a status signal to all friends. users/{uid} can be read by any
 * signed-in user, so it's sealed to the friends you have right now. Expiry is
 * client-checked everywhere it renders (HUD, marker badges, projection).
 */
export async function setCurrentSignal(
  userId: string,
  signal: { emoji: string; text: string; expiresAt: Date }
): Promise<void> {
  const recipients = await trustedKeysFor(userId, await friendIdsOf(userId));
  const sealed: SealedSignal = {
    emoji: signal.emoji,
    text: signal.text,
    expiresAt: signal.expiresAt.getTime(),
  };
  await updateDoc(userRef(userId), {
    currentSignal: await sealValue(sealed, `signal:${userId}`, userId, recipients),
  });
}

export async function clearCurrentSignal(userId: string): Promise<void> {
  await updateDoc(userRef(userId), { currentSignal: null });
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
    requestId,
  });

  const theirFriendRef = doc(db, 'users', theirUserId, 'friends', myUserId);
  batch.set(theirFriendRef, {
    status: 'ACTIVE',
    since: serverTimestamp(),
    nickname: null,
    requestId,
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
  return withViewer((viewerId, me) =>
    onSnapshot(
      doc(db, 'locations', userId),
      (snap) => {
        if (!snap.exists()) return callback(null);
        const data = snap.data();
        // Automatic server deletion needs a paid plan, so enforce the 24-hour
        // limit here: an app closed inside a spot leaves a record behind.
        if (data.expireAt && data.expireAt.toMillis() < Date.now()) return callback(null);
        const position = openValue<SealedLocation>(
          data.envelope,
          `location:${userId}`,
          userId,
          viewerId,
          me
        );
        if (typeof position?.lat !== 'number' || typeof position.lng !== 'number') {
          return callback(null);
        }
        callback({
          ...position,
          userId,
          updatedAt: data.updatedAt,
          expireAt: data.expireAt,
        });
      },
      onSnapshotError('onLocation')
    )
  );
}

type SealedLocation = Omit<LocationPresence, 'userId' | 'updatedAt' | 'expireAt'>;

/**
 * `recipients`: the friends who may see this position. The server only learns
 * that you're inside one of your spots (the doc exists) and when, not where.
 */
export async function updateLocation(
  userId: string,
  data: SealedLocation,
  recipients: Record<string, Uint8Array>
): Promise<void> {
  await setDoc(doc(db, 'locations', userId), {
    envelope: await sealValue(data, `location:${userId}`, userId, recipients),
    updatedAt: serverTimestamp(),
    // Readers ignore the doc after this. A Firestore TTL policy on this field
    // would also delete it, once the project is on a paid plan. Client clock is
    // fine at day granularity.
    expireAt: Timestamp.fromMillis(Date.now() + LOCATION_TTL_MS),
  });
}

export async function deleteLocation(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'locations', userId));
}

// ─── User Spots ──────────────────────────────────────

// Your spots are where you live and work, so they're sealed to you alone.
// Cost: a new phone (new key) starts with no spots. Docs it can't read stay put
// because another of your devices might still hold the key.
type SealedSpot = Omit<UserSpot, 'id' | 'location'> & {
  location: { latitude: number; longitude: number };
};

function sealSpot(userId: string, spotId: string, spot: Omit<UserSpot, 'id'>) {
  const sealed: SealedSpot = {
    ...spot,
    location: { latitude: spot.location.latitude, longitude: spot.location.longitude },
  };
  return sealValue(sealed, `spot:${userId}:${spotId}`, userId, {});
}

function openSpot(
  id: string,
  data: DocumentData,
  userId: string,
  me: KeyPair | null
): UserSpot | null {
  const spot = openValue<SealedSpot>(data.envelope, `spot:${userId}:${id}`, userId, userId, me);
  if (!spot?.location) return null;
  return {
    ...spot,
    id,
    location: new GeoPoint(spot.location.latitude, spot.location.longitude),
  };
}

export function onUserSpots(
  userId: string,
  callback: (spots: UserSpot[]) => void
): Unsubscribe {
  const spotsCol = collection(db, 'users', userId, 'spots');
  return withIdentity(userId, (me) =>
    onSnapshot(
      spotsCol,
      (snap) => {
        callback(
          snap.docs
            .map((d) => openSpot(d.id, d.data(), userId, me))
            .filter((spot): spot is UserSpot => spot !== null)
        );
      },
      onSnapshotError('onUserSpots')
    )
  );
}

export async function createUserSpot(
  userId: string,
  spot: Omit<UserSpot, 'id'>
): Promise<string> {
  const spotsCol = collection(db, 'users', userId, 'spots');
  const spotDoc = doc(spotsCol);
  await setDoc(spotDoc, { envelope: await sealSpot(userId, spotDoc.id, spot) });
  return spotDoc.id;
}

export async function updateUserSpot(
  userId: string,
  spotId: string,
  data: Partial<Omit<UserSpot, 'id'>>
): Promise<void> {
  const ref = doc(db, 'users', userId, 'spots', spotId);
  const me = await loadIdentity(userId);
  const current = openSpot(spotId, (await getDoc(ref)).data() ?? {}, userId, me);
  if (!current) throw new Error('This spot was saved on another device and cannot be edited here.');
  const { id: _id, ...fields } = current;
  await setDoc(ref, { envelope: await sealSpot(userId, spotId, { ...fields, ...data }) });
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
  await updateUserSpot(userId, spotId, { isActive });
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
  return withIdentity(userId, (me) => {
    let docs: QueryDocumentSnapshot[] = [];
    const emit = () => {
      const chats = docs.map((d) => decodeChat(d.id, d.data(), userId, me));
      // Sort client-side to avoid a composite index on (memberIds, lastMessageAt).
      chats.sort((a, b) => {
        const aT = a.lastMessageAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
        const bT = b.lastMessageAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
        return bT - aT;
      });
      callback(chats);
    };
    const stopTrust = onTrustChange(emit);
    const stopSnapshot = onSnapshot(
      q,
      (snap) => {
        docs = snap.docs;
        emit();
      },
      onSnapshotError('onChats')
    );
    return () => {
      stopTrust();
      stopSnapshot();
    };
  });
}

export function onChatSummary(
  chatId: string,
  viewerId: string,
  callback: (chat: ChatSummary | null) => void
): Unsubscribe {
  return withIdentity(viewerId, (me) =>
    onSnapshot(
      doc(db, 'chats', chatId),
      (snap) => {
        if (!snap.exists()) return callback(null);
        callback(decodeChat(snap.id, snap.data(), viewerId, me));
      },
      onSnapshotError('onChatSummary')
    )
  );
}

export function onMessages(
  chatId: string,
  viewerId: string,
  callback: (messages: Message[]) => void,
  max = 100
): Unsubscribe {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  return withIdentity(viewerId, (me) => {
    let docs: QueryDocumentSnapshot[] = [];
    const emit = () =>
      callback(docs.map((d) => decodeMessage(d, chatId, viewerId, me)));
    // Accepting a changed key turns that person's messages from unverified to verified.
    const stopTrust = onTrustChange(emit);
    const stopSnapshot = onSnapshot(
      q,
      (snap) => {
        docs = snap.docs;
        emit();
      },
      onSnapshotError('onMessages')
    );
    return () => {
      stopTrust();
      stopSnapshot();
    };
  });
}

/**
 * Encrypts to `recipients` (from useChatKeys) plus the sender, then writes the
 * message and the list preview together so they can't disagree. The preview is
 * the same envelope, so it needs no extra encryption.
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  content: string,
  recipients: Record<string, Uint8Array>
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;

  const me = await loadIdentity(senderId);
  const envelope = toWire(
    seal(trimmed, `chat:${chatId}`, senderId, me, {
      ...recipients,
      [senderId]: me.publicKey,
    })
  );
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'chats', chatId, 'messages')), {
    senderId,
    envelope,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, 'chats', chatId), {
    lastMessage: envelope,
    lastMessageAt: serverTimestamp(),
  });
  await batch.commit();
}

// ─── Group Broadcasts ────────────────────────────────
// Visibility is members + invitees only (rules-enforced), and what, where and
// how big are sealed to them. Expiry stays readable so the server can delete
// old gatherings, and is checked client-side too, same as signals.

type SealedBroadcast = {
  emoji: string;
  text: string;
  latitude: number;
  longitude: number;
  radius: number;
};

function decodeBroadcasts(
  docs: QueryDocumentSnapshot[],
  viewerId: string,
  me: KeyPair | null
): Broadcast[] {
  const broadcasts: Broadcast[] = [];
  for (const d of docs) {
    const data = d.data();
    const sealed = openValue<SealedBroadcast>(
      data.envelope,
      `broadcast:${d.id}`,
      data.createdBy,
      viewerId,
      me
    );
    if (typeof sealed?.latitude !== 'number' || typeof sealed.longitude !== 'number') continue;
    const { latitude, longitude, ...rest } = sealed;
    const { envelope: _envelope, ...plain } = data;
    broadcasts.push({
      ...plain,
      ...rest,
      id: d.id,
      location: new GeoPoint(latitude, longitude),
    } as Broadcast);
  }
  return broadcasts;
}

function onBroadcastQuery(
  q: Query<DocumentData>,
  label: string,
  callback: (broadcasts: Broadcast[]) => void
): Unsubscribe {
  return withViewer((viewerId, me) =>
    onSnapshot(
      q,
      (snap) => {
        callback(decodeBroadcasts(snap.docs, viewerId, me));
      },
      onSnapshotError(label)
    )
  );
}

export function onMyBroadcasts(
  userId: string,
  callback: (broadcasts: Broadcast[]) => void
): Unsubscribe {
  return onBroadcastQuery(
    query(collection(db, 'broadcasts'), where('memberIds', 'array-contains', userId)),
    'onMyBroadcasts',
    callback
  );
}

export function onBroadcastInvites(
  userId: string,
  callback: (broadcasts: Broadcast[]) => void
): Unsubscribe {
  return onBroadcastQuery(
    query(collection(db, 'broadcasts'), where('invitedIds', 'array-contains', userId)),
    'onBroadcastInvites',
    callback
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
  return onBroadcastQuery(
    query(
      collection(db, 'broadcasts'),
      where('createdBy', '==', friendId),
      where('visibility', '==', 'FRIENDS')
    ),
    'onFriendSoloBroadcasts',
    callback
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
  const readers = visibility === 'FRIENDS' ? await friendIdsOf(createdBy) : invitedIds;
  const recipients = await trustedKeysFor(createdBy, readers);
  const ref = doc(collection(db, 'broadcasts'));
  const sealed: SealedBroadcast = { emoji, text, ...location, radius };
  await setDoc(ref, {
    createdBy,
    envelope: await sealValue(sealed, `broadcast:${ref.id}`, createdBy, recipients),
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
}): Promise<string> {
  const { memberIds, createdBy, name } = params;
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

  // The name is encrypted too. Membership never grows after creation, so these
  // are all the readers it will ever need; anyone without a key yet sees "Group".
  const me = await loadIdentity(createdBy);
  const recipients = await trustedKeysFor(createdBy, sorted);
  recipients[createdBy] = me.publicKey;

  const ref = doc(collection(db, 'chats'));
  await setDoc(ref, {
    name: toWire(seal(name, `chat-name:${ref.id}`, createdBy, me, recipients)),
    avatarUrl: null,
    type: 'GROUP',
    memberIds: sorted,
    createdBy,
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageAt: null,
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

  try {
    await setDoc(ref, {
      name: null,
      avatarUrl: null,
      type: 'DM',
      memberIds: sorted,
      createdBy: viewerId,
      createdAt: serverTimestamp(),
      lastMessage: null,
      lastMessageAt: null,
    });
  } catch (e) {
    // Both people opening the chat at once: the second write is denied as an
    // update. That's fine as long as the chat now exists.
    if (!(await getDoc(ref)).exists()) throw e;
  }
  return chatId;
}
