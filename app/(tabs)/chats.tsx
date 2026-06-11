import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import {
  onFriends,
  onFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  onUserProfile,
  onLocation,
  onChats,
  getOrCreateDmChat,
  getOrCreateGroupChat,
} from '@/lib/firestore';
import type { ChatSummary, Friend, FriendRequest, UserProfile } from '@/types';
import GlassCard from '@/components/ui/GlassCard';
import UserAvatar from '@/components/UserAvatar';
import {
  SearchIcon,
  UserPlusIcon,
  SettingsIcon,
  MessageSquareIcon,
  XIcon,
  CheckIcon,
} from '@/components/ui/icons';
import { COLORS } from '@/config/constants';

type ChatRow = {
  chat: ChatSummary;
  title: string;
  subtitle: string;
  timestampLabel: string;
  peerId?: string;
  peerVisible?: boolean;
};

function formatTimestamp(t: Timestamp | null | undefined): string {
  if (!t) return '';
  const now = Date.now();
  const then = t.toMillis();
  const diffMs = now - then;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(then).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function ChatsScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | undefined>(
    auth.currentUser?.uid
  );

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [handleInput, setHandleInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  // Set to the @handle after a request goes out — swaps the modal body to a
  // styled success state (no native Alert), then auto-dismisses.
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Single Messenger-style composer: pick 1+ friends in a "To:" list.
  // 1 selected → DM, 2+ → group (optional name).
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [composeSearch, setComposeSearch] = useState('');
  const [composeBusy, setComposeBusy] = useState(false);

  // Track auth — re-wire subscriptions on account switch.
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? undefined));
  }, []);

  // Auto-dismiss the add-friend success state.
  useEffect(() => {
    if (!addSuccess) return;
    const timer = setTimeout(() => {
      setShowAddModal(false);
      setAddSuccess(null);
    }, 1600);
    return () => clearTimeout(timer);
  }, [addSuccess]);

  useEffect(() => {
    setChats([]);
    if (!userId) return;
    return onChats(userId, setChats);
  }, [userId]);

  useEffect(() => {
    setFriends([]);
    if (!userId) return;
    return onFriends(userId, setFriends);
  }, [userId]);

  useEffect(() => {
    setRequests([]);
    if (!userId) return;
    return onFriendRequests(userId, setRequests);
  }, [userId]);

  // Stable string key for the set of user ids that need profile subscriptions
  // (DM peers + friends + request senders + group members). Using a joined
  // string rather than the array keeps the subscription effect from tearing
  // down and re-creating N listeners on every onSnapshot fire.
  const profileIdKey = useMemo(() => {
    const set = new Set<string>();
    friends.forEach((f) => set.add(f.userId));
    requests.forEach((r) => set.add(r.fromUserId));
    chats.forEach((c) => {
      c.memberIds.forEach((id) => {
        if (id !== userId) set.add(id);
      });
    });
    return Array.from(set).sort().join('|');
  }, [friends, requests, chats, userId]);

  useEffect(() => {
    if (!profileIdKey) {
      setProfiles({});
      return;
    }
    const ids = profileIdKey.split('|');
    const unsubs = ids.map((id) =>
      onUserProfile(id, (p) => {
        setProfiles((prev) => {
          if (!p) {
            if (!(id in prev)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          }
          return { ...prev, [id]: p };
        });
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [profileIdKey]);

  // Same stable-key trick for presence (friends + DM peers).
  const presenceIdKey = useMemo(() => {
    const set = new Set<string>();
    friends.forEach((f) => set.add(f.userId));
    chats
      .filter((c) => c.type === 'DM')
      .forEach((c) => {
        c.memberIds.forEach((id) => {
          if (id !== userId) set.add(id);
        });
      });
    return Array.from(set).sort().join('|');
  }, [friends, chats, userId]);

  useEffect(() => {
    if (!presenceIdKey) {
      setVisibleIds(new Set());
      return;
    }
    const ids = presenceIdKey.split('|');
    const unsubs = ids.map((id) =>
      onLocation(id, (loc) => {
        setVisibleIds((prev) => {
          const has = prev.has(id);
          if (loc && !has) {
            const next = new Set(prev);
            next.add(id);
            return next;
          }
          if (!loc && has) {
            const next = new Set(prev);
            next.delete(id);
            return next;
          }
          return prev;
        });
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [presenceIdKey]);

  // Build view model — resolve DM titles/avatars from peer profile.
  const chatRows: ChatRow[] = useMemo(() => {
    if (!userId) return [];
    return chats.map<ChatRow>((chat) => {
      if (chat.type === 'DM') {
        const peerId = chat.memberIds.find((id) => id !== userId);
        const peer = peerId ? profiles[peerId] : undefined;
        return {
          chat,
          title: peer?.displayName ?? 'Unknown',
          subtitle: chat.lastMessage ?? 'Say hi…',
          timestampLabel: formatTimestamp(chat.lastMessageAt ?? chat.createdAt),
          peerId,
          peerVisible: peerId ? visibleIds.has(peerId) : false,
        };
      }
      const memberCount = chat.memberIds.length;
      return {
        chat,
        title: chat.name ?? 'Group',
        subtitle:
          chat.lastMessage ??
          `${memberCount} member${memberCount === 1 ? '' : 's'}`,
        timestampLabel: formatTimestamp(chat.lastMessageAt ?? chat.createdAt),
      };
    });
  }, [chats, profiles, visibleIds, userId]);

  const filteredChats: ChatRow[] = searchQuery.trim()
    ? chatRows.filter((row) => {
        const q = searchQuery.toLowerCase();
        return (
          row.title.toLowerCase().includes(q) ||
          row.subtitle.toLowerCase().includes(q)
        );
      })
    : chatRows;

  // Compose: friends filtered for picker
  const friendsForPicker = useMemo(() => {
    const q = composeSearch.trim().toLowerCase();
    return friends
      .map((f) => ({ friend: f, profile: profiles[f.userId] }))
      .filter(({ profile }) =>
        !q
          ? true
          : (profile?.displayName?.toLowerCase().includes(q) ?? false) ||
            (profile?.handle?.toLowerCase().includes(q) ?? false)
      );
  }, [friends, profiles, composeSearch]);

  // Handlers
  const handleAddFriend = async () => {
    if (!userId || !handleInput.trim()) return;
    const sanitized = handleInput
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .replace(/^@/, '');
    setAddLoading(true);
    setAddError('');
    try {
      const handleDoc = await getDoc(doc(db, 'handles', sanitized));
      if (!handleDoc.exists()) {
        setAddError('User not found');
        return;
      }
      const targetUserId = handleDoc.data().userId;
      if (targetUserId === userId) {
        setAddError("That's you!");
        return;
      }
      await sendFriendRequest(userId, targetUserId);
      setHandleInput('');
      setAddSuccess(sanitized);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAccept = async (request: FriendRequest) => {
    if (!userId) return;
    await acceptFriendRequest(userId, request.id, request.fromUserId);
  };

  const handleReject = async (request: FriendRequest) => {
    if (!userId) return;
    await rejectFriendRequest(userId, request.id);
  };

  const openCompose = () => {
    setGroupName('');
    setSelectedFriendIds([]);
    setComposeSearch('');
    setShowComposeModal(true);
  };

  const closeCompose = () => {
    setShowComposeModal(false);
    setGroupName('');
    setSelectedFriendIds([]);
    setComposeSearch('');
  };

  const handleComposeSubmit = async () => {
    if (!userId || composeBusy || selectedFriendIds.length === 0) return;
    setComposeBusy(true);
    try {
      let chatId: string;
      if (selectedFriendIds.length === 1) {
        chatId = await getOrCreateDmChat({
          viewerId: userId,
          peerId: selectedFriendIds[0],
        });
      } else {
        // Group name is optional — default to the members' first names.
        const name =
          groupName.trim() ||
          selectedFriendIds
            .map((id) => profiles[id]?.displayName?.split(' ')[0] ?? '?')
            .join(', ');
        chatId = await getOrCreateGroupChat({
          memberIds: [userId, ...selectedFriendIds],
          createdBy: userId,
          name,
        });
      }
      closeCompose();
      router.push(`/chat/${chatId}`);
    } catch (e) {
      Alert.alert('Could not start chat', e instanceof Error ? e.message : '');
    } finally {
      setComposeBusy(false);
    }
  };

  const toggleSelectedFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <View className="flex-1 bg-void pt-16 px-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4 px-1">
        <Text className="text-fog text-2xl font-bold">Chats</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            onPress={openCompose}
            style={{ padding: 8 }}
            hitSlop={8}
          >
            <MessageSquareIcon size={22} color={COLORS.fog} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={{ padding: 8 }}
            hitSlop={8}
          >
            <UserPlusIcon size={20} color={COLORS.fog} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => router.push('/(tabs)/settings')}
            hitSlop={8}
          >
            <SettingsIcon size={22} color="rgba(242,244,246,0.5)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginBottom: 16,
          gap: 10,
        }}
      >
        <SearchIcon size={16} color="#6B7280" />
        <TextInput
          style={{ flex: 1, color: '#F2F4F6', fontSize: 15 }}
          placeholder="Search chats…"
          placeholderTextColor="rgba(242,244,246,0.3)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Friend requests */}
      {requests.length > 0 && (
        <View className="mb-6">
          <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-1">
            Pending ({requests.length})
          </Text>
          {requests.map((req) => {
            const profile = profiles[req.fromUserId];
            return (
              <GlassCard key={req.id} className="mb-2 flex-row items-center">
                <UserAvatar
                  displayName={profile?.displayName}
                  size="md"
                  showStatus
                  status="online"
                />
                <View className="flex-1 ml-3">
                  <Text className="text-fog font-semibold">
                    {profile?.displayName ?? 'Unknown'}
                  </Text>
                  <Text className="text-fog/50 text-xs">
                    @{profile?.handle ?? '…'}
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-mint/20 rounded-lg px-3 py-2 mr-2"
                  onPress={() => handleAccept(req)}
                >
                  <Text className="text-mint text-xs font-semibold">Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-glass border border-glass-border rounded-lg px-3 py-2"
                  onPress={() => handleReject(req)}
                >
                  <Text className="text-fog/50 text-xs">Ignore</Text>
                </TouchableOpacity>
              </GlassCard>
            );
          })}
        </View>
      )}

      {/* Chats list */}
      <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-1">
        {searchQuery
          ? `Results (${filteredChats.length})`
          : `Chats (${chatRows.length})`}
      </Text>

      {filteredChats.length === 0 ? (
        <View className="flex-1 items-center justify-center pb-16">
          <MessageSquareIcon size={48} color="rgba(242,244,246,0.15)" />
          <Text className="text-fog/40 text-base text-center mt-4">
            {searchQuery ? 'No matches found' : 'No chats yet'}
          </Text>
          <Text className="text-fog/25 text-sm text-center mt-1 mb-4 px-8">
            {searchQuery
              ? 'Try a different search'
              : friends.length > 0
                ? 'Start a conversation with a friend'
                : 'Add your first friend by their @handle — ask them for it.'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              onPress={friends.length > 0 ? openCompose : () => setShowAddModal(true)}
              style={{
                backgroundColor: COLORS.signal,
                borderRadius: 999,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: COLORS.fog, fontWeight: '600', fontSize: 14 }}>
                {friends.length > 0 ? 'New Message' : 'Add Friend'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.chat.id}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-24"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/chat/${item.chat.id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <GlassCard className="mb-2 flex-row items-center">
                <UserAvatar
                  displayName={item.title}
                  size="md"
                  showStatus={item.chat.type === 'DM'}
                  status={item.peerVisible ? 'online' : 'offline'}
                />
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-fog font-semibold flex-1"
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.timestampLabel ? (
                      <Text className="text-fog/40 text-xs ml-2">
                        {item.timestampLabel}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row items-center mt-0.5">
                    {item.chat.type === 'GROUP' && (
                      <View
                        style={{
                          backgroundColor: 'rgba(46,92,255,0.15)',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginRight: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: COLORS.signal,
                            fontSize: 9,
                            fontWeight: '800',
                            letterSpacing: 0.5,
                          }}
                        >
                          GROUP
                        </Text>
                      </View>
                    )}
                    <Text
                      className="text-fog/50 text-xs flex-1"
                      numberOfLines={1}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          )}
        />
      )}

      {/* Add Friend modal (by handle) */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 justify-end">
          {addSuccess ? (
            <View className="bg-void border-t border-glass-border rounded-t-3xl p-6 items-center">
              <View className="w-14 h-14 rounded-full bg-mint/15 border border-mint/40 items-center justify-center mb-4 mt-2">
                <CheckIcon size={26} color={COLORS.mint} />
              </View>
              <Text className="text-fog text-xl font-bold mb-1">Request sent</Text>
              <Text className="text-fog/40 text-sm mb-4">
                @{addSuccess} will see it in their chats.
              </Text>
            </View>
          ) : (
          <View className="bg-void border-t border-glass-border rounded-t-3xl p-6">
            <Text className="text-fog text-xl font-bold mb-1">Add Friend</Text>
            <Text className="text-fog/40 text-sm mb-5">Search by their handle</Text>

            <View className="bg-glass border border-glass-border rounded-2xl px-4 py-4 flex-row items-center mb-4">
              <Text className="text-fog/50 text-lg mr-1">@</Text>
              <TextInput
                className="flex-1 text-fog text-lg"
                placeholder="theirhandle"
                placeholderTextColor="rgba(242,244,246,0.3)"
                value={handleInput}
                onChangeText={setHandleInput}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            {addError ? (
              <Text className="text-red-400 text-sm text-center mb-4">{addError}</Text>
            ) : null}

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-2xl py-4 items-center border border-glass-border"
                onPress={() => {
                  setShowAddModal(false);
                  setHandleInput('');
                  setAddError('');
                }}
              >
                <Text className="text-fog/50 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-2xl py-4 items-center ${addLoading ? 'bg-signal/50' : 'bg-signal'}`}
                onPress={handleAddFriend}
                disabled={addLoading}
              >
                <Text className="text-fog font-semibold">
                  {addLoading ? 'Sending…' : 'Send Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          )}
        </View>
      </Modal>

      {/* Compose modal (new DM / new group) */}
      <Modal visible={showComposeModal} transparent animationType="slide">
        <View className="flex-1 justify-end">
          <View
            style={{
              backgroundColor: COLORS.void,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTopWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 24,
              maxHeight: '85%',
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-fog text-xl font-bold">New Message</Text>
              <TouchableOpacity onPress={closeCompose} hitSlop={10}>
                <XIcon size={20} color="rgba(242,244,246,0.5)" />
              </TouchableOpacity>
            </View>

            {/* To: selected-friend chips (tap a chip to remove) */}
            <View className="flex-row flex-wrap items-center mb-3" style={{ gap: 6 }}>
              <Text className="text-fog/40 text-sm font-semibold mr-1">To:</Text>
              {selectedFriendIds.length === 0 ? (
                <Text className="text-fog/25 text-sm">Select friends below</Text>
              ) : (
                selectedFriendIds.map((id) => (
                  <TouchableOpacity
                    key={id}
                    onPress={() => toggleSelectedFriend(id)}
                    className="flex-row items-center bg-signal/15 border border-signal/40 rounded-full px-3 py-1.5"
                    style={{ gap: 6 }}
                  >
                    <Text className="text-signal text-xs font-bold">
                      {profiles[id]?.displayName?.split(' ')[0] ?? '…'}
                    </Text>
                    <XIcon size={11} color={COLORS.signal} />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Group name — appears once it's a group (2+ recipients) */}
            {selectedFriendIds.length >= 2 && (
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group name (optional)"
                placeholderTextColor="rgba(242,244,246,0.3)"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: COLORS.fog,
                  fontSize: 15,
                  marginBottom: 12,
                }}
              />
            )}

            {/* Friend search */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                gap: 8,
                marginBottom: 12,
              }}
            >
              <SearchIcon size={14} color="#6B7280" />
              <TextInput
                style={{ flex: 1, color: COLORS.fog, fontSize: 14 }}
                placeholder="Search friends"
                placeholderTextColor="rgba(242,244,246,0.3)"
                value={composeSearch}
                onChangeText={setComposeSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {friends.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                <Text className="text-fog/40 text-sm text-center">
                  No friends yet. Add someone first.
                </Text>
              </View>
            ) : friendsForPicker.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                <Text className="text-fog/40 text-sm text-center">No matches</Text>
              </View>
            ) : (
              <FlatList
                data={friendsForPicker}
                keyExtractor={(item) => item.friend.userId}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 320 }}
                renderItem={({ item }) => {
                  const selected = selectedFriendIds.includes(item.friend.userId);
                  return (
                    // Layout lives on the inner className View, NOT in the
                    // Pressable's function style — function-style layout props
                    // get dropped on native (rows rendered stacked on device).
                    <Pressable
                      onPress={() => toggleSelectedFriend(item.friend.userId)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    >
                    <View
                      className={`flex-row items-center rounded-xl px-1.5 py-2.5 ${
                        selected ? 'bg-signal/10' : ''
                      }`}
                    >
                      <UserAvatar
                        displayName={item.profile?.displayName}
                        size="sm"
                        showStatus
                        status={
                          visibleIds.has(item.friend.userId) ? 'online' : 'offline'
                        }
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text
                          style={{ color: COLORS.fog, fontSize: 14, fontWeight: '600' }}
                        >
                          {item.profile?.displayName ?? 'Loading…'}
                        </Text>
                        <Text
                          style={{ color: 'rgba(242,244,246,0.45)', fontSize: 11 }}
                        >
                          @{item.profile?.handle ?? '…'}
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1.5,
                          borderColor: selected ? COLORS.signal : 'rgba(255,255,255,0.25)',
                          backgroundColor: selected ? COLORS.signal : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {selected && (
                          <Text
                            style={{ color: COLORS.fog, fontSize: 12, fontWeight: '700' }}
                          >
                            ✓
                          </Text>
                        )}
                      </View>
                    </View>
                    </Pressable>
                  );
                }}
              />
            )}

            {/* Adaptive footer CTA: 1 recipient → DM, 2+ → group chat */}
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                onPress={handleComposeSubmit}
                disabled={composeBusy || selectedFriendIds.length === 0}
                style={{
                  backgroundColor:
                    composeBusy || selectedFriendIds.length === 0
                      ? 'rgba(46,92,255,0.3)'
                      : COLORS.signal,
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{ color: COLORS.fog, fontWeight: '700', fontSize: 14 }}
                >
                  {composeBusy
                    ? 'Starting…'
                    : selectedFriendIds.length >= 2
                      ? `Start Group Chat (${selectedFriendIds.length})`
                      : 'Message'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
