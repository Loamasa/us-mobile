---
name: geolocation-maps
description: Geolocation and maps for this mobile-first Expo app. Use when implementing map rendering (react-native-maps), location tracking (expo-location), friend marker clustering (Haversine 100m), saved spots on map, geofencing/alerts, geohash spatial queries with Firestore, or battery-efficient background location. Mobile only -- no Leaflet/web maps.
---

# Geolocation + Maps (Mobile)

## Stack

- `react-native-maps` -- MapView, Markers, Callouts, clustering
- `expo-location` -- foreground/background tracking, geofencing
- Firestore `locations/{userId}` with geohash for spatial queries

## Map Setup

```tsx
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function FriendMap({ friends }: { friends: FriendLocation[] }) {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      className="flex-1"
      initialRegion={DEFAULT_REGION}
      showsUserLocation
      showsMyLocationButton={false}
      customMapStyle={DARK_MAP_STYLE}  // match void theme
    >
      {friends.map((f) => (
        <Marker key={f.uid} coordinate={{ latitude: f.latitude, longitude: f.longitude }}>
          <FriendAvatar user={f} />
        </Marker>
      ))}
    </MapView>
  );
}
```

## Location Tracking

### Foreground (active use)

```tsx
import * as Location from 'expo-location';

async function startForegroundTracking(onUpdate: (coords: Location.LocationObjectCoords) => void) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
    (loc) => onUpdate(loc.coords)
  );
}
// Cleanup: subscription.remove()
```

### Background (app minimized)

```tsx
import * as TaskManager from 'expo-task-manager';

const BG_LOCATION_TASK = 'BACKGROUND_LOCATION';

TaskManager.defineTask(BG_LOCATION_TASK, ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const latest = locations[locations.length - 1];
  // Write to Firestore (fire-and-forget)
  updateLocationDoc(latest.coords);
});

async function startBackgroundTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return;

  await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 100,          // meters before update
    deferredUpdatesInterval: 60000, // batch every 60s for battery
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'us-mobile',
      notificationBody: 'Sharing location with friends',
    },
  });
}
```

### Ghost Mode

```tsx
async function enableGhostMode(uid: string) {
  // 1. Stop background tracking
  await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
  // 2. Delete Firestore location doc
  await deleteDoc(doc(db, 'locations', uid));
  // 3. Update user settings
  await updateDoc(doc(db, 'users', uid), { globalLocationSharing: false });
}
```

## Client-Side Clustering

Haversine distance, 100m threshold per project convention.

```tsx
function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sin2Lat = Math.sin(dLat / 2) ** 2;
  const sin2Lon = Math.sin(dLon / 2) ** 2;
  const h = sin2Lat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sin2Lon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clusterLocations(locations: FriendLocation[], thresholdM = 100): Cluster[] {
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  for (const loc of locations) {
    if (assigned.has(loc.uid)) continue;
    const cluster: FriendLocation[] = [loc];
    assigned.add(loc.uid);

    for (const other of locations) {
      if (assigned.has(other.uid)) continue;
      if (haversineMeters(loc, other) <= thresholdM) {
        cluster.push(other);
        assigned.add(other.uid);
      }
    }
    clusters.push({
      coordinate: centroid(cluster),
      members: cluster,
    });
  }
  return clusters;
}
```

## Geohash Spatial Queries

See `references/geohash-queries.md` for Firestore geohash range query patterns.

## Geofencing

See `references/geofencing.md` for region monitoring and friend proximity alerts.

## Saved Spots

See `references/spots.md` for rendering user-saved spots as custom markers.
