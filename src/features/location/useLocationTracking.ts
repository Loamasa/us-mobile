import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import {
  updateLocation,
  deleteLocation,
  onFriends,
  onUserProfile,
  onUserSpots,
} from '@/lib/firestore';
import { toHex } from '@/features/e2ee/envelope';
import { useChatKeys } from '@/features/e2ee/useChatKeys';
import { haversineDistance } from '@/utils/distance';
import { isSpotActiveNow } from '@/features/spots/spotSchedule';
import { MAP_DEFAULTS } from '@/config/constants';
import type { UserSpot } from '@/types';

function findContainingSpot(
  lat: number,
  lng: number,
  spots: UserSpot[]
): UserSpot | null {
  for (const spot of spots) {
    if (!isSpotActiveNow(spot)) continue;
    const dist = haversineDistance(
      lat,
      lng,
      spot.location.latitude,
      spot.location.longitude
    );
    if (dist <= spot.radius) return spot;
  }
  return null;
}

/**
 * Watches the user's position and writes it to Firestore ONLY when the
 * user is inside one of their active spots. Outside any spot ("in transit"),
 * the location doc is deleted — friends see nothing.
 *
 * Respects ghost mode (globalLocationSharing): when off, tracking halts and
 * the location doc is removed. Called once from the map screen (the initial
 * tab, which stays mounted for the life of the tab navigator).
 */
export function useLocationTracking() {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const isTrackingRef = useRef(false);
  const isStartingRef = useRef(false);
  const reevaluateRef = useRef<() => void>(() => {});
  const spotsRef = useRef<UserSpot[]>([]);
  // Starts true: a previous session may have died while a location doc was
  // published (app killed inside a spot). The first out-of-spot fix after a
  // cold start must delete that stale doc; deleting a missing doc is a no-op.
  const lastPublishedRef = useRef<boolean>(true);
  const [userId, setUserId] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );

  const [friendIds, setFriendIds] = useState<string[]>([]);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
  }, []);

  useEffect(() => {
    setFriendIds([]);
    if (!userId) return;
    return onFriends(userId, (friends) => setFriendIds(friends.map((f) => f.userId)));
  }, [userId]);

  // Positions are sealed to current friends only. When that set changes (new
  // friend, removed friend, new key), re-seal right away instead of waiting
  // for the next tick.
  const { recipients } = useChatKeys(friendIds, userId);
  const recipientsRef = useRef(recipients);
  recipientsRef.current = recipients;
  const recipientsKey = Object.entries(recipients)
    .map(([id, key]) => `${id}:${toHex(key)}`)
    .sort()
    .join('|');
  useEffect(() => {
    reevaluateRef.current();
  }, [recipientsKey]);

  useEffect(() => {
    if (!userId) return;

    let disposed = false;
    let profileUnsubscribe: (() => void) | null = null;
    let spotsUnsubscribe: (() => void) | null = null;

    const publishIfInSpot = async (latitude: number, longitude: number) => {
      if (!isTrackingRef.current) return;
      const spot = findContainingSpot(latitude, longitude, spotsRef.current);

      try {
        if (spot) {
          await updateLocation(
            userId,
            {
              lat: latitude,
              lng: longitude,
              spot: {
                id: spot.id,
                name: spot.name,
                emoji: spot.emoji,
                center: {
                  latitude: spot.location.latitude,
                  longitude: spot.location.longitude,
                },
                radius: spot.radius,
              },
            },
            recipientsRef.current
          );
          lastPublishedRef.current = true;
        } else if (lastPublishedRef.current) {
          await deleteLocation(userId);
          lastPublishedRef.current = false;
        }
      } catch (e) {
        console.warn('[location] publish failed:', e);
      }
    };

    const startTracking = async () => {
      // Profile snapshots can arrive while the permission dialog is open; a
      // second watcher here would never be removed.
      if (subscriptionRef.current || isStartingRef.current) return;
      isStartingRef.current = true;
      isTrackingRef.current = true;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || disposed || !isTrackingRef.current) return;

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: MAP_DEFAULTS.locationDistanceInterval,
          },
          (loc) => publishIfInSpot(loc.coords.latitude, loc.coords.longitude)
        );
        // Ghost mode or sign-out happened while it was starting.
        if (disposed || !isTrackingRef.current) subscription.remove();
        else subscriptionRef.current = subscription;
      } finally {
        isStartingRef.current = false;
      }
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

    const reevaluateAtLastPosition = async () => {
      if (!subscriptionRef.current || !isTrackingRef.current) return;
      const current = await Location.getLastKnownPositionAsync();
      if (current) {
        publishIfInSpot(current.coords.latitude, current.coords.longitude);
      }
    };

    reevaluateRef.current = reevaluateAtLastPosition;

    spotsUnsubscribe = onUserSpots(userId, (spots) => {
      spotsRef.current = spots;
      // Re-evaluate publish state when spots change (added/removed/toggled)
      reevaluateAtLastPosition();
    });

    // Spot schedules open/close with the clock, not with movement — re-check
    // every minute so a window expiring at e.g. 17:00 unpublishes the user
    // even when they haven't moved.
    const scheduleTick = setInterval(reevaluateAtLastPosition, 60_000);

    return () => {
      disposed = true;
      reevaluateRef.current = () => {};
      clearInterval(scheduleTick);
      profileUnsubscribe?.();
      spotsUnsubscribe?.();
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      isTrackingRef.current = false;
    };
  }, [userId]);
}
