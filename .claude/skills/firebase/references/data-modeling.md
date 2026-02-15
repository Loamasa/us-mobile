# Firestore Data Modeling

## Collection Design Decisions

### Locations as top-level collection
- Enables geohash range queries across all users
- Schema: `{ latitude, longitude, geohash, timestamp, uid }`
- Ghost mode: delete the doc entirely (no soft-delete)

### Friends as subcollection
- `users/{uid}/friends/{friendId}` avoids loading all friendships globally
- Denormalize friend displayName + photoURL for list rendering
- Mirror both sides: when A adds B, write to both subcollections

### Handles as top-level collection
- `handles/{handle}` maps to `{ uid }` for O(1) uniqueness check
- Handle is immutable after creation (no update/delete rules)
- Always lowercase before storing

## Denormalization Strategy

Duplicate frequently-read fields to avoid N+1:

```
users/{uid}/friends/{friendId} = {
  status: 'accepted',
  displayName: 'Alice',       // denormalized from users/{friendId}
  photoURL: '...',            // denormalized
  addedAt: Timestamp,
}
```

When source changes, update denormalized copies via Cloud Function or client batch.

## Signals

- Stored as `users/{uid}.currentSignal = { emoji, label, expiresAt }`
- Client-side expiry check: `if (signal.expiresAt.toMillis() < Date.now()) treat as null`
- No server-side TTL -- client ignores expired signals

## Offline Considerations

- Firestore SDK handles offline caching automatically
- `onSnapshot` fires with cached data first, then server data
- Writes queue offline and sync when reconnected
- Use `serverTimestamp()` for ordering -- resolves to actual time on sync
