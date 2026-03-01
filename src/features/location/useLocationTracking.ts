import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { GeoPoint } from 'firebase/firestore';
import { auth } from '@/config/firebase';
import { updateLocation, deleteLocation, onUserProfile } from '@/lib/firestore';
import { encodeGeohash } from '@/lib/geohash';
import { MAP_DEFAULTS } from '@/config/constants';

/**
 * Watches the user's position and writes it to Firestore.
 * Respects ghost mode (globalLocationSharing setting).
 * Call this once in the root tab layout.
 */
export function useLocationTracking() {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const isTrackingRef = useRef(false);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    let profileUnsubscribe: (() => void) | null = null;

    const startTracking = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      if (subscriptionRef.current) return; // Already tracking
      isTrackingRef.current = true;

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: MAP_DEFAULTS.locationDistanceInterval,
        },
        async (loc) => {
          if (!isTrackingRef.current) return;

          const { latitude, longitude } = loc.coords;
          const geohash = encodeGeohash(latitude, longitude);

          await updateLocation(userId, {
            geohash,
            geopoint: new GeoPoint(latitude, longitude),
            lat: latitude,
            lng: longitude,
            precision: 'EXACT',
          });
        }
      );
    };

    const stopTracking = async () => {
      isTrackingRef.current = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      await deleteLocation(userId);
    };

    // Listen to profile changes to react to ghost mode toggle
    profileUnsubscribe = onUserProfile(userId, (profile) => {
      if (!profile) return;

      if (profile.settings.globalLocationSharing) {
        startTracking();
      } else {
        stopTracking();
      }
    });

    return () => {
      profileUnsubscribe?.();
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);
}
