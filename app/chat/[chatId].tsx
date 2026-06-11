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
  onLocation,
  onMessages,
  onUserProfile,
  sendMessage,
} from '@/lib/firestore';
import UserAvatar from '@/components/UserAvatar';
import { COLORS, MAP_DEFAULTS } from '@/config/constants';
import { haversineDistance, calculateCentroid } from '@/utils/distance';
import { MapPinIcon, UsersIcon } from '@/components/ui/icons';
import type { ChatSummary, LocationPresence, Message, UserProfile } from '@/types';

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
  // GROUP chats: live locations of the other members (for the map pill).
  const [memberPresence, setMemberPresence] = useState<
    Record<string, LocationPresence>
  >({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
  }, []);

  useEffect(() => {
    if (!chatId) return;
    return onChatSummary(chatId, (c) => {
      setChat(c);
      setLoaded(true);
    });
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    return onMessages(chatId, setMessages);
  }, [chatId]);

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

  // For GROUP chats, subscribe to the other members' locations so the header
  // can offer "View Map" when the crew is on it. Stable string key — array
  // deps would re-subscribe on every snapshot (see chats.tsx gotcha).
  const groupPresenceKey = useMemo(() => {
    if (!chat || chat.type !== 'GROUP' || !userId) return '';
    return chat.memberIds
      .filter((id) => id !== userId)
      .sort()
      .join('|');
  }, [chat, userId]);

  useEffect(() => {
    setMemberPresence({});
    if (!groupPresenceKey) return;
    const unsubs = groupPresenceKey.split('|').map((id) =>
      onLocation(id, (loc) => {
        setMemberPresence((prev) => {
          const next = { ...prev };
          if (loc) next[id] = loc;
          else delete next[id];
          return next;
        });
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [groupPresenceKey]);

  // Where this chat lives on the map right now, if anywhere.
  // DM: the peer's live position. GROUP: a live proximity cluster of members
  // wins; otherwise a named always-on group rests at its fixedLocation —
  // the same proximity-wins semantics as buildGroupPins.
  const mapTarget = useMemo<
    { lat: number; lng: number; live: boolean } | null
  >(() => {
    if (!chat) return null;
    if (chat.type === 'DM') {
      return peerLocation
        ? { lat: peerLocation.lat, lng: peerLocation.lng, live: true }
        : null;
    }
    const located = Object.values(memberPresence);
    for (const anchor of located) {
      const near = located.filter(
        (l) =>
          haversineDistance(anchor.lat, anchor.lng, l.lat, l.lng) <=
          MAP_DEFAULTS.clusterRadiusMeters
      );
      if (near.length >= 2) {
        const c = calculateCentroid(near.map((l) => ({ lat: l.lat, lng: l.lng })));
        return { lat: c.lat, lng: c.lng, live: true };
      }
    }
    if (chat.mapVisibility === 'ALWAYS' && chat.name && chat.fixedLocation) {
      return {
        lat: chat.fixedLocation.latitude,
        lng: chat.fixedLocation.longitude,
        live: false,
      };
    }
    return null;
  }, [chat, memberPresence, peerLocation]);

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
    if (chat.type === 'GROUP') return `${chat.memberIds.length} members`;
    return peerLocation ? 'Online' : 'Offline';
  }, [chat, peerLocation]);

  const handleSend = useCallback(async () => {
    if (!chatId || !userId) return;
    const content = input.trim();
    if (!content) return;
    setSending(true);
    try {
      await sendMessage(chatId, userId, content);
      setInput('');
    } catch (e: unknown) {
      console.error('sendMessage failed', e);
      Alert.alert(
        'Could not send',
        e instanceof Error ? e.message : 'Check emulator connection.'
      );
    } finally {
      setSending(false);
    }
  }, [chatId, userId, input]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.senderId === userId;
      const sender = members[item.senderId];
      const displayName = sender?.displayName ?? '…';

      return (
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
                {item.content}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [userId, members, chat?.type]
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
        <View style={{ flex: 1 }}>
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
                    backgroundColor: peerLocation
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
        </View>

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
          />
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
            disabled={sending || !input.trim()}
            activeOpacity={0.8}
            style={{
              height: 40,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor:
                sending || !input.trim()
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
    </View>
  );
}
