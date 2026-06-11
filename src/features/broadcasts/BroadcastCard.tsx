import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import UserAvatar from '@/components/UserAvatar';
import { XIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';
import { onLocation, onUserProfile } from '@/lib/firestore';
import { haversineDistance } from '@/utils/distance';
import type { Broadcast, LocationPresence, UserProfile } from '@/types';

// MEMBER — viewer is in the gathering; INVITE — pending invitation;
// PEEK — a friend's solo gathering (read-only: spot + are-they-there).
export type BroadcastCardMode = 'MEMBER' | 'INVITE' | 'PEEK';

interface BroadcastCardProps {
  broadcast: Broadcast;
  viewerId: string;
  mode: BroadcastCardMode;
  busy?: boolean;
  onClose: () => void;
  onOpenChat: (broadcast: Broadcast) => void;
  onAccept: (broadcast: Broadcast) => void;
  onDecline: (broadcast: Broadcast) => void;
  onEnd: (broadcast: Broadcast) => void;
}

const FACEPILE_MAX = 5;

function formatRemaining(expiresAt: Broadcast['expiresAt'], now: Date): string {
  const ms = expiresAt.toDate().getTime() - now.getTime();
  if (ms <= 0) return 'expired';
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/**
 * Bottom-anchored glass card for a tapped gathering pin (rose cousin of
 * ClusterCard). Members see the roster + who's physically here + the group
 * chat CTA; invitees see Join / Decline; PEEK (a friend's solo gathering)
 * is informational — the spot, the countdown, and whether they're there.
 */
export default function BroadcastCard({
  broadcast,
  viewerId,
  mode,
  busy,
  onClose,
  onOpenChat,
  onAccept,
  onDecline,
  onEnd,
}: BroadcastCardProps) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [presence, setPresence] = useState<Record<string, LocationPresence>>({});
  const [now, setNow] = useState(new Date());

  const isCreator = broadcast.createdBy === viewerId;
  const rosterKey = useMemo(
    () => [...broadcast.memberIds].sort().join('|'),
    [broadcast.memberIds]
  );

  // Roster profiles + live positions ("here now"). Location reads can be
  // denied for members who aren't the viewer's friends — handled gracefully
  // (they just never show as here).
  useEffect(() => {
    setProfiles({});
    setPresence({});
    if (!rosterKey) return;
    const ids = rosterKey.split('|');
    const unsubs = ids.flatMap((id) => [
      onUserProfile(id, (profile) => {
        if (!profile) return;
        setProfiles((prev) => ({ ...prev, [id]: profile }));
      }),
      onLocation(id, (loc) => {
        setPresence((prev) => {
          const next = { ...prev };
          if (loc) next[id] = loc;
          else delete next[id];
          return next;
        });
      }),
    ]);
    return () => unsubs.forEach((u) => u());
  }, [rosterKey]);

  // Countdown tick.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const memberIds = broadcast.memberIds;
  const hereIds = useMemo(() => {
    const here = new Set<string>();
    for (const id of memberIds) {
      const loc = presence[id];
      if (!loc) continue;
      const dist = haversineDistance(
        loc.lat,
        loc.lng,
        broadcast.location.latitude,
        broadcast.location.longitude
      );
      if (dist <= broadcast.radius) here.add(id);
    }
    return here;
  }, [memberIds, presence, broadcast.location, broadcast.radius]);

  const shown = memberIds.slice(0, FACEPILE_MAX);
  const overflow = Math.max(0, memberIds.length - FACEPILE_MAX);
  const pendingCount = broadcast.invitedIds.length;
  const creatorName =
    profiles[broadcast.createdBy]?.displayName?.split(' ')[0] ?? 'They';

  const rosterLine =
    mode === 'INVITE'
      ? `You're invited · ${memberIds.length} in so far`
      : mode === 'PEEK'
        ? hereIds.has(broadcast.createdBy)
          ? `${creatorName} is here now`
          : `${creatorName} isn't here right now`
        : `${memberIds.length} in` +
          (hereIds.size > 0 ? ` · ${hereIds.size} here now` : '') +
          (pendingCount > 0 ? ` · ${pendingCount} invited` : '');

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 96,
        alignItems: 'center',
        zIndex: 60,
      }}
    >
      <BlurView
        tint="dark"
        intensity={50}
        style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: 'rgba(15, 17, 21, 0.85)',
          borderWidth: 1,
          borderColor: 'rgba(244, 114, 182, 0.25)',
          borderRadius: 20,
          padding: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 18 }}>{broadcast.emoji}</Text>
          <Text
            numberOfLines={1}
            style={{
              color: COLORS.rose,
              fontSize: 16,
              fontWeight: '800',
              flexShrink: 1,
            }}
          >
            {broadcast.text}
          </Text>
          <View
            style={{
              backgroundColor: 'rgba(244, 114, 182, 0.2)',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                color: COLORS.rose,
                fontSize: 9,
                fontWeight: '900',
                letterSpacing: 1,
              }}
            >
              {mode === 'INVITE'
                ? 'INVITE'
                : broadcast.visibility === 'MEMBERS'
                  ? 'GROUP GATHERING'
                  : 'GATHERING'}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{ padding: 2 }}
            accessibilityLabel="Close broadcast card"
          >
            <XIcon size={18} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Roster facepile — "here now" members get the online dot */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
        >
          {shown.map((id, i) => (
            <View
              key={id}
              style={{
                marginLeft: i === 0 ? 0 : -10,
                borderWidth: 2,
                borderColor: COLORS.void,
                borderRadius: 20,
              }}
            >
              <UserAvatar
                displayName={profiles[id]?.displayName ?? '?'}
                size="sm"
                tint="rose"
                showStatus={hereIds.has(id)}
                status="online"
              />
            </View>
          ))}
          {overflow > 0 && (
            <View
              style={{
                marginLeft: -10,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 2,
                borderColor: COLORS.void,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: COLORS.fog, fontSize: 10, fontWeight: '700' }}>
                +{overflow}
              </Text>
            </View>
          )}
        </View>

        {/* Status line */}
        <Text style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 12 }}>
          {rosterLine} · {formatRemaining(broadcast.expiresAt, now)}
        </Text>

        {/* CTAs */}
        {mode === 'INVITE' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={busy}
              onPress={() => onDecline(broadcast)}
              style={{
                flex: 1,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <Text style={{ color: 'rgba(242,244,246,0.6)', fontSize: 13, fontWeight: '700' }}>
                Decline
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={busy}
              onPress={() => onAccept(broadcast)}
              style={{
                flex: 1,
                backgroundColor: COLORS.rose,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Text style={{ color: '#0F1115', fontSize: 13, fontWeight: '900' }}>
                Join Broadcast
              </Text>
            </TouchableOpacity>
          </View>
        ) : mode === 'MEMBER' ? (
          <>
            {/* A solo gathering has no crew to chat with. */}
            {memberIds.length >= 2 && (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={busy}
                onPress={() => onOpenChat(broadcast)}
                style={{
                  backgroundColor: COLORS.rose,
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: busy ? 0.6 : 1,
                  shadowColor: COLORS.rose,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                }}
              >
                <Text style={{ color: '#0F1115', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 }}>
                  Open Group Chat
                </Text>
              </TouchableOpacity>
            )}
            {isCreator && (
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={busy}
                onPress={() => onEnd(broadcast)}
                style={{ alignItems: 'center', paddingTop: 10 }}
              >
                <Text style={{ color: 'rgba(242,244,246,0.4)', fontSize: 11, fontWeight: '700' }}>
                  End Gathering
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : null}
      </BlurView>
    </View>
  );
}
