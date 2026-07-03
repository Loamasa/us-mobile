import { useMemo } from 'react';
import { haversineDistance, calculateCentroid } from '@/utils/distance';
import { MAP_DEFAULTS } from '@/config/constants';
import type { MapEntity, FriendOnMap, LocationPresence, UserProfile } from '@/types';

interface FriendLocationData {
  location: LocationPresence;
  profile: UserProfile;
}

/**
 * Projects friend locations into map entities (individual friends + clusters).
 * Ported from the web prototype's useMapProjection hook.
 *
 * Algorithm:
 * 1. Find clusters: group friends within CLUSTER_RADIUS of each other
 * 2. Remaining friends become individual markers
 */
export function useMapProjection(
  friendLocations: Record<string, FriendLocationData>
): MapEntity[] {
  return useMemo(() => {
    const entities: MapEntity[] = [];
    const processed = new Set<string>();
    // Sorted ids keep anchor selection deterministic — chat surfaces
    // (src/features/presence/presence.ts) sort the same way so "together"
    // there always matches a rendered cluster here.
    const entries = Object.entries(friendLocations).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0
    );

    if (entries.length === 0) return entities;

    // Step 1: Find clusters (2+ friends within radius)
    for (let i = 0; i < entries.length; i++) {
      const [idA, dataA] = entries[i];
      if (processed.has(idA)) continue;

      const clusterMembers: string[] = [idA];

      for (let j = i + 1; j < entries.length; j++) {
        const [idB, dataB] = entries[j];
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
        // Create cluster entity
        const friends: FriendOnMap[] = clusterMembers.map((id) => {
          const data = friendLocations[id];
          const memberSignal = data.profile.currentSignal;
          const memberSignalExpired = memberSignal?.expiresAt
            ? memberSignal.expiresAt.toDate() < new Date()
            : true;
          return {
            userId: id,
            displayName: data.profile.displayName,
            avatarUrl: data.profile.avatarUrl,
            location: { lat: data.location.lat, lng: data.location.lng },
            signal: !memberSignalExpired ? memberSignal : null,
            isOnline: true,
            spot: data.location.spot
              ? { name: data.location.spot.name, emoji: data.location.spot.emoji }
              : null,
          };
        });

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
          friends,
        });

        clusterMembers.forEach((id) => processed.add(id));
      }
    }

    // Step 2: Individual friends (not in any cluster)
    for (const [userId, data] of entries) {
      if (processed.has(userId)) continue;

      const signal = data.profile.currentSignal;
      const isExpired = signal?.expiresAt
        ? signal.expiresAt.toDate() < new Date()
        : true;

      entities.push({
        id: `friend-${userId}`,
        type: 'FRIEND',
        location: { lat: data.location.lat, lng: data.location.lng },
        friends: [
          {
            userId,
            displayName: data.profile.displayName,
            avatarUrl: data.profile.avatarUrl,
            location: { lat: data.location.lat, lng: data.location.lng },
            signal: !isExpired ? signal : null,
            isOnline: true,
            spot: data.location.spot
              ? { name: data.location.spot.name, emoji: data.location.spot.emoji }
              : null,
          },
        ],
        signal:
          !isExpired && signal
            ? { emoji: signal.emoji, text: signal.text }
            : undefined,
      });
    }

    return entities;
  }, [friendLocations]);
}
