import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { onMyBroadcasts, onBroadcastInvites } from '@/lib/firestore';
import type { Broadcast } from '@/types';

function isLive(b: Broadcast, now: Date): boolean {
  const expires = b.expiresAt?.toDate?.();
  return !!expires && expires > now;
}

/**
 * The viewer's group broadcasts, split into ones they're a member of and
 * pending invites. Auth-reactive; expiry is enforced client-side against
 * expiresAt (same as signals) with a minute tick so pins vanish on TTL
 * without a snapshot.
 */
export function useBroadcasts() {
  const [userId, setUserId] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );
  const [mineRaw, setMineRaw] = useState<Broadcast[]>([]);
  const [invitesRaw, setInvitesRaw] = useState<Broadcast[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
  }, []);

  useEffect(() => {
    setMineRaw([]);
    setInvitesRaw([]);
    if (!userId) return;
    const unsubMine = onMyBroadcasts(userId, setMineRaw);
    const unsubInvites = onBroadcastInvites(userId, setInvitesRaw);
    return () => {
      unsubMine();
      unsubInvites();
    };
  }, [userId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const mine = useMemo(
    () => mineRaw.filter((b) => isLive(b, now)),
    [mineRaw, now]
  );
  const invites = useMemo(
    () => invitesRaw.filter((b) => isLive(b, now)),
    [invitesRaw, now]
  );

  return { mine, invites };
}
