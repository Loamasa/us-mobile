import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

export default function PermissionsScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAllow = async () => {
    setLoading(true);
    try {
      const { status: foreground } = await Location.requestForegroundPermissionsAsync();

      if (foreground === 'granted') {
        // Also request background (optional, may not be granted immediately)
        await Location.requestBackgroundPermissionsAsync();
      }

      router.replace('/(auth)/spots');
    } catch {
      // Permission denied or error — still continue
      router.replace('/(auth)/spots');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/spots');
  };

  return (
    <View className="flex-1 bg-void justify-center px-8">
      {/* Icon */}
      <View className="self-center mb-8">
        <View className="w-32 h-32 rounded-full bg-signal/10 border-2 border-signal/30 items-center justify-center">
          <Text className="text-6xl">📍</Text>
        </View>
      </View>

      {/* Header */}
      <Text className="text-fog text-3xl font-bold text-center mb-2">
        Synchronize.
      </Text>
      <Text className="text-fog/50 text-base text-center mb-12 px-4">
        Allow location access so your friends can see where you are on the map — and you can see them.
      </Text>

      {/* Allow Button */}
      <TouchableOpacity
        className={`rounded-2xl py-4 items-center mb-3 ${
          loading ? 'bg-signal/50' : 'bg-signal'
        }`}
        onPress={handleAllow}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text className="text-fog font-semibold text-base">
          {loading ? 'Requesting...' : 'Allow Location'}
        </Text>
      </TouchableOpacity>

      {/* Skip */}
      <TouchableOpacity
        className="py-3"
        onPress={handleSkip}
      >
        <Text className="text-fog/40 text-sm text-center">
          Skip for now
        </Text>
      </TouchableOpacity>

      {/* Privacy Note */}
      <View className="mt-12 bg-glass border border-glass-border rounded-2xl p-4">
        <Text className="text-fog/70 text-xs text-center leading-5">
          🔒 YOUR DATA STAYS ON YOUR DEVICE{'\n'}
          Location is only shared with your friends while you choose.{'\n'}
          Toggle ghost mode anytime to disappear.
        </Text>
      </View>
    </View>
  );
}
