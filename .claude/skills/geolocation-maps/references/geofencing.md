# Geofencing + Proximity Alerts

## expo-location Region Monitoring

```tsx
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const GEOFENCE_TASK = 'GEOFENCE_TASK';

// Define task (top-level, outside components)
TaskManager.defineTask(GEOFENCE_TASK, ({ data, error }) => {
  if (error) return;
  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  if (eventType === Location.GeofencingEventType.Enter) {
    sendProximityNotification(region.identifier);  // friend UID or spot ID
  }
});

// Start monitoring a region
async function watchRegion(id: string, latitude: number, longitude: number, radiusM = 200) {
  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    { identifier: id, latitude, longitude, radius: radiusM, notifyOnEnter: true, notifyOnExit: false },
  ]);
}

// Stop monitoring
async function stopWatchingRegions() {
  await Location.stopGeofencingAsync(GEOFENCE_TASK);
}
```

## Friend Proximity Alerts

Pattern: periodically re-register geofences around friends' last-known locations.

```tsx
function useProximityAlerts(friends: FriendLocation[]) {
  useEffect(() => {
    if (friends.length === 0) return;

    const regions = friends.map((f) => ({
      identifier: f.uid,
      latitude: f.latitude,
      longitude: f.longitude,
      radius: 200,
      notifyOnEnter: true,
      notifyOnExit: false,
    }));

    Location.startGeofencingAsync(GEOFENCE_TASK, regions);

    return () => { Location.stopGeofencingAsync(GEOFENCE_TASK); };
  }, [friends]);  // re-register when friend locations change
}
```

## Limits

- iOS: max 20 monitored regions simultaneously
- Android: max 100 geofences
- Minimum radius: ~100m (smaller is unreliable)
- Battery impact: low (OS handles monitoring natively)
- Prioritize closest/most-interacted friends if exceeding limits
