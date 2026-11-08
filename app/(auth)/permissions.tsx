import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { GlowBlob } from '@/components/auth/AuthLayout';
import { MapPinIcon, ShieldIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';

export default function PermissionsScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAllow = async () => {
    setLoading(true);
    try {
      await Location.requestForegroundPermissionsAsync();
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
    <SafeAreaView className="flex-1 bg-void">
      <GlowBlob hex={COLORS.signal} position="center" />

      <View className="flex-1 items-center justify-center px-6">
        {/* Icon */}
        <View
          className="w-24 h-24 rounded-full bg-glass border border-glass-border items-center justify-center mb-8"
          style={{
            shadowColor: COLORS.signal,
            shadowOpacity: 0.3,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 0 },
            elevation: 12,
          }}
        >
          <MapPinIcon size={40} color="#FFFFFF" />
        </View>

        {/* Header */}
        <Text className="text-white text-4xl font-black uppercase tracking-tight text-center mb-4">
          Synchronize.
        </Text>
        <Text className="text-fog/50 text-lg text-center mb-10 max-w-[300px]">
          We need your location to show you the world around you.
        </Text>

        {/* Allow Button */}
        <View className="w-full max-w-[320px]">
          <TouchableOpacity
            className={`w-full py-4 bg-white rounded-2xl items-center ${loading ? 'opacity-50' : ''}`}
            onPress={handleAllow}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text className="text-black font-bold text-lg">
              {loading ? 'Requesting...' : 'Allow Location'}
            </Text>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity className="w-full py-4" onPress={handleSkip} activeOpacity={0.7}>
            <Text className="text-fog/40 text-sm font-bold text-center">Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Privacy pill */}
      <View className="items-center pb-6">
        <View className="flex-row items-center gap-2 bg-glass border border-glass-border px-4 py-2 rounded-full">
          <ShieldIcon size={14} color={COLORS.mint} />
          <Text className="text-fog/50 text-[10px] font-bold">
            CONTROL LOCATION SHARING IN SETTINGS
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
