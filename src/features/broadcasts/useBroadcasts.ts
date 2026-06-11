import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import {
  onFriends,
  onMyBroadcasts,
  onBroadcastInvites,
  onFriendSoloBroadcasts,
} from '@/lib/firestore';
import type { Broadcast, Friend } from '@/types';

function isLive(b: Broadcast, now: Date): boolean {
  const expires = b.expiresAt?.toDate?.();
  return !!expires && expires > now;
}

/**
 * The viewer's gatherings, split three ways:
 * - mine:       I'm a member (my own + group gatherings I joined)
 * - invites:    pending invitations to group gatherings
 * - friendSolo: friends' SOLO gatherings (visibility 'FRIENDS') — visible to
 *   all their friends so you can see the spot and whether they're there
 * Auth-reactive; expiry enforced client-side (minute tick), same as signals.
 */
export function useBroadcasts() {
  const [userId, setUserId] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );
  const [mineRaw, setMineRaw] = useState<Broadcast[]>([]);
  const [invitesRaw, setInvitesRaw] = useState<Broadcast[]>([]);
  const [friendSoloRaw, setFriendSoloRaw] = useState<Record<string, Broadcast[]>>({});
  const [friends, setFriends] = useState<Friend[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
  }, []);

  useEffect(() => {
    setMineRaw([]);
    setInvitesRaw([]);
    setFriends([]);
    if (!userId) return;
    const unsubMine = onMyBroadcasts(userId, setMineRaw);
    const unsubInvites = onBroadcastInvites(userId, setInvitesRaw);
    const unsubFriends = onFriends(userId, setFriends);
    return () => {
      unsubMine();
      unsubInvites();
      unsubFriends();
    };
  }, [userId]);

  // Per-friend fan-out for their solo gatherings — stable string key so the
  // effect doesn't re-subscribe on every snapshot (see chats.tsx gotcha).
  const friendIdKey = useMemo(
    () => friends.map((f) => f.userId).sort().join('|'),
    [friends]
  );

  useEffect(() => {
    setFriendSoloRaw({});
    if (!friendIdKey) return;
    const unsubs = friendIdKey.split('|').map((id) =>
      onFriendSoloBroadcasts(id, (broadcasts) => {
        setFriendSoloRaw((prev) => ({ ...prev, [id]: broadcasts }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [friendIdKey]);

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
  const friendSolo = useMemo(() => {
    const mineIds = new Set(mine.map((b) => b.id));
    return Object.values(friendSoloRaw)
      .flat()
      .filter((b) => isLive(b, now) && !mineIds.has(b.id));
  }, [friendSoloRaw, mine, now]);

  return { mine, invites, friendSolo };
}
