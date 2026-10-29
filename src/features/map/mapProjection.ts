import { haversineDistance, calculateCentroid } from '../../utils/distance';
import { MAP_DEFAULTS } from '../../config/constants';
import { isLocationFresh } from '../presence/presence';
import type { MapEntity, FriendOnMap, LocationPresence, UserProfile } from '@/types';

export interface FriendLocationData {
  location: LocationPresence;
  profile: UserProfile;
}

/**
 * Projects friend locations into map entities (individual friends + clusters).
 * Shared by the map hook and regression checks.
 *
 * Algorithm:
 * 1. Partition into fresh and stale docs (isLocationFresh at `now`) — a
 *    frozen doc means the publisher's app is gone, not that the friend is
 *    still there, so stale friends never form or join clusters. This keeps
 *    the map's cluster universe identical to the chat surfaces', which have
 *    filtered stale docs since Wave 1.
 * 2. Find clusters among the FRESH: group friends within CLUSTER_RADIUS.
 * 3. Remaining fresh friends become individual markers; stale friends become
 *    individual markers flagged `stale` (rendered dimmed at last position).
 *
 * `now` is a minute-quantized timestamp (the map screen's clock tick) so
 * staleness flips re-project without any Firestore change.
 */
export function projectMapEntities(
  friendLocations: Record<string, FriendLocationData>,
  now: number = Date.now()
): MapEntity[] {
  const entities: MapEntity[] = [];
  const processed = new Set<string>();
  // Sorted ids keep anchor selection deterministic — chat surfaces
  // (src/features/presence/presence.ts) sort the same way so "together"
  // there always matches a rendered cluster here.
  const entries = Object.entries(friendLocations).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );

  if (entries.length === 0) return entities;

  const fresh = entries.filter(([, data]) => isLocationFresh(data.location, now));
  const stale = entries.filter(([, data]) => !isLocationFresh(data.location, now));

  const toFriendOnMap = (id: string): FriendOnMap => {
    const data = friendLocations[id];
    const signal = data.profile.currentSignal;
    const isExpired = signal?.expiresAt
      ? signal.expiresAt.toDate().getTime() < now
      : true;
    return {
      userId: id,
      displayName: data.profile.displayName,
      avatarUrl: data.profile.avatarUrl,
      location: { lat: data.location.lat, lng: data.location.lng },
      signal: !isExpired ? signal : null,
      isOnline: isLocationFresh(data.location, now),
      updatedAt: data.location.updatedAt ?? null,
      spot: data.location.spot
        ? { name: data.location.spot.name, emoji: data.location.spot.emoji }
        : null,
    };
  };

  // Step 1: Find clusters (2+ FRESH friends within radius)
  for (let i = 0; i < fresh.length; i++) {
    const [idA, dataA] = fresh[i];
    if (processed.has(idA)) continue;

    const clusterMembers: string[] = [idA];

    for (let j = i + 1; j < fresh.length; j++) {
      const [idB, dataB] = fresh[j];
      if (processed.has(idB)) continue;

      const dist = haversineDistance(
        dataA.location.lat,
        dataA.location.lng,
        dataB.location.lat,
        dataB.location.lng
      );

      if (dist <= MAP_DEFAULTS.clusterRadiusMeters) {
        clusterMembers.push(idB);
      }
    }

    if (clusterMembers.length >= 2) {
      const centroid = calculateCentroid(
        clusterMembers.map((id) => ({
          lat: friendLocations[id].location.lat,
          lng: friendLocations[id].location.lng,
        }))
      );

      entities.push({
        id: `cluster-${clusterMembers.sort().join('-')}`,
        type: 'CLUSTER',
        location: centroid,
        friends: clusterMembers.map(toFriendOnMap),
      });

      clusterMembers.forEach((id) => processed.add(id));
    }
  }

  // Step 2: Individual friends — unclustered fresh, then stale (dimmed).
  for (const [userId, data] of [...fresh, ...stale]) {
    if (processed.has(userId)) continue;

    const friend = toFriendOnMap(userId);
    entities.push({
      id: `friend-${userId}`,
      type: 'FRIEND',
      location: { lat: data.location.lat, lng: data.location.lng },
      friends: [friend],
      signal: friend.signal
        ? { emoji: friend.signal.emoji, text: friend.signal.text }
        : undefined,
      ...(friend.isOnline ? {} : { stale: true }),
    });
  }

  return entities;
}
