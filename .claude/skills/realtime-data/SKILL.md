---
name: realtime-data
description: Real-time data patterns for Firestore subscriptions, presence detection, live location sharing, signals with TTL, and optimistic UI. Use when implementing onSnapshot listener management, online/offline presence, throttled location updates, reconnection handling, or any feature requiring live data synchronization between users.
---

# Real-Time Data Patterns

## Subscription Management

### Hook pattern with cleanup

```tsx
function useRealtimeDoc<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, path),
      (snap) => setData(snap.exists() ? (snap.data() as T) : null),
      (err) => setError(err)
    );
    return unsub;  // always cleanup
  }, [path]);

  return { data, error };
}
```

### Collection listener with transform

```tsx
function useRealtimeCollection<T>(collectionPath: string, constraints: QueryConstraint[] = []) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    const q = query(collection(db, collectionPath), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
    });
    return unsub;
  }, [collectionPath]);  // re-subscribe if path changes

  return items;
}
```

### Error recovery

```tsx
onSnapshot(ref, { includeMetadataChanges: true },
  (snap) => {
    const source = snap.metadata.fromCache ? 'cache' : 'server';
    // UI can show "offline" indicator when fromCache
    setData({ ...snap.data(), _source: source });
  },
  (err) => {
    if (err.code === 'permission-denied') {
      // User logged out or lost access
      router.replace('/(auth)/sign-in');
    }
    // Other errors: Firestore SDK auto-retries
  }
);
```

## Presence System

```tsx
// Track user online/offline in Firestore
function usePresence(uid: string) {
  useEffect(() => {
    const userRef = doc(db, 'users', uid);

    // Mark online
    updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() });

    // Mark offline on app state change
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() });
      } else {
        updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() });
      }
    });

    return () => {
      updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() });
      sub.remove();
    };
  }, [uid]);
}
```

## Throttled Location Updates

```tsx
function useThrottledLocationWriter(uid: string, intervalMs = 15000) {
  const lastWrite = useRef(0);

  const writeLocation = useCallback((coords: { latitude: number; longitude: number }) => {
    const now = Date.now();
    if (now - lastWrite.current < intervalMs) return;
    lastWrite.current = now;

    const geohash = geohashForLocation([coords.latitude, coords.longitude]);
    setDoc(doc(db, 'locations', uid), {
      ...coords, geohash, timestamp: serverTimestamp(), uid,
    });
  }, [uid, intervalMs]);

  return writeLocation;
}
```

## Signals with TTL

```tsx
// Write signal with expiration
async function sendSignal(uid: string, emoji: string, label: string, durationMs = 3600000) {
  await updateDoc(doc(db, 'users', uid), {
    currentSignal: {
      emoji, label,
      expiresAt: Timestamp.fromMillis(Date.now() + durationMs),
    },
  });
}

// Client-side expiry check
function isSignalActive(signal: { expiresAt: Timestamp } | null): boolean {
  if (!signal) return false;
  return signal.expiresAt.toMillis() > Date.now();
}
```

## Optimistic UI

```tsx
async function sendFriendRequest(uid: string, friendId: string) {
  // 1. Optimistically update local state
  setFriends((prev) => [...prev, { uid: friendId, status: 'pending' }]);

  try {
    // 2. Write to Firestore
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'friends', friendId), {
      status: 'pending', addedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', friendId, 'friends', uid), {
      status: 'incoming', addedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch {
    // 3. Rollback on failure
    setFriends((prev) => prev.filter((f) => f.uid !== friendId));
  }
}
```

## Key Principles

- Always `onSnapshot`, never `getDoc` for live data
- Always return cleanup (unsubscribe) from useEffect
- Throttle writes to Firestore (location: 15s, presence: on state change only)
- Check `metadata.fromCache` to show connectivity status
- Client-side TTL checks for signals -- no server-side cleanup needed
- Batch related writes for atomicity
