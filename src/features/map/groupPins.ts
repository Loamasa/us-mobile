import type {
  ChatSummary,
  FriendOnMap,
  MapEntity,
  UserProfile,
  UserSignal,
} from '@/types';

/**
 * Reconciles named "always-on" group chats with the live proximity projection.
 *
 * A named GROUP chat (`mapVisibility === 'ALWAYS'`, non-null `name`) can surface
 * on the map two ways:
 *
 *   1. LIVE — its members are physically clustered right now. We decorate the
 *      existing proximity cluster (from useMapProjection) with the group's name
 *      + id and render it at the members' real centroid.
 *
 *   2. RESTING — its members are NOT clustered (apart, partially present, or all
 *      ghost). If the chat has a `fixedLocation`, we synthesize a persistent
 *      CLUSTER pin there so the group is always visible at its "home base"
 *      (prototype parity: "Möllevången Crew" always at Möllevångstorget).
 *
 * Rule when a group has BOTH a live proximity cluster AND a fixedLocation:
 * **proximity wins** — show the live cluster, suppress the fixed pin. The fixed
 * pin is purely a fallback for when the crew isn't actually together.
 *
 * The fixed pin does NOT absorb members' individual real-time pins: someone who
 * is genuinely visible at their own spot keeps their own marker (truthful
 * presence > tidy map), while the fixed pin stands as the group's identity
 * marker. In the LIVE case the members are already absorbed into the proximity
 * cluster by useMapProjection, so there is no double-render there.
 */
export function buildGroupPins(params: {
  rawEntities: MapEntity[];
  chats: ChatSummary[];
  userId: string;
  memberProfiles: Record<string, UserProfile>;
}): MapEntity[] {
  const { rawEntities, chats, userId, memberProfiles } = params;

  const namedGroups = chats.filter(
    (c): c is ChatSummary & { name: string } =>
      c.type === 'GROUP' && c.mapVisibility === 'ALWAYS' && c.name !== null
  );
  if (namedGroups.length === 0) return rawEntities;

  // Pass 1 — decorate live proximity clusters; record which groups matched.
  const matchedGroupIds = new Set<string>();
  const decorated = rawEntities.map((entity) => {
    if (entity.type !== 'CLUSTER') return entity;
    const clusterIds = [...entity.friends.map((f) => f.userId), userId].sort();
    const match = namedGroups.find((g) => sameMembers(g.memberIds, clusterIds));
    if (!match) return entity;
    matchedGroupIds.add(match.id);
    return { ...entity, groupChat: { id: match.id, name: match.name } };
  });

  // Pass 2 — synthesize resting pins for fixedLocation groups with no live match.
  const synthesized: MapEntity[] = [];
  for (const group of namedGroups) {
    if (matchedGroupIds.has(group.id) || group.fixedLocation == null) continue;

    const location = {
      lat: group.fixedLocation.latitude,
      lng: group.fixedLocation.longitude,
    };
    const friends: FriendOnMap[] = group.memberIds
      .filter((id) => id !== userId)
      .map((id) => {
        const profile = memberProfiles[id];
        return {
          userId: id,
          displayName: profile?.displayName ?? 'Member',
          avatarUrl: profile?.avatarUrl ?? null,
          location,
          signal: activeSignal(profile),
          isOnline: false,
          spot: null,
        };
      });

    synthesized.push({
      id: `group-${group.id}`,
      type: 'CLUSTER',
      location,
      friends,
      groupChat: { id: group.id, name: group.name, fixed: true },
    });
  }

  return [...decorated, ...synthesized];
}

/** Two id lists describe the same membership (order-independent). */
function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

/** The profile's current signal if present and unexpired, else null. */
function activeSignal(profile: UserProfile | undefined): UserSignal | null {
  const signal = profile?.currentSignal;
  if (!signal) return null;
  const expires = signal.expiresAt?.toDate?.();
  if (!expires || expires <= new Date()) return null;
  return signal;
}
