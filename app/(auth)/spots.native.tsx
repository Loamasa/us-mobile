import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import { GeoPoint } from 'firebase/firestore';
import { auth } from '@/config/firebase';
import { createUserSpot } from '@/lib/firestore';
import { GlowBlob } from '@/components/auth/AuthLayout';
import { NavigationIcon } from '@/components/ui/icons';
import RadiusChips from '@/features/spots/RadiusChips';
import ScheduleFields from '@/features/spots/ScheduleFields';
import { normalizeTime } from '@/features/spots/spotSchedule';
import {
  COLORS,
  MAP_DEFAULTS,
  SPOT_EMOJI_PRESETS,
  MAX_ONBOARDING_SPOTS,
  DEFAULT_SPOT_RADIUS,
} from '@/config/constants';
import { DARK_MAP_STYLE } from '@/config/mapStyles';
import type { SpotSchedule } from '@/types';

interface SpotDraft {
  name: string;
  emoji: string;
  latitude: number;
  longitude: number;
  radius: number;
  schedule: SpotSchedule | null;
}

interface DraftForm {
  name: string;
  emoji: string;
  radius: number;
  scheduled: boolean;
  days: number[];
  start: string;
  end: string;
}

const DEFAULT_DRAFT: DraftForm = {
  name: '',
  emoji: '🏠',
  radius: DEFAULT_SPOT_RADIUS,
  scheduled: false,
  days: [1, 2, 3, 4, 5],
  start: '08:00',
  end: '17:00',
};

export default function SpotsScreen() {
  const [spots, setSpots] = useState<SpotDraft[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(DEFAULT_DRAFT);
  const [draftCoord, setDraftCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [draftError, setDraftError] = useState('');
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<MapView>(null);
  const router = useRouter();

  const animateTo = (lat: number, lng: number) => {
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      400
    );
  };

  /** Current GPS fix if permission is already granted (no prompt). */
  const getQuietFix = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  };

  // Center on the tester instead of the Malmö default — they usually onboard
  // from the first place they'll pin (home). Permission was just asked on the
  // previous step, so this is quiet: no fix, no movement.
  useEffect(() => {
    (async () => {
      try {
        const fix = await getQuietFix();
        if (fix) animateTo(fix.lat, fix.lng);
      } catch {
        // No GPS (web preview, airplane mode) — keep the default region.
      }
    })();
  }, []);

  const handleMyLocation = async () => {
    try {
      let fix = await getQuietFix();
      if (!fix) {
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status !== 'granted') return;
        fix = await getQuietFix();
      }
      if (fix) animateTo(fix.lat, fix.lng);
    } catch {
      // GPS unavailable — leave the camera where it is.
    }
  };

  const handleMapPress = (e: any) => {
    if (spots.length >= MAX_ONBOARDING_SPOTS) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setDraftCoord({ lat: latitude, lng: longitude });
    setDraft(DEFAULT_DRAFT);
    setDraftError('');
    setShowModal(true);
  };

  const handleAddSpot = () => {
    if (!draftCoord || !draft.name.trim()) return;

    // Same schedule rules as the My Spots editor.
    let schedule: SpotSchedule | null = null;
    if (draft.scheduled) {
      const start = normalizeTime(draft.start);
      const end = normalizeTime(draft.end);
      if (!start || !end) {
        setDraftError('Use 24h times like 08:00 or 17:30.');
        return;
      }
      if (draft.days.length === 0) {
        setDraftError('Pick at least one weekday for the schedule.');
        return;
      }
      schedule = { days: [...draft.days].sort((a, b) => a - b), start, end };
    }

    setSpots([
      ...spots,
      {
        name: draft.name.trim(),
        emoji: draft.emoji,
        latitude: draftCoord.lat,
        longitude: draftCoord.lng,
        radius: draft.radius,
        schedule,
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
      // Save all spots to Firestore. createUserSpot generates the doc id, so
      // a retry after a partial failure can duplicate already-saved spots —
      // remove each from local state as it lands.
      for (const spot of [...spots]) {
        await createUserSpot(userId, {
          name: spot.name,
          emoji: spot.emoji,
          location: new GeoPoint(spot.latitude, spot.longitude),
          radius: spot.radius,
          isActive: true,
          schedule: spot.schedule,
        });
        setSpots((prev) => prev.filter((s) => s !== spot));
      }
      router.replace('/(tabs)/map');
    } catch (err) {
      // Spots are the only way friends ever see you — a silent failure here
      // makes the app look dead, so keep the tester on this screen.
      console.error('onboarding spot save failed', err);
      Alert.alert(
        'Could not save your spots',
        'Check your connection and try again — without spots, friends can never see you on the map.',
        [
          {
            text: 'Skip anyway',
            style: 'destructive',
            onPress: () => router.replace('/(tabs)/map'),
          },
          { text: 'Try Again' },
        ]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)/map');
  };

  return (
    <SafeAreaView className="flex-1 bg-void">
      <GlowBlob hex={COLORS.mint} position="corner" />

      {/* Header */}
      <View className="px-6 pt-4 pb-4 items-center">
        <Text className="text-white text-4xl font-black uppercase tracking-tight text-center mb-3">
          My Spots.
        </Text>
        <Text className="text-fog/50 text-base text-center max-w-[320px] mb-2">
          Pin the places you hang out. Friends only see you on the map while
          you're physically inside one of your spots.
        </Text>
        <Text className="text-fog/40 text-xs text-center max-w-[320px] mb-3">
          You stay in control: switch spots on or off, give them weekly hours,
          or go ghost mode to disappear completely — anytime.
        </Text>
        <Text className="text-mint text-[10px] font-bold uppercase tracking-widest">
          Tap the map to place a spot · {spots.length}/{MAX_ONBOARDING_SPOTS}
        </Text>
      </View>

      {/* Map */}
      <View className="flex-1 mx-4 rounded-2xl overflow-hidden border border-glass-border">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
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

        {/* Find-me — centers the camera, never places a spot */}
        <TouchableOpacity
          className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-void/70 border border-glass-border items-center justify-center"
          onPress={handleMyLocation}
          activeOpacity={0.8}
        >
          <NavigationIcon size={18} color="#F2F4F6" />
        </TouchableOpacity>
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
      <View className="px-6 pb-8 pt-2">
        <TouchableOpacity
          className={`w-full py-4 rounded-2xl items-center bg-mint ${saving ? 'opacity-50' : ''}`}
          onPress={handleContinue}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text className="text-black font-bold text-lg">
            {saving
              ? 'Saving…'
              : spots.length > 0
                ? `Continue with ${spots.length} spot${spots.length > 1 ? 's' : ''}`
                : 'Continue without spots'}
          </Text>
        </TouchableOpacity>

        {spots.length === 0 && (
          <TouchableOpacity className="py-4" onPress={handleSkip} activeOpacity={0.7}>
            <Text className="text-fog/40 text-sm font-bold text-center">Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add Spot Modal — full My Spots capabilities (radius + weekly hours) */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View className="bg-void border-t border-glass-border rounded-t-3xl">
            <ScrollView
              className="px-6 pt-6"
              style={{ maxHeight: 580 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-white text-xl font-black uppercase tracking-tight mb-4">
                Name this spot.
              </Text>

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
                      setDraft((d) => ({
                        ...d,
                        emoji: preset.emoji,
                        name: d.name || preset.label,
                      }));
                    }}
                    className={`mr-2 px-4 py-3 rounded-xl border ${draft.emoji === preset.emoji
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
                  value={draft.name}
                  onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
                />
              </View>

              {/* Radius */}
              <View className="mb-4">
                <RadiusChips
                  value={draft.radius}
                  onChange={(radius) => setDraft((d) => ({ ...d, radius }))}
                />
              </View>

              {/* Weekly hours */}
              <View className="mb-4">
                <ScheduleFields
                  value={draft}
                  onChange={(patch) => {
                    setDraftError('');
                    setDraft((d) => ({ ...d, ...patch }));
                  }}
                />
              </View>

              {draftError ? (
                <Text className="text-rose text-sm text-center mb-3">{draftError}</Text>
              ) : null}

              {/* Actions */}
              <View className="flex-row gap-3 pb-6">
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
