import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { onFriends, onLocation, onUserProfile } from '@/lib/firestore';
import type { Friend, LocationPresence, UserProfile } from '@/types';

export interface FriendLocationData {
  location: LocationPresence;
  profile: UserProfile;
}

/**
 * Subscribes to real-time friend locations + profiles.
 * Returns a map of userId -> { location, profile }.
 *
 * A friend only appears once both their profile AND location doc exist.
 * Location docs are written only when the friend is inside an active spot
 * (see useLocationTracking), so the presence of a doc implies visibility.
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

    const perFriendUnsubs = new Map<string, () => void>();
    const perFriendState = new Map<string, Partial<FriendLocationData>>();

    const commit = (friendId: string) => {
      const state = perFriendState.get(friendId);
      setFriendLocations((prev) => {
        const next = { ...prev };
        if (!state?.location || !state.profile) {
          delete next[friendId];
          return next;
        }
        next[friendId] = {
          location: state.location,
          profile: state.profile,
        };
        return next;
      });
    };

    const subscribeFriend = (friendId: string) => {
      const unsubProfile = onUserProfile(friendId, (profile) => {
        const s = perFriendState.get(friendId) ?? {};
        s.profile = profile ?? undefined;
        perFriendState.set(friendId, s);
        commit(friendId);
      });
      const unsubLocation = onLocation(friendId, (location) => {
        const s = perFriendState.get(friendId) ?? {};
        s.location = location ?? undefined;
        perFriendState.set(friendId, s);
        commit(friendId);
      });
      perFriendUnsubs.set(friendId, () => {
        unsubProfile();
        unsubLocation();
      });
    };

    const friendsUnsubscribe = onFriends(userId, (friends: Friend[]) => {
      const incoming = new Set(friends.map((f) => f.userId));

      for (const [id, unsub] of perFriendUnsubs.entries()) {
        if (!incoming.has(id)) {
          unsub();
          perFriendUnsubs.delete(id);
          perFriendState.delete(id);
          setFriendLocations((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      }

      for (const id of incoming) {
        if (!perFriendUnsubs.has(id)) subscribeFriend(id);
      }

      setLoading(false);
    });

    return () => {
      friendsUnsubscribe();
      for (const unsub of perFriendUnsubs.values()) unsub();
      perFriendUnsubs.clear();
      perFriendState.clear();
    };
  }, [userId]);

  return { friendLocations, loading };
}
