import { haversineDistance } from '@/utils/distance';
import { MAP_DEFAULTS } from '@/config/constants';
import type { LocationPresence } from '@/types';

/**
 * Chat-surface presence helpers (list rows + chat headers).
 *
 * Clustering mirrors useMapProjection's anchor-based pass with the same
 * radius and the same sorted-id anchor order, so what a chat row or header
 * calls "together" is exactly what the map renders as a cluster. Always feed
 * these the FULL friend universe (useFriendLocations / the chats-tab presence
 * map), never just a chat's members — the anchor pass is input-set sensitive,
 * and a narrower universe can cluster differently than the map does.
 */

/**
 * For each visible user, the OTHER visible users proximity-clustered with
 * them. Users not in any cluster are absent from the result.
 */
export function computeClusterPeers(
  locations: Record<string, LocationPresence>
): Record<string, string[]> {
  // Sorted ids keep anchor selection deterministic across hook instances
  // (raw insertion order varies with snapshot arrival).
  const entries = Object.entries(locations).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  const peers: Record<string, string[]> = {};
  const processed = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const [idA, locA] = entries[i];
    if (processed.has(idA)) continue;

    const cluster = [idA];
    for (let j = i + 1; j < entries.length; j++) {
      const [idB, locB] = entries[j];
      if (processed.has(idB)) continue;
      if (
        haversineDistance(locA.lat, locA.lng, locB.lat, locB.lng) <=
        MAP_DEFAULTS.clusterRadiusMeters
      ) {
        cluster.push(idB);
      }
    }

    if (cluster.length >= 2) {
      for (const id of cluster) {
        peers[id] = cluster.filter((other) => other !== id);
        processed.add(id);
      }
    }
  }

  return peers;
}

/**
 * The largest knot of `memberIds` proximity-clustered together right now
 * (2+ members), else []. A non-member friend can bridge two members into the
 * same cluster — deliberate: it matches what the map renders.
 */
export function largestMemberKnot(
  memberIds: string[],
  locations: Record<string, LocationPresence>,
  clusterPeers: Record<string, string[]>
): string[] {
  const members = new Set(memberIds);
  let best: string[] = [];
  for (const id of memberIds) {
    if (!locations[id]) continue;
    const knot = [id, ...(clusterPeers[id] ?? []).filter((p) => members.has(p))];
    if (knot.length >= 2 && knot.length > best.length) best = knot;
  }
  return best;
}

export interface GroupPresence {
  kind: 'CLUSTER' | 'SPOT' | 'VISIBLE' | 'NONE';
  // CLUSTER/SPOT: members together; VISIBLE: members on the map.
  count: number;
  spot?: { name: string; emoji: string };
}

/**
 * Dominant presence for a group chat, prototype hierarchy: cluster > spot >
 * merely-visible. Both group tiers require 2+ members so a lone member at
 * their own spot never reads as group activity.
 *
 * `memberIds` must already exclude the viewer. `locations`/`clusterPeers`
 * must be the full friend universe (see module doc).
 */
export function deriveGroupPresence(
  memberIds: string[],
  locations: Record<string, LocationPresence>,
  clusterPeers: Record<string, string[]>
): GroupPresence {
  const located = memberIds.filter((id) => locations[id]);

  // Cluster tier: the largest knot of co-members clustered together right now.
  const knot = largestMemberKnot(memberIds, locations, clusterPeers);
  if (knot.length >= 2) return { kind: 'CLUSTER', count: knot.length };

  // Spot tier: 2+ members inside the SAME place. Spot snapshots are always
  // the owner's OWN spot, so ids never match across users — same place means
  // same name+emoji AND overlapping zones (centers within the larger radius).
  // Without the distance check, two members each at their own "🏠 Home"
  // across town would read as together.
  const withSpots = located.filter((id) => locations[id].spot);
  let bestSpot: { count: number; name: string; emoji: string } | null = null;
  for (const anchorId of withSpots) {
    const anchor = locations[anchorId].spot!;
    let count = 1;
    for (const otherId of withSpots) {
      if (otherId === anchorId) continue;
      const other = locations[otherId].spot!;
      if (other.name !== anchor.name || other.emoji !== anchor.emoji) continue;
      const centersApart = haversineDistance(
        anchor.center.latitude,
        anchor.center.longitude,
        other.center.latitude,
        other.center.longitude
      );
      if (centersApart <= Math.max(anchor.radius, other.radius)) count += 1;
    }
    if (count >= 2 && (!bestSpot || count > bestSpot.count)) {
      bestSpot = { count, name: anchor.name, emoji: anchor.emoji };
    }
  }
  if (bestSpot) {
    return {
      kind: 'SPOT',
      count: bestSpot.count,
      spot: { name: bestSpot.name, emoji: bestSpot.emoji },
    };
  }

  if (located.length > 0) return { kind: 'VISIBLE', count: located.length };
  return { kind: 'NONE', count: 0 };
}
