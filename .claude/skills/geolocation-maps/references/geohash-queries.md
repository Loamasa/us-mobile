# Geohash Spatial Queries

## How It Works

Geohashes encode lat/lng into a string where shared prefixes = spatial proximity.
Firestore can do range queries on strings, enabling "nearby" queries.

## Writing Location with Geohash

```tsx
import { geohashForLocation } from 'geofire-common';

async function writeLocation(uid: string, coords: { latitude: number; longitude: number }) {
  const geohash = geohashForLocation([coords.latitude, coords.longitude]);
  await setDoc(doc(db, 'locations', uid), {
    latitude: coords.latitude,
    longitude: coords.longitude,
    geohash,
    timestamp: serverTimestamp(),
    uid,
  });
}
```

## Querying Nearby Locations

```tsx
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

async function queryNearby(center: [number, number], radiusKm: number): Promise<FriendLocation[]> {
  const bounds = geohashQueryBounds(center, radiusKm * 1000);

  const snapshots = await Promise.all(
    bounds.map(([start, end]) =>
      getDocs(
        query(
          collection(db, 'locations'),
          orderBy('geohash'),
          startAt(start),
          endAt(end)
        )
      )
    )
  );

  // Filter false positives (geohash bounds are rectangular, not circular)
  return snapshots
    .flatMap((snap) => snap.docs.map((d) => d.data() as FriendLocation))
    .filter((loc) => {
      const dist = distanceBetween([loc.latitude, loc.longitude], center);
      return dist <= radiusKm;
    });
}
```

## Real-Time Nearby (onSnapshot variant)

For live updates, use `onSnapshot` on each bound range and merge results:

```tsx
function watchNearby(center: [number, number], radiusKm: number, callback: (locs: FriendLocation[]) => void) {
  const bounds = geohashQueryBounds(center, radiusKm * 1000);
  const results = new Map<string, FriendLocation>();

  const unsubs = bounds.map(([start, end]) =>
    onSnapshot(
      query(collection(db, 'locations'), orderBy('geohash'), startAt(start), endAt(end)),
      (snap) => {
        snap.docs.forEach((d) => {
          const loc = d.data() as FriendLocation;
          const dist = distanceBetween([loc.latitude, loc.longitude], center);
          if (dist <= radiusKm) results.set(loc.uid, loc);
          else results.delete(loc.uid);
        });
        callback(Array.from(results.values()));
      }
    )
  );

  return () => unsubs.forEach((u) => u());
}
```

## Precision Guide

| Geohash length | Cell size  | Use case            |
|----------------|------------|---------------------|
| 4              | ~39km      | City-level          |
| 5              | ~5km       | Neighborhood        |
| 6              | ~1.2km     | Block-level         |
| 7              | ~150m      | Street-level        |
| 8              | ~38m       | Building-level      |

For friend locations, geohash length 7-8 gives useful clustering granularity.
