import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Circle, type Region } from 'react-native-maps';
import { GeoPoint } from 'firebase/firestore';
import { auth } from '@/config/firebase';
import { createUserSpot } from '@/lib/firestore';
import {
  COLORS,
  MAP_DEFAULTS,
  SPOT_EMOJI_PRESETS,
  MAX_ONBOARDING_SPOTS,
  DEFAULT_SPOT_RADIUS,
} from '@/config/constants';
import { DARK_MAP_STYLE } from '@/config/mapStyles';

interface SpotDraft {
  name: string;
  emoji: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export default function SpotsScreen() {
  const [spots, setSpots] = useState<SpotDraft[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftEmoji, setDraftEmoji] = useState('🏠');
  const [draftCoord, setDraftCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<MapView>(null);
  const router = useRouter();

  const handleMapPress = (e: any) => {
    if (spots.length >= MAX_ONBOARDING_SPOTS) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setDraftCoord({ lat: latitude, lng: longitude });
    setDraftName('');
    setDraftEmoji('🏠');
    setShowModal(true);
  };

  const handleAddSpot = () => {
    if (!draftCoord || !draftName.trim()) return;
    setSpots([
      ...spots,
      {
        name: draftName.trim(),
        emoji: draftEmoji,
        latitude: draftCoord.lat,
        longitude: draftCoord.lng,
        radius: DEFAULT_SPOT_RADIUS,
      },
    ]);
    setShowModal(false);
  };

  const handleRemoveSpot = (index: number) => {
    setSpots(spots.filter((_, i) => i !== index));
  };

  const handleContinue = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      router.replace('/(tabs)/map');
      return;
    }

    setSaving(true);
    try {
      // Save all spots to Firestore
      for (const spot of spots) {
        await createUserSpot(userId, {
          name: spot.name,
          emoji: spot.emoji,
          location: new GeoPoint(spot.latitude, spot.longitude),
          radius: spot.radius,
          isActive: true,
        });
      }
      router.replace('/(tabs)/map');
    } catch {
      // Continue even if saving fails
      router.replace('/(tabs)/map');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)/map');
  };

  return (
    <View className="flex-1 bg-void">
      {/* Header */}
      <View className="px-8 pt-16 pb-4">
        <Text className="text-fog text-3xl font-bold text-center mb-2">
          Your Spots
        </Text>
        <Text className="text-fog/50 text-sm text-center mb-4">
          Pin the places you hang out. Your friends will see when you're there.
        </Text>
        <Text className="text-fog/30 text-xs text-center">
          Tap the map to place a spot ({spots.length}/{MAX_ONBOARDING_SPOTS})
        </Text>
      </View>

      {/* Map */}
      <View className="flex-1 mx-4 rounded-2xl overflow-hidden border border-glass-border">
        <MapView
          ref={mapRef}
          className="flex-1"
          initialRegion={MAP_DEFAULTS.initialRegion}
          customMapStyle={DARK_MAP_STYLE}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {spots.map((spot, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
              onPress={() => handleRemoveSpot(i)}
            >
              <View className="items-center">
                <View className="bg-void/80 border border-signal/40 rounded-xl px-3 py-2 items-center">
                  <Text className="text-2xl">{spot.emoji}</Text>
                  <Text className="text-fog text-xs mt-1">{spot.name}</Text>
                </View>
              </View>
            </Marker>
          ))}
          {spots.map((spot, i) => (
            <Circle
              key={`circle-${i}`}
              center={{ latitude: spot.latitude, longitude: spot.longitude }}
              radius={spot.radius}
              fillColor="rgba(46, 92, 255, 0.1)"
              strokeColor="rgba(46, 92, 255, 0.3)"
              strokeWidth={1}
            />
          ))}
        </MapView>
      </View>

      {/* Spot List */}
      {spots.length > 0 && (
        <ScrollView
          horizontal
          className="px-4 py-3"
          showsHorizontalScrollIndicator={false}
        >
          {spots.map((spot, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleRemoveSpot(i)}
              className="bg-glass border border-glass-border rounded-xl px-4 py-2 mr-2 flex-row items-center"
            >
              <Text className="text-lg mr-2">{spot.emoji}</Text>
              <Text className="text-fog text-sm">{spot.name}</Text>
              <Text className="text-fog/30 text-xs ml-2">✕</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Actions */}
      <View className="px-8 pb-8 pt-2">
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center mb-3 ${
            saving ? 'bg-signal/50' : 'bg-signal'
          }`}
          onPress={handleContinue}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text className="text-fog font-semibold text-base">
            {saving
              ? 'Saving...'
              : spots.length > 0
              ? `Continue with ${spots.length} spot${spots.length > 1 ? 's' : ''}`
              : 'Continue without spots'}
          </Text>
        </TouchableOpacity>

        {spots.length === 0 && (
          <TouchableOpacity className="py-2" onPress={handleSkip}>
            <Text className="text-fog/40 text-sm text-center">Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add Spot Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 justify-end">
          <View className="bg-void border-t border-glass-border rounded-t-3xl p-6">
            <Text className="text-fog text-xl font-bold mb-4">Name this spot</Text>

            {/* Emoji Picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {SPOT_EMOJI_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.emoji}
                  onPress={() => {
                    setDraftEmoji(preset.emoji);
                    if (!draftName) setDraftName(preset.label);
                  }}
                  className={`mr-2 px-4 py-3 rounded-xl border ${
                    draftEmoji === preset.emoji
                      ? 'border-signal bg-signal/10'
                      : 'border-glass-border bg-glass'
                  }`}
                >
                  <Text className="text-2xl text-center">{preset.emoji}</Text>
                  <Text className="text-fog/50 text-xs text-center mt-1">
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Name Input */}
            <View className="bg-glass border border-glass-border rounded-2xl px-4 py-4 mb-4">
              <TextInput
                className="text-fog text-lg"
                placeholder="e.g. Home, Gym, Library"
                placeholderTextColor="rgba(242, 244, 246, 0.3)"
                value={draftName}
                onChangeText={setDraftName}
                autoFocus
              />
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-2xl py-4 items-center border border-glass-border"
                onPress={() => setShowModal(false)}
              >
                <Text className="text-fog/50 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-2xl py-4 items-center bg-signal"
                onPress={handleAddSpot}
              >
                <Text className="text-fog font-semibold">Add Spot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
