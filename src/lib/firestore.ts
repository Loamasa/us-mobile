import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserProfile, Friend, FriendRequest, LocationPresence, UserSpot } from '@/types';

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
  return onSnapshot(userRef(userId), (snap) => {
    if (!snap.exists()) return callback(null);
    callback({ id: snap.id, ...snap.data() } as UserProfile);
  });
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
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ userId: d.id, ...d.data() } as Friend)));
  });
}

export function onFriendRequests(
  userId: string,
  callback: (requests: FriendRequest[]) => void
): Unsubscribe {
  const reqCol = collection(db, 'users', userId, 'friendRequests');
  const q = query(reqCol, where('status', '==', 'PENDING'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest)));
  });
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

// ─── Location ────────────────────────────────────────

export function onLocation(
  userId: string,
  callback: (location: LocationPresence | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'locations', userId), (snap) => {
    if (!snap.exists()) return callback(null);
    callback({ userId: snap.id, ...snap.data() } as LocationPresence);
  });
}

export async function updateLocation(
  userId: string,
  data: Omit<LocationPresence, 'userId' | 'updatedAt'>
): Promise<void> {
  await setDoc(doc(db, 'locations', userId), {
    ...data,
    updatedAt: serverTimestamp(),
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
  return onSnapshot(spotsCol, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserSpot)));
  });
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
