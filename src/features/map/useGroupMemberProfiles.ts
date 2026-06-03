import { useEffect, useMemo, useState } from 'react';
import { onUserProfile } from '@/lib/firestore';
import type { ChatSummary, UserProfile } from '@/types';

/**
 * Resolves the profiles of members of named "always-on" map groups
 * (GROUP chats with `mapVisibility === 'ALWAYS'` and a `fixedLocation`),
 * excluding the viewer. These power the facepile of a synthesized fixed
 * group pin, whose members may be ghost / apart and therefore absent from
 * `useFriendLocations` (which only surfaces friends who have a location doc).
 *
 * Keyed by a stable sorted-pipe-delimited string, NOT the raw id array:
 * `chats` gets a fresh identity on every `onChats` snapshot, so a memo over
 * the id *array* would re-run the fan-out effect and thrash N profile
 * listeners every snapshot. A primitive string compares by value, so the
 * effect only re-subscribes when the member id *set* actually changes.
 * (See MEMORY.md — "Fan-out Firestore subscriptions need a stable string key".)
 */
export function useGroupMemberProfiles(
  chats: ChatSummary[],
  userId: string | undefined
): Record<string, UserProfile> {
  const memberKey = useMemo(() => {
    const set = new Set<string>();
    for (const c of chats) {
      if (
        c.type === 'GROUP' &&
        c.mapVisibility === 'ALWAYS' &&
        c.fixedLocation != null &&
        c.name != null
      ) {
        for (const id of c.memberIds) if (id !== userId) set.add(id);
      }
    }
    return Array.from(set).sort().join('|');
  }, [chats, userId]);

  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    setProfiles({});
    if (!memberKey) return;
    const ids = memberKey.split('|');

    const unsubs = ids.map((id) =>
      onUserProfile(id, (profile) => {
        setProfiles((prev) => {
          if (!profile) {
            if (!(id in prev)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          }
          return { ...prev, [id]: profile };
        });
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [memberKey]);

  return profiles;
}
