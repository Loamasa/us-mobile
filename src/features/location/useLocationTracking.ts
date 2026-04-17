import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { onAuthStateChanged } from 'firebase/auth';
import { GeoPoint } from 'firebase/firestore';
import { auth } from '@/config/firebase';
import {
  updateLocation,
  deleteLocation,
  onUserProfile,
  onUserSpots,
} from '@/lib/firestore';
import { encodeGeohash } from '@/lib/geohash';
import { haversineDistance } from '@/utils/distance';
import { MAP_DEFAULTS } from '@/config/constants';
import type { UserSpot } from '@/types';

function isInsideAnyActiveSpot(
  lat: number,
  lng: number,
  spots: UserSpot[]
): boolean {
  for (const spot of spots) {
    if (!spot.isActive) continue;
    const dist = haversineDistance(
      lat,
      lng,
      spot.location.latitude,
      spot.location.longitude
    );
    if (dist <= spot.radius) return true;
  }
  return false;
}

/**
 * Watches the user's position and writes it to Firestore ONLY when the
 * user is inside one of their active spots. Outside any spot ("in transit"),
 * the location doc is deleted — friends see nothing.
 *
 * Respects ghost mode (globalLocationSharing): when off, tracking halts and
 * the location doc is removed. Call once in the root tab layout.
 */
export function useLocationTracking() {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const isTrackingRef = useRef(false);
  const spotsRef = useRef<UserSpot[]>([]);
  const lastPublishedRef = useRef<boolean>(false);
  const [userId, setUserId] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;

    let profileUnsubscribe: (() => void) | null = null;
    let spotsUnsubscribe: (() => void) | null = null;

    const publishIfInSpot = async (latitude: number, longitude: number) => {
      if (!isTrackingRef.current) return;
      const inSpot = isInsideAnyActiveSpot(latitude, longitude, spotsRef.current);

      if (inSpot) {
        await updateLocation(userId, {
          geohash: encodeGeohash(latitude, longitude),
          geopoint: new GeoPoint(latitude, longitude),
          lat: latitude,
          lng: longitude,
          precision: 'EXACT',
        });
        lastPublishedRef.current = true;
      } else if (lastPublishedRef.current) {
        await deleteLocation(userId);
        lastPublishedRef.current = false;
      }
    };

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      if (subscriptionRef.current) return;
      isTrackingRef.current = true;

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: MAP_DEFAULTS.locationDistanceInterval,
        },
        (loc) => publishIfInSpot(loc.coords.latitude, loc.coords.longitude)
      );
    };

    const stopTracking = async () => {
      isTrackingRef.current = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      if (lastPublishedRef.current) {
        await deleteLocation(userId);
        lastPublishedRef.current = false;
      }
    };

    profileUnsubscribe = onUserProfile(userId, (profile) => {
      if (!profile) return;
      if (profile.settings.globalLocationSharing) {
        startTracking();
      } else {
        stopTracking();
      }
    });

    spotsUnsubscribe = onUserSpots(userId, async (spots) => {
      spotsRef.current = spots;
      // Re-evaluate publish state when spots change (added/removed/toggled)
      const last = subscriptionRef.current;
      if (!last || !isTrackingRef.current) return;
      const current = await Location.getLastKnownPositionAsync();
      if (current) {
        publishIfInSpot(current.coords.latitude, current.coords.longitude);
      }
    });

    return () => {
      profileUnsubscribe?.();
      spotsUnsubscribe?.();
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      isTrackingRef.current = false;
    };
  }, [userId]);
}
