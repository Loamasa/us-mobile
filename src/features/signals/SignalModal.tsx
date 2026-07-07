import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { auth } from '@/config/firebase';
import { setCurrentSignal } from '@/lib/firestore';
import { expiryFromDuration } from '@/features/broadcasts/BroadcastComposerModal';
import { SIGNAL_PRESETS, SIGNAL_DURATIONS, COLORS } from '@/config/constants';
import type { UserSignal } from '@/types';

interface SignalModalProps {
  visible: boolean;
  /** Prefills the form when editing an already-active signal. */
  activeSignal: UserSignal | null;
  onClose: () => void;
}

const DEFAULT_EMOJI = '👋';
const FALLBACK_TEXT = 'Hanging out';

// "5h 12m left" for the keep-current-expiry chip (HUD-style).
function timeLeftLabel(expiresAt: UserSignal['expiresAt']): string {
  const diff = expiresAt.toDate().getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

/**
 * Signal setter (prototype: SignalModal) — "I'm up for X" broadcast to all
 * friends, displayed on your map marker + the ActiveSignalHUD until it
 * expires. Audience is always all friends for now (no close-friends tier).
 * Signals never store location (see setCurrentSignal), so ghost mode does
 * not gate this — a ghost's signal simply has no marker to ride until they
 * turn sharing back on (named-group resting pins still tint it).
 */
export default function SignalModal({
  visible,
  activeSignal,
  onClose,
}: SignalModalProps) {
  const [emoji, setEmoji] = useState<string>(DEFAULT_EMOJI);
  const [text, setText] = useState<string>('');
  const [durationIndex, setDurationIndex] = useState(0);
  // Editing defaults to keeping the running expiry — picking a duration
  // opts out. Without this, every text tweak silently reset the TTL.
  const [keepExpiry, setKeepExpiry] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const userId = auth.currentUser?.uid;
  // The keep option only exists while the signal it would keep still runs.
  const keepable = !!activeSignal;
  const keeping = keepExpiry && keepable;

  // Reset per open; an active signal prefills for editing.
  useEffect(() => {
    if (visible) {
      setEmoji(activeSignal?.emoji ?? DEFAULT_EMOJI);
      setText(activeSignal?.text ?? '');
      setDurationIndex(0);
      setKeepExpiry(!!activeSignal);
      setError('');
    }
    // Prefill captures the signal as of opening — don't re-run mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSubmit = async () => {
    if (!userId || sending) return;
    // Keep the running expiry when editing, unless it lapsed mid-edit —
    // then fall back to the selected duration so the write is never dead.
    const kept = keeping ? activeSignal!.expiresAt.toDate() : null;
    const expiresAt =
      kept && kept.getTime() > Date.now()
        ? kept
        : expiryFromDuration(SIGNAL_DURATIONS[durationIndex].ms);
    setSending(true);
    setError('');
    try {
      await setCurrentSignal(userId, {
        emoji: emoji.trim() || DEFAULT_EMOJI,
        text: text.trim() || FALLBACK_TEXT,
        expiresAt,
      });
      onClose();
    } catch (err) {
      console.error('setCurrentSignal failed:', err);
      setError('Could not broadcast the signal. Check the connection.');
    } finally {
      setSending(false);
    }
  };

  return (
    // RNW never finishes the slide-close animation in the browser — the sheet
    // sticks on screen with visible=false. Animate on native only.
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View className="bg-void border-t border-glass-border rounded-t-3xl">
          <ScrollView
            className="px-6 pt-6"
            style={{ maxHeight: 560 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-fog text-xl font-bold">
                {activeSignal ? 'Update your signal' : 'Send a signal'}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Text className="text-fog/50 text-2xl">✕</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-fog/50 text-sm mb-4">
              Tell your friends what you're up for. It shows on your map marker
              while you're visible, until it expires.
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
                      ? 'border-signal bg-signal/10'
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
                placeholder="What are you doing?"
                placeholderTextColor="rgba(242, 244, 246, 0.3)"
                value={text}
                onChangeText={setText}
                maxLength={30}
              />
            </View>

            {/* Duration — editing offers "keep what's left" first */}
            <Text className="text-fog/50 text-xs uppercase tracking-widest mb-2">
              Duration
            </Text>
            {keepable && (
              <TouchableOpacity
                onPress={() => setKeepExpiry(true)}
                className={`rounded-xl py-3 items-center border mb-2 ${
                  keeping
                    ? 'border-signal bg-signal/10'
                    : 'border-glass-border bg-glass'
                }`}
              >
                <Text
                  className={`text-sm ${keeping ? 'text-signal' : 'text-fog/50'}`}
                >
                  Keep current · {timeLeftLabel(activeSignal!.expiresAt)}
                </Text>
              </TouchableOpacity>
            )}
            <View className="flex-row gap-2 mb-4">
              {SIGNAL_DURATIONS.map((duration, i) => (
                <TouchableOpacity
                  key={duration.label}
                  onPress={() => {
                    setKeepExpiry(false);
                    setDurationIndex(i);
                  }}
                  className={`flex-1 rounded-xl py-3 items-center border ${
                    !keeping && durationIndex === i
                      ? 'border-signal bg-signal/10'
                      : 'border-glass-border bg-glass'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      !keeping && durationIndex === i
                        ? 'text-signal'
                        : 'text-fog/50'
                    }`}
                  >
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Audience — fixed to all friends until a close-friends tier exists */}
            <View className="flex-row items-center justify-between rounded-2xl border border-glass-border bg-glass px-4 py-3.5 mb-4">
              <View className="flex-1 mr-3">
                <Text className="text-fog text-base font-bold">All friends</Text>
                <Text className="text-fog/40 text-xs mt-0.5">
                  Everyone you've added sees this signal.
                </Text>
              </View>
            </View>

            {error ? (
              <Text className="text-rose text-sm text-center mb-3">{error}</Text>
            ) : null}

            {/* CTA */}
            <View className="pb-6">
              <TouchableOpacity
                className={`rounded-2xl py-4 items-center ${
                  sending ? 'bg-signal/30' : 'bg-signal'
                }`}
                onPress={handleSubmit}
                disabled={sending}
              >
                <Text className="text-fog font-bold text-base">
                  {sending ? 'Broadcasting…' : '⚡ Broadcast to Friends'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
