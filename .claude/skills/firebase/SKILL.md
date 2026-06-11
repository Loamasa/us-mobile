---
name: firebase
description: Firebase development patterns for Auth, Firestore, and real-time listeners in this Expo project. Use when implementing authentication flows, Firestore data modeling, security rules, queries, onSnapshot listeners, or Firebase emulator setup. Covers the project's specific data architecture (locations, friends, handles, spots, signals).
---

# Firebase (Auth + Firestore)

## Project Data Architecture

```
locations/{userId}          # geohash + coords + timestamp (top-level for spatial queries)
users/{uid}                 # profile, currentSignal, settings
users/{uid}/friends/{fid}   # friend relationships
users/{uid}/spots/{spotId}  # saved spots
handles/{handle}            # handle-to-uid lookup for uniqueness
```

## Auth Patterns

### Auth state listener (root of app)

```tsx
import { onAuthStateChanged, User } from 'firebase/auth';

function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
}
```

### Sign up with handle reservation

```tsx
async function signUp(email: string, password: string, handle: string) {
  // 1. Check handle availability
  const handleDoc = await getDoc(doc(db, 'handles', handle.toLowerCase()));
  if (handleDoc.exists()) throw new Error('Handle taken');

  // 2. Create auth user
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // 3. Batch write: user profile + handle reservation
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', user.uid), {
    displayName: handle, handle: handle.toLowerCase(),
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'handles', handle.toLowerCase()), { uid: user.uid });
  await batch.commit();
}
```

## Firestore Rules

### Always use onSnapshot, never one-shot get()

```tsx
// Correct
useEffect(() => {
  const unsub = onSnapshot(
    doc(db, 'users', uid),
    (snap) => setProfile(snap.data() as UserProfile),
    (err) => console.error('Profile listener error:', err)
  );
  return unsub;
}, [uid]);

// Wrong: getDoc(doc(db, 'users', uid))
```

### Query with where + orderBy

```tsx
const q = query(
  collection(db, 'users', uid, 'friends'),
  where('status', '==', 'accepted'),
  orderBy('addedAt', 'desc'),
  limit(50)
);

const unsub = onSnapshot(q, (snap) => {
  const friends = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  setFriends(friends);
});
```

### Batch writes for atomicity

```tsx
const batch = writeBatch(db);
batch.update(doc(db, 'users', uid, 'friends', friendId), { status: 'accepted' });
batch.update(doc(db, 'users', friendId, 'friends', uid), { status: 'accepted' });
await batch.commit();
```

## Anti-Patterns

- One-shot `getDoc` for data that changes -- always use `onSnapshot`
- Missing `unsubscribe` in useEffect cleanup -- causes memory leaks
- N+1 queries (loading friends then fetching each profile) -- denormalize
- Unbounded queries without `limit()` -- always limit collection reads
- `serverTimestamp()` in reads -- it returns null until written; handle it

## Emulator Setup

```bash
firebase emulators:start --project demo-us-app
```

Ports (per `firebase.json`): auth **9099**, firestore **8088**, UI 4000.

Connect in code (already wired in `src/config/firebase.ts` via `getEmulatorHost()` — don't duplicate):
```tsx
if (__DEV__) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8088);
}
```

## Detailed Reference

For security rules patterns, see `references/security-rules.md`.
For data modeling decisions and denormalization, see `references/data-modeling.md`.
