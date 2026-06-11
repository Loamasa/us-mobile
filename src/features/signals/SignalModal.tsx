import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { GeoPoint, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { SIGNAL_PRESETS, SIGNAL_DURATIONS } from '@/config/constants';

interface SignalModalProps {
  visible: boolean;
  onClose: () => void;
  currentLocation: { lat: number; lng: number } | null;
}

export default function SignalModal({
  visible,
  onClose,
  currentLocation,
}: SignalModalProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>(SIGNAL_PRESETS[0].emoji);
  const [customText, setCustomText] = useState<string>(SIGNAL_PRESETS[0].text);
  const [durationIndex, setDurationIndex] = useState(0);
  const [sending, setSending] = useState(false);

  const handlePresetSelect = (emoji: string, text: string) => {
    setSelectedEmoji(emoji);
    setCustomText(text);
  };

  const handleBroadcast = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setSending(true);
    try {
      const duration = SIGNAL_DURATIONS[durationIndex];
      let expiresAt: Date;

      if (duration.ms === 0) {
        // "Until Tonight" — set to 23:59 today
        expiresAt = new Date();
        expiresAt.setHours(23, 59, 0, 0);
      } else {
        expiresAt = new Date(Date.now() + duration.ms);
      }

      // Location is opportunistic metadata — broadcast works without a GPS fix
      // (nothing renders signal.location yet; the signal itself rides on the
      // friend's pin / chat row).
      await updateDoc(doc(db, 'users', userId), {
        currentSignal: {
          emoji: selectedEmoji,
          text: customText,
          expiresAt: Timestamp.fromDate(expiresAt),
          location: currentLocation
            ? new GeoPoint(currentLocation.lat, currentLocation.lng)
            : null,
        },
      });

      onClose();
    } catch (err) {
      console.error('Failed to broadcast signal:', err);
      Alert.alert('Broadcast failed', 'Could not broadcast your signal. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleClearSignal = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    await updateDoc(doc(db, 'users', userId), {
      currentSignal: null,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end">
        <View className="bg-void border-t border-glass-border rounded-t-3xl p-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-fog text-xl font-bold">Broadcast Signal</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-fog/50 text-2xl">✕</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-fog/50 text-sm mb-4">
            Let your friends know what you're up to
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
                onPress={() => handlePresetSelect(preset.emoji, preset.text)}
                className={`mr-2 px-4 py-3 rounded-xl border ${selectedEmoji === preset.emoji
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
            <Text className="text-2xl mr-3">{selectedEmoji}</Text>
            <TextInput
              className="flex-1 text-fog text-base"
              placeholder="What are you doing?"
              placeholderTextColor="rgba(242, 244, 246, 0.3)"
              value={customText}
              onChangeText={setCustomText}
            />
          </View>

          {/* Duration */}
          <Text className="text-fog/50 text-xs uppercase tracking-widest mb-2">
            Duration
          </Text>
          <View className="flex-row gap-2 mb-6">
            {SIGNAL_DURATIONS.map((duration, i) => (
              <TouchableOpacity
                key={duration.label}
                onPress={() => setDurationIndex(i)}
                className={`flex-1 rounded-xl py-3 items-center border ${durationIndex === i
                    ? 'border-signal bg-signal/10'
                    : 'border-glass-border bg-glass'
                  }`}
              >
                <Text
                  className={`text-sm ${durationIndex === i ? 'text-signal' : 'text-fog/50'
                    }`}
                >
                  {duration.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Location note — informational only, never blocks broadcasting */}
          {!currentLocation && (
            <Text className="text-fog/40 text-xs text-center mb-2">
              No GPS fix — your signal broadcasts without a location tag
            </Text>
          )}

          {/* Actions */}
          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mb-3 ${sending ? 'bg-rose/30' : 'bg-rose'
              }`}
            onPress={handleBroadcast}
            disabled={sending}
          >
            <Text className="text-fog font-semibold text-base">
              {sending ? 'Broadcasting...' : '📡 Broadcast'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="py-2" onPress={handleClearSignal}>
            <Text className="text-fog/30 text-sm text-center">
              Clear active signal
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
