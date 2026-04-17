import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { onFriends, onLocation, getUserProfile } from '@/lib/firestore';
import type { Friend, LocationPresence, UserProfile } from '@/types';

interface FriendLocationData {
  location: LocationPresence;
  profile: UserProfile;
}

/**
 * Subscribes to real-time locations of all friends.
 * Returns a map of userId -> { location, profile }.
 * Re-subscribes when the signed-in user changes (account switching).
 */
export function useFriendLocations() {
  const [userId, setUserId] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );
  const [friendLocations, setFriendLocations] = useState<
    Record<string, FriendLocationData>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
  }, []);

  useEffect(() => {
    setFriendLocations({});
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const locationUnsubscribes: (() => void)[] = [];
    let friendsUnsubscribe: (() => void) | null = null;

    friendsUnsubscribe = onFriends(userId, async (friends: Friend[]) => {
      // Clean up old location listeners
      locationUnsubscribes.forEach((unsub) => unsub());
      locationUnsubscribes.length = 0;

      // Fetch profiles for all friends
      const profiles: Record<string, UserProfile> = {};
      await Promise.all(
        friends.map(async (f) => {
          const profile = await getUserProfile(f.userId);
          if (profile) profiles[f.userId] = profile;
        })
      );

      // Subscribe to each friend's location
      for (const friend of friends) {
        const unsub = onLocation(friend.userId, (location) => {
          setFriendLocations((prev) => {
            if (!location) {
              // Friend went ghost — remove them
              const next = { ...prev };
              delete next[friend.userId];
              return next;
            }

            const profile = profiles[friend.userId];
            if (!profile) return prev;

            return {
              ...prev,
              [friend.userId]: { location, profile },
            };
          });
        });
        locationUnsubscribes.push(unsub);
      }

      setLoading(false);
    });

    return () => {
      friendsUnsubscribe?.();
      locationUnsubscribes.forEach((unsub) => unsub());
    };
  }, [userId]);

  return { friendLocations, loading };
}
