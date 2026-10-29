import { useMemo } from 'react';
import { projectMapEntities, type FriendLocationData } from './mapProjection';

export function useMapProjection(
  friendLocations: Record<string, FriendLocationData>,
  now: number
) {
  return useMemo(() => projectMapEntities(friendLocations, now), [friendLocations, now]);
}
