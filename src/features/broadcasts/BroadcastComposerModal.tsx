import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { auth } from '@/config/firebase';
import { onFriends, onUserProfile, createBroadcast } from '@/lib/firestore';
import UserAvatar from '@/components/UserAvatar';
import { SearchIcon } from '@/components/ui/icons';
import {
  SIGNAL_PRESETS,
  SIGNAL_DURATIONS,
  BROADCAST_RADIUS,
  COLORS,
} from '@/config/constants';
import type { Friend, UserProfile } from '@/types';

interface BroadcastComposerModalProps {
  visible: boolean;
  /** Where the pin goes — chosen by tapping the map (placement mode or long-press). */
  coordinate: { lat: number; lng: number } | null;
  onClose: () => void;
  onCreated?: (broadcastId: string) => void;
}

/**
 * Gathering composer (FEATURES.md #1). The pin is always placed at a
 * map-chosen coordinate — never implicitly at your GPS position.
 * - Group Gathering OFF (default): a solo gathering — every friend can see
 *   the spot and whether you're physically there (like a temporary spot).
 * - Group Gathering ON: pick invitees (searchable, like the chat composer);
 *   only members + invitees see the pin, invitees accept to join.
 */
export default function BroadcastComposerModal({
  visible,
  coordinate,
  onClose,
  onCreated,
}: BroadcastComposerModalProps) {
  const [emoji, setEmoji] = useState<string>(SIGNAL_PRESETS[0].emoji);
  const [text, setText] = useState<string>(SIGNAL_PRESETS[0].text);
  const [durationIndex, setDurationIndex] = useState(0);
  const [groupGathering, setGroupGathering] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const userId = auth.currentUser?.uid;

  // Reset per placement.
  useEffect(() => {
    if (visible) {
      setEmoji(SIGNAL_PRESETS[0].emoji);
      setText(SIGNAL_PRESETS[0].text);
      setDurationIndex(0);
      setGroupGathering(false);
      setSelectedIds([]);
      setSearch('');
      setError('');
    }
  }, [visible]);

  useEffect(() => {
    setFriends([]);
    if (!visible || !userId) return;
    return onFriends(userId, setFriends);
  }, [visible, userId]);

  const friendIdKey = useMemo(
    () => friends.map((f) => f.userId).sort().join('|'),
    [friends]
  );

  useEffect(() => {
    if (!friendIdKey) return;
    const unsubs = friendIdKey.split('|').map((id) =>
      onUserProfile(id, (profile) => {
        if (!profile) return;
        setProfiles((prev) => ({ ...prev, [id]: profile }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [friendIdKey]);

  // Searchable picker, same semantics as the chat composer.
  const friendsForPicker = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const p = profiles[f.userId];
      return (
        (p?.displayName?.toLowerCase().includes(q) ?? false) ||
        (p?.handle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [friends, profiles, search]);

  const toggleFriend = (id: string) => {
    setError('');
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePlace = async () => {
    if (!userId || !coordinate || sending) return;
    if (!text.trim()) {
      setError('Give the gathering a few words.');
      return;
    }
    if (groupGathering && selectedIds.length === 0) {
      setError('Invite at least one friend, or switch off Group Gathering.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const duration = SIGNAL_DURATIONS[durationIndex];
      let expiresAt: Date;
      if (duration.ms === 0) {
        // "Until Tonight" — 23:59 today
        expiresAt = new Date();
        expiresAt.setHours(23, 59, 0, 0);
      } else {
        expiresAt = new Date(Date.now() + duration.ms);
      }

      const id = await createBroadcast({
        createdBy: userId,
        emoji,
        text: text.trim(),
        location: { latitude: coordinate.lat, longitude: coordinate.lng },
        radius: BROADCAST_RADIUS,
        expiresAt,
        visibility: groupGathering ? 'MEMBERS' : 'FRIENDS',
        invitedIds: groupGathering ? selectedIds : [],
      });
      onCreated?.(id);
      onClose();
    } catch (err) {
      console.error('createBroadcast failed:', err);
      setError('Could not place the gathering. Check the connection.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View className="bg-void border-t border-glass-border rounded-t-3xl">
          <ScrollView
            className="px-6 pt-6"
            style={{ maxHeight: 620 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-fog text-xl font-bold">Gathering</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Text className="text-fog/50 text-2xl">✕</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-fog/50 text-sm mb-4">
              {groupGathering
                ? 'Invited friends must accept to join — only the crew sees this spot and who is there.'
                : 'Pin this spot for your friends — they can see it and whether you are there.'}
            </Text>

            {/* Emoji Presets */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {SIGNAL_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.emoji}
                  onPress={() => {
                    setEmoji(preset.emoji);
                    setText(preset.text);
                  }}
                  className={`mr-2 px-4 py-3 rounded-xl border ${
                    emoji === preset.emoji
                      ? 'border-rose bg-rose/10'
                      : 'border-glass-border bg-glass'
                  }`}
                >
                  <Text className="text-2xl text-center">{preset.emoji}</Text>
                  <Text className="text-fog/50 text-xs text-center mt-1">
                    {preset.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Custom Text */}
            <View className="bg-glass border border-glass-border rounded-2xl px-4 py-3 mb-4 flex-row items-center">
              <Text className="text-2xl mr-3">{emoji}</Text>
              <TextInput
                className="flex-1 text-fog text-base"
                placeholder="What's happening here?"
                placeholderTextColor="rgba(242, 244, 246, 0.3)"
                value={text}
                onChangeText={setText}
                maxLength={30}
              />
            </View>

            {/* Duration */}
            <Text className="text-fog/50 text-xs uppercase tracking-widest mb-2">
              Duration
            </Text>
            <View className="flex-row gap-2 mb-4">
              {SIGNAL_DURATIONS.map((duration, i) => (
                <TouchableOpacity
                  key={duration.label}
                  onPress={() => setDurationIndex(i)}
                  className={`flex-1 rounded-xl py-3 items-center border ${
                    durationIndex === i
                      ? 'border-rose bg-rose/10'
                      : 'border-glass-border bg-glass'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      durationIndex === i ? 'text-rose' : 'text-fog/50'
                    }`}
                  >
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Group Gathering toggle */}
            <TouchableOpacity
              onPress={() => {
                setError('');
                setGroupGathering((v) => !v);
              }}
              activeOpacity={0.8}
              className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 mb-4 ${
                groupGathering
                  ? 'border-rose bg-rose/10'
                  : 'border-glass-border bg-glass'
              }`}
            >
              <View className="flex-1 mr-3">
                <Text
                  className={`text-base font-bold ${
                    groupGathering ? 'text-rose' : 'text-fog'
                  }`}
                >
                  Group Gathering
                </Text>
                <Text className="text-fog/40 text-xs mt-0.5">
                  Invite friends — they accept to join, and only the crew sees it.
                </Text>
              </View>
              {/* Toggle pill */}
              <View
                style={{
                  width: 46,
                  height: 26,
                  borderRadius: 13,
                  padding: 3,
                  backgroundColor: groupGathering
                    ? COLORS.rose
                    : 'rgba(255,255,255,0.12)',
                  alignItems: groupGathering ? 'flex-end' : 'flex-start',
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: groupGathering ? '#0F1115' : COLORS.fog,
                  }}
                />
              </View>
            </TouchableOpacity>

            {/* Invite picker — only when Group Gathering is on */}
            {groupGathering && (
              <>
                <Text className="text-fog/50 text-xs uppercase tracking-widest mb-2">
                  Invite Friends
                  {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                </Text>
                {friends.length === 0 ? (
                  <Text className="text-fog/30 text-sm mb-4">
                    No friends to invite yet.
                  </Text>
                ) : (
                  <>
                    {/* Search, same as the chat composer */}
                    <View className="flex-row items-center bg-glass border border-glass-border rounded-xl px-3 py-2 mb-2">
                      <SearchIcon size={14} color="#6B7280" />
                      <TextInput
                        className="flex-1 ml-2 text-fog text-sm"
                        placeholder="Search friends"
                        placeholderTextColor="rgba(242,244,246,0.3)"
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <View className="mb-4">
                      {friendsForPicker.length === 0 ? (
                        <Text className="text-fog/30 text-sm text-center py-3">
                          No matches
                        </Text>
                      ) : (
                        friendsForPicker.map((f) => {
                          const selected = selectedIds.includes(f.userId);
                          return (
                            <TouchableOpacity
                              key={f.userId}
                              onPress={() => toggleFriend(f.userId)}
                              activeOpacity={0.7}
                              className={`flex-row items-center rounded-xl px-1.5 py-2 ${
                                selected ? 'bg-rose/10' : ''
                              }`}
                            >
                              <UserAvatar
                                displayName={profiles[f.userId]?.displayName ?? '?'}
                                size="sm"
                              />
                              <View className="flex-1 ml-2.5">
                                <Text className="text-fog text-sm font-semibold">
                                  {profiles[f.userId]?.displayName ?? 'Loading…'}
                                </Text>
                                <Text className="text-fog/40 text-xs">
                                  @{profiles[f.userId]?.handle ?? '…'}
                                </Text>
                              </View>
                              <View
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 11,
                                  borderWidth: 1.5,
                                  borderColor: selected
                                    ? COLORS.rose
                                    : 'rgba(255,255,255,0.25)',
                                  backgroundColor: selected
                                    ? COLORS.rose
                                    : 'transparent',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {selected && (
                                  <Text
                                    style={{
                                      color: '#0F1115',
                                      fontSize: 12,
                                      fontWeight: '700',
                                    }}
                                  >
                                    ✓
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </>
                )}
              </>
            )}

            {error ? (
              <Text className="text-rose text-sm text-center mb-3">{error}</Text>
            ) : null}

            {/* CTA */}
            <View className="pb-6">
              <TouchableOpacity
                className={`rounded-2xl py-4 items-center ${
                  sending ? 'bg-rose/30' : 'bg-rose'
                }`}
                onPress={handlePlace}
                disabled={sending}
              >
                <Text className="text-void font-bold text-base">
                  {sending
                    ? 'Placing…'
                    : groupGathering
                      ? `📍 Place Group Gathering${
                          selectedIds.length > 0
                            ? ` · invite ${selectedIds.length}`
                            : ''
                        }`
                      : '📍 Place Gathering'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
