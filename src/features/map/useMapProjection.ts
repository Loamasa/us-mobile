import { useMemo } from 'react';
import { projectMapEntities, type FriendLocationData } from './mapProjection';

export function useMapProjection(friendLocations: Record<string, FriendLocationData>) {
  return useMemo(() => projectMapEntities(friendLocations), [friendLocations]);
}
