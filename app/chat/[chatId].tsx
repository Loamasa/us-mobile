import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import {
  onChatSummary,
  onFriends,
  onLocation,
  onMessages,
  onUserProfile,
  sendMessage,
} from '@/lib/firestore';
import UserAvatar from '@/components/UserAvatar';
import ChatInfoSheet from '@/features/chat/ChatInfoSheet';
import { useChatKeys } from '@/features/e2ee/useChatKeys';
import { markChatRead } from '@/features/chat/readMarks';
import { useFriendLocations } from '@/features/map/useFriendLocations';
import {
  computeClusterPeers,
  deriveGroupPresence,
  isLocationFresh,
  largestMemberKnot,
} from '@/features/presence/presence';
import { COLORS } from '@/config/constants';
import { calculateCentroid } from '@/utils/distance';
import { MapPinIcon, UsersIcon } from '@/components/ui/icons';
import type { Timestamp } from 'firebase/firestore';
import type { ChatSummary, LocationPresence, Message, UserProfile } from '@/types';

// "14:05" — pending serverTimestamps (null) render nothing.
function formatClock(t: Timestamp | null | undefined): string {
  if (!t) return '';
  const d = new Date(t.toMillis());
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dayLabel(t: Timestamp): string {
  const d = new Date(t.toMillis());
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function sameDay(a: Timestamp | null | undefined, b: Timestamp | null | undefined): boolean {
  // Pending timestamps: claim same-day so separators don't flicker in.
  if (!a || !b) return true;
  return new Date(a.toMillis()).toDateString() === new Date(b.toMillis()).toDateString();
}

const MESSAGE_PAGE_SIZE = 100;

export default function ChatDetailScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );
  const [chat, setChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Record<string, UserProfile>>({});
  const [peerLocation, setPeerLocation] = useState<LocationPresence | null>(null);
  // Viewer's friend ids — gates Remove Friend in the info sheet.
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const [input, setInput] = useState('');
  const [messageLimit, setMessageLimit] = useState(MESSAGE_PAGE_SIZE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
  }, []);

  useEffect(() => {
    if (!chatId || !userId) return;
    return onChatSummary(chatId, userId, (c) => {
      setChat(c);
      setLoaded(true);
    });
  }, [chatId, userId]);

  useEffect(() => {
    if (!chatId || !userId) return;
    return onMessages(chatId, userId, setMessages, messageLimit);
  }, [chatId, userId, messageLimit]);

  const chatKeys = useChatKeys(chat?.memberIds, userId);

  // Server time on both sides of the unread check, so a wrong phone clock can't
  // leave a chat looking unread forever.
  const lastMessageMillis = chat?.lastMessageAt?.toMillis();
  useEffect(() => {
    if (chatId && userId && lastMessageMillis) markChatRead(userId, chatId, lastMessageMillis);
  }, [chatId, userId, lastMessageMillis]);

  // Subscribe to each member's profile for name + avatar resolution.
  useEffect(() => {
    if (!chat?.memberIds?.length) {
      setMembers({});
      return;
    }
    const unsubs = chat.memberIds.map((id) =>
      onUserProfile(id, (profile) => {
        setMembers((prev) => {
          if (!profile) return prev;
          return { ...prev, [id]: profile };
        });
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [chat?.memberIds]);

  const peerId = useMemo(() => {
    if (!chat || chat.type !== 'DM' || !userId) return null;
    return chat.memberIds.find((id) => id !== userId) ?? null;
  }, [chat, userId]);

  // For DMs, subscribe to the peer's location doc to show presence.
  useEffect(() => {
    if (!peerId) {
      setPeerLocation(null);
      return;
    }
    return onLocation(peerId, setPeerLocation);
  }, [peerId]);

  // All friends' locations — the SAME cluster universe as the map and the
  // chats tab, so "together" here always matches a rendered map cluster.
  // Covers group members too: only members who friended the viewer are
  // readable under the rules anyway. The SDK multiplexes same-doc listeners,
  // so overlap with peerLocation costs nothing extra.
  const { friendLocations } = useFriendLocations();
  // Freshness decays with TIME: a lone frozen doc never snapshots again, so
  // a minute tick re-filters (and re-renders the header's direct
  // isLocationFresh calls) — otherwise "At Home" could outlive the friend.
  const [freshnessTick, setFreshnessTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setFreshnessTick(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  // Fresh docs only — a frozen doc (publisher killed mid-spot) must not feed
  // "With Alice" / "At Home" copy or the info sheet's presence lines.
  const friendPresence = useMemo(() => {
    const record: Record<string, LocationPresence> = {};
    for (const [id, data] of Object.entries(friendLocations)) {
      if (isLocationFresh(data.location, freshnessTick)) record[id] = data.location;
    }
    return record;
  }, [friendLocations, freshnessTick]);
  const friendClusterPeers = useMemo(
    () => computeClusterPeers(friendPresence),
    [friendPresence]
  );
  const peerClusterIds = useMemo(
    () => (peerId ? (friendClusterPeers[peerId] ?? []) : []),
    [friendClusterPeers, peerId]
  );

  const otherMemberIds = useMemo(() => {
    if (!chat || chat.type !== 'GROUP' || !userId) return [];
    return chat.memberIds.filter((id) => id !== userId);
  }, [chat, userId]);

  useEffect(() => {
    setFriendIds(new Set());
    if (!userId) return;
    return onFriends(userId, (friends) =>
      setFriendIds(new Set(friends.map((f) => f.userId)))
    );
  }, [userId]);

  // Where this chat lives on the map right now, if anywhere.
  // DM: the peer's live position. GROUP: a live proximity cluster of members
  // wins; otherwise a named always-on group rests at its fixedLocation —
  // the same proximity-wins semantics as buildGroupPins.
  const mapTarget = useMemo<
    { lat: number; lng: number; live: boolean } | null
  >(() => {
    if (!chat) return null;
    if (chat.type === 'DM') {
      if (!peerLocation) return null;
      // Peer clustered with other friends → aim at the knot, not the person.
      const peers = peerClusterIds
        .map((id) => friendPresence[id])
        .filter(Boolean);
      if (peers.length > 0) {
        const c = calculateCentroid(
          [peerLocation, ...peers].map((l) => ({ lat: l.lat, lng: l.lng }))
        );
        return { lat: c.lat, lng: c.lng, live: true };
      }
      return { lat: peerLocation.lat, lng: peerLocation.lng, live: true };
    }
    // Live proximity knot of members (friend universe — same clustering as
    // the map and the header copy). Aim at its centroid.
    const knot = largestMemberKnot(
      otherMemberIds,
      friendPresence,
      friendClusterPeers
    );
    if (knot.length >= 2) {
      const c = calculateCentroid(
        knot.map((id) => ({
          lat: friendPresence[id].lat,
          lng: friendPresence[id].lng,
        }))
      );
      return { lat: c.lat, lng: c.lng, live: true };
    }
    if (chat.mapVisibility === 'ALWAYS' && chat.name && chat.fixedLocation) {
      return {
        lat: chat.fixedLocation.latitude,
        lng: chat.fixedLocation.longitude,
        live: false,
      };
    }
    return null;
  }, [
    chat,
    otherMemberIds,
    peerLocation,
    peerClusterIds,
    friendPresence,
    friendClusterPeers,
  ]);

  const handleViewOnMap = useCallback(() => {
    if (!mapTarget) return;
    router.navigate({
      pathname: '/(tabs)/map',
      params: {
        focusLat: String(mapTarget.lat),
        focusLng: String(mapTarget.lng),
        focusTs: String(Date.now()),
      },
    });
  }, [mapTarget, router]);

  const headerTitle = useMemo(() => {
    if (!chat) return loaded ? 'Chat' : 'Loading…';
    if (chat.type === 'DM' && peerId) {
      return members[peerId]?.displayName ?? 'Direct message';
    }
    return chat.name ?? 'Chat';
  }, [chat, peerId, members, loaded]);

  const headerSubtitle = useMemo(() => {
    if (!chat) return '';
    if (chat.type === 'GROUP') {
      const base = `${chat.memberIds.length} members`;
      const group = deriveGroupPresence(
        otherMemberIds,
        friendPresence,
        friendClusterPeers
      );
      if (group.kind === 'CLUSTER') return `${base} · ${group.count} together now`;
      if (group.kind === 'SPOT' && group.spot) {
        return `${base} · ${group.count} at ${group.spot.emoji} ${group.spot.name}`;
      }
      if (group.kind === 'VISIBLE') {
        return `${base} · ${group.count} on the map`;
      }
      return base;
    }
    // DM hierarchy: with-friends cluster > at-spot > online/offline. Every
    // tier requires a FRESH doc — a frozen one reads as Offline, not "At X".
    if (peerClusterIds.length > 0) {
      // `||` not `??` — an empty displayName would otherwise render "With ".
      const first =
        friendLocations[peerClusterIds[0]]?.profile.displayName.split(' ')[0] ||
        'a friend';
      return peerClusterIds.length === 1
        ? `With ${first}`
        : `With ${first} +${peerClusterIds.length - 1}`;
    }
    const peerFresh = peerLocation ? isLocationFresh(peerLocation) : false;
    if (peerFresh && peerLocation?.spot) {
      return `${peerLocation.spot.emoji} At ${peerLocation.spot.name}`;
    }
    return peerFresh ? 'Online' : 'Offline';
  }, [
    chat,
    otherMemberIds,
    friendPresence,
    friendClusterPeers,
    peerClusterIds,
    friendLocations,
    peerLocation,
  ]);

  const handleSend = useCallback(async () => {
    if (!chatId || !userId) return;
    const content = input.trim();
    if (!content) return;
    // Clear first: the send only resolves once the server confirms, which on a
    // slow network would wipe whatever was typed meanwhile (and never happen
    // offline). Firestore queues the write and shows the message immediately.
    setInput('');
    try {
      await sendMessage(chatId, userId, content, chatKeys.recipients);
    } catch (e: unknown) {
      console.error('sendMessage failed', e);
      setInput((current) => current || content);
      Alert.alert(
        'Could not send',
        e instanceof Error ? e.message : 'Check your connection and try again.'
      );
    }
  }, [chatId, userId, input, chatKeys.recipients]);

  const memberName = useCallback(
    (id: string) => members[id]?.displayName ?? 'Someone',
    [members]
  );

  // Nothing goes out until a changed key is acknowledged: it could be a new
  // phone, or someone swapping keys to read along. A DM also needs the peer's
  // key; a group can go ahead without members who haven't got one yet.
  const hasRecipient = Object.keys(chatKeys.recipients).length > 0;
  const canSend = chatKeys.changed.length === 0 && hasRecipient;

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMine = item.senderId === userId;
      const sender = members[item.senderId];
      const displayName = sender?.displayName ?? '…';
      const clock = formatClock(item.createdAt);
      // Inverted list: index+1 is the OLDER neighbor. First message of a day
      // (or of the whole history) gets a day separator above it.
      const older = messages[index + 1];
      const showDaySeparator =
        !!item.createdAt &&
        (index === messages.length - 1 ||
          !sameDay(item.createdAt, older?.createdAt));

      return (
        <View>
          {showDaySeparator && (
            <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 12 }}>
              <Text
                style={{
                  color: 'rgba(242,244,246,0.35)',
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                {dayLabel(item.createdAt)}
              </Text>
            </View>
          )}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: isMine ? 'flex-end' : 'flex-start',
            marginBottom: 10,
            paddingHorizontal: 12,
          }}
        >
          {!isMine && (
            <View style={{ marginRight: 8, marginTop: 2 }}>
              <UserAvatar
                displayName={displayName}
                size="sm"
                tint="signal"
              />
            </View>
          )}
          <View style={{ maxWidth: '75%' }}>
            {!isMine && chat?.type === 'GROUP' && (
              <Text
                style={{
                  color: COLORS.signal,
                  fontSize: 11,
                  fontWeight: '700',
                  marginBottom: 2,
                  marginLeft: 4,
                }}
              >
                {displayName}
              </Text>
            )}
            <View
              style={{
                backgroundColor: isMine
                  ? COLORS.signal
                  : 'rgba(255,255,255,0.06)',
                borderWidth: isMine ? 0 : 1,
                borderColor: 'rgba(255,255,255,0.08)',
                borderRadius: 16,
                borderTopRightRadius: isMine ? 4 : 16,
                borderTopLeftRadius: isMine ? 16 : 4,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: COLORS.fog, fontSize: 14, lineHeight: 19 }}>
                {item.security === 'locked'
                  ? "🔒 Can't be read on this device"
                  : item.content}
              </Text>
              {item.security === 'unverified' && (
                <Text style={{ color: COLORS.orange, fontSize: 10, marginTop: 3 }}>
                  ⚠️ Sender's key not verified
                </Text>
              )}
              {clock ? (
                <Text
                  style={{
                    color: isMine
                      ? 'rgba(242,244,246,0.55)'
                      : 'rgba(242,244,246,0.35)',
                    fontSize: 10,
                    alignSelf: 'flex-end',
                    marginTop: 3,
                  }}
                >
                  {clock}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        </View>
      );
    },
    [userId, members, chat?.type, messages]
  );

  if (!chatId) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.void }} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.void }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 14,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={{ paddingRight: 10 }}
        >
          <Text style={{ color: COLORS.fog, fontSize: 22, fontWeight: '300' }}>
            ‹
          </Text>
        </TouchableOpacity>
        {/* Tap the title area for group info / the peer's profile. */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={0.7}
          disabled={!chat}
          onPress={() => setShowInfo(true)}
        >
          <Text
            numberOfLines={1}
            style={{ color: COLORS.fog, fontSize: 17, fontWeight: '700' }}
          >
            {headerTitle}
          </Text>
          {chat && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {chat.type === 'DM' && (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      peerLocation && isLocationFresh(peerLocation)
                        ? COLORS.mint
                        : 'rgba(242,244,246,0.25)',
                  }}
                />
              )}
              <Text style={{ color: 'rgba(242,244,246,0.5)', fontSize: 11 }}>
                {headerSubtitle}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Map pill — jumps the map tab to the crew's live cluster, the
            group's resting pin, or the DM peer's position. */}
        {mapTarget && (
          <TouchableOpacity
            onPress={handleViewOnMap}
            activeOpacity={0.8}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(46,92,255,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(46,92,255,0.35)',
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
              marginLeft: 8,
            }}
          >
            {mapTarget.live ? (
              <UsersIcon size={11} color={COLORS.signal} />
            ) : (
              <MapPinIcon size={11} color={COLORS.signal} />
            )}
            <Text
              style={{
                color: COLORS.signal,
                fontSize: 9,
                fontWeight: '800',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              View Map
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      {/* behavior="padding" on Android too: edge-to-edge (SDK 54 default)
          means the window no longer resizes for the keyboard, so without
          padding the input is fully covered. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {loaded && !chat ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(242,244,246,0.4)' }}>
              Chat not found or you don't have access.
            </Text>
          </View>
        ) : !loaded ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={COLORS.signal} />
          </View>
        ) : messages.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
            }}
          >
            <Text style={{ color: 'rgba(242,244,246,0.4)', textAlign: 'center' }}>
              {chat?.type === 'DM'
                ? `No messages yet. Say hi to ${
                    (peerId && members[peerId]?.displayName) || 'them'
                  }.`
                : 'No messages yet. Say hi to the crew.'}
              {'\n\n'}🔒 Messages are end-to-end encrypted.
            </Text>
          </View>
        ) : (
          <FlatList
            inverted
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingVertical: 12 }}
            keyboardDismissMode="on-drag"
            // A full page means there may be more further back.
            onEndReached={() => {
              if (messages.length === messageLimit) {
                setMessageLimit(messageLimit + MESSAGE_PAGE_SIZE);
              }
            }}
            onEndReachedThreshold={0.3}
          />
        )}

        {/* Encryption notices */}
        {chatKeys.changed.map(({ uid, key }) => (
          <View
            key={uid}
            style={{
              margin: 12,
              marginBottom: 0,
              padding: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(249,115,22,0.4)',
              backgroundColor: 'rgba(249,115,22,0.1)',
            }}
          >
            <Text style={{ color: COLORS.fog, fontSize: 13, lineHeight: 18 }}>
              🔐 {memberName(uid)}'s security key changed. Usually that's a new phone
              or a reinstall, but it could also mean someone is trying to read along.
              Check with them if you're unsure.
            </Text>
            <TouchableOpacity
              onPress={() => chatKeys.acceptKey(uid, key)}
              activeOpacity={0.8}
              style={{ alignSelf: 'flex-end', marginTop: 8, padding: 4 }}
            >
              <Text style={{ color: COLORS.orange, fontWeight: '700', fontSize: 13 }}>
                OK, continue
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        {chatKeys.missing.length > 0 && chat && (
          <Text
            style={{
              color: 'rgba(242,244,246,0.5)',
              fontSize: 12,
              textAlign: 'center',
              paddingHorizontal: 24,
              paddingTop: 10,
            }}
          >
            {chat.type === 'DM'
              ? `🔒 ${memberName(chatKeys.missing[0])} needs to open the app once before you can send encrypted messages.`
              : `🔒 ${chatKeys.missing.map(memberName).join(', ')} can't read new messages until they open the app.`}
          </Text>
        )}

        {/* Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
            padding: 12,
            paddingBottom: 28,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message…"
            placeholderTextColor="rgba(242,244,246,0.35)"
            multiline
            maxLength={4000}
            style={{
              flex: 1,
              color: COLORS.fog,
              fontSize: 15,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingTop: 10,
              paddingBottom: 10,
              maxHeight: 120,
              minHeight: 40,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || !canSend}
            activeOpacity={0.8}
            style={{
              height: 40,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: !input.trim() || !canSend
                ? 'rgba(46,92,255,0.35)'
                : COLORS.signal,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: COLORS.fog, fontWeight: '700', fontSize: 13 }}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {chat && userId && (
        <ChatInfoSheet
          visible={showInfo}
          onClose={() => setShowInfo(false)}
          chat={chat}
          viewerId={userId}
          members={members}
          friendIds={friendIds}
          presence={friendPresence}
          safetyCodeFor={chatKeys.safetyCodeFor}
        />
      )}
    </View>
  );
}
