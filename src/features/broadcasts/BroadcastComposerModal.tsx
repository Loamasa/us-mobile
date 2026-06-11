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
import { GeoPoint, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { onFriends, onUserProfile, createBroadcast } from '@/lib/firestore';
import UserAvatar from '@/components/UserAvatar';
import {
  SIGNAL_PRESETS,
  SIGNAL_DURATIONS,
  BROADCAST_RADIUS,
  COLORS,
} from '@/config/constants';
import type { Friend, UserProfile } from '@/types';

interface BroadcastComposerModalProps {
  visible: boolean;
  /** Where the pin goes (map long-press, or your position via the button). */
  coordinate: { lat: number; lng: number } | null;
  onClose: () => void;
  onCreated?: (broadcastId: string) => void;
}

/**
 * THE broadcast composer — one mental model (FEATURES.md #1):
 * - zero invitees  → the personal signal (status on your own pin, visible to
 *   every friend who can see you; coordinate saved as opportunistic metadata)
 * - 1+ invitees    → a pinned group broadcast at `coordinate` that invitees
 *   must accept to join (member-only pin + roster)
 * Replaces the old SignalModal — the map's rose button opens this.
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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const userId = auth.currentUser?.uid;

  // Reset per placement.
  useEffect(() => {
    if (visible) {
      setEmoji(SIGNAL_PRESETS[0].emoji);
      setText(SIGNAL_PRESETS[0].text);
      setDurationIndex(0);
      setSelectedIds([]);
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

  const toggleFriend = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePlace = async () => {
    if (!userId || sending) return;
    if (!text.trim()) {
      setError('Give the broadcast a few words.');
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

      if (selectedIds.length === 0) {
        // Solo = the personal signal: a status on YOUR pin, visible to every
        // friend who can see you. Location is opportunistic metadata only —
        // never gate on it.
        await updateDoc(doc(db, 'users', userId), {
          currentSignal: {
            emoji,
            text: text.trim(),
            expiresAt: Timestamp.fromDate(expiresAt),
            location: coordinate
              ? new GeoPoint(coordinate.lat, coordinate.lng)
              : null,
          },
        });
      } else {
        if (!coordinate) return;
        const id = await createBroadcast({
          createdBy: userId,
          emoji,
          text: text.trim(),
          location: { latitude: coordinate.lat, longitude: coordinate.lng },
          radius: BROADCAST_RADIUS,
          expiresAt,
          invitedIds: selectedIds,
        });
        onCreated?.(id);
      }
      onClose();
    } catch (err) {
      console.error('broadcast failed:', err);
      setError('Could not broadcast. Check the connection.');
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
              <Text className="text-fog text-xl font-bold">Broadcast</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Text className="text-fog/50 text-2xl">✕</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-fog/50 text-sm mb-4">
              Solo, it's a status signal on your pin. Invite friends and it
              becomes a pinned meetup here — they accept to join, and only the
              crew sees it.
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

            {/* Invite picker */}
            <Text className="text-fog/50 text-xs uppercase tracking-widest mb-2">
              Invite Friends{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </Text>
            {friends.length === 0 ? (
              <Text className="text-fog/30 text-sm mb-4">
                No friends yet — this broadcasts as your status signal.
              </Text>
            ) : (
              <View className="mb-4">
                {friends.map((f) => {
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
                      <Text className="flex-1 ml-2.5 text-fog text-sm font-semibold">
                        {profiles[f.userId]?.displayName ?? 'Loading…'}
                      </Text>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1.5,
                          borderColor: selected ? COLORS.rose : 'rgba(255,255,255,0.25)',
                          backgroundColor: selected ? COLORS.rose : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {selected && (
                          <Text style={{ color: '#0F1115', fontSize: 12, fontWeight: '700' }}>
                            ✓
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
                    ? 'Broadcasting…'
                    : selectedIds.length > 0
                      ? `📡 Place Broadcast · invite ${selectedIds.length}`
                      : '📡 Broadcast Signal'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
