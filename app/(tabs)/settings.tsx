import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { onUserProfile, deleteLocation } from '@/lib/firestore';
import { COLORS } from '@/config/constants';
import type { UserProfile } from '@/types';
import GlassCard from '@/components/ui/GlassCard';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const router = useRouter();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onUserProfile(userId, setProfile);
    return unsubscribe;
  }, [userId]);

  const toggleLocationSharing = async (value: boolean) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId), {
      'settings.globalLocationSharing': value,
    });

    // If turning off (ghost mode), delete location
    if (!value) {
      await deleteLocation(userId);
    }
  };

  const toggleFriendRequests = async (value: boolean) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId), {
      'settings.allowFriendRequests': value,
    });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (userId) {
            await deleteLocation(userId);
          }
          await signOut(auth);
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-void pt-16 px-4">
      <Text className="text-fog text-2xl font-bold mb-6 px-2">Settings</Text>

      {/* Profile Card — shown only when signed in */}
      {profile ? (
        <>
          <GlassCard className="mb-6 items-center py-6">
            <View className="w-20 h-20 rounded-full bg-signal/20 items-center justify-center mb-3">
              <Text className="text-4xl">👤</Text>
            </View>
            <Text className="text-fog text-lg font-bold">{profile.displayName}</Text>
            <Text className="text-fog/50 text-sm">@{profile.handle}</Text>
            {profile.bio ? (
              <Text className="text-fog/40 text-xs mt-2">{profile.bio}</Text>
            ) : null}
          </GlassCard>

          {/* Location Sharing */}
          <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-2">
            Privacy
          </Text>

          <GlassCard className="mb-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-fog font-semibold">Location Sharing</Text>
              <Text className="text-fog/40 text-xs mt-1">
                {profile.settings.globalLocationSharing
                  ? 'Friends can see you on the map'
                  : 'Ghost mode — you are invisible'}
              </Text>
            </View>
            <Switch
              value={profile.settings.globalLocationSharing}
              onValueChange={toggleLocationSharing}
              trackColor={{ false: '#333', true: COLORS.signal }}
              thumbColor={COLORS.fog}
            />
          </GlassCard>

          <GlassCard className="mb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-fog font-semibold">Allow Friend Requests</Text>
              <Text className="text-fog/40 text-xs mt-1">
                Let others send you friend requests
              </Text>
            </View>
            <Switch
              value={profile.settings.allowFriendRequests}
              onValueChange={toggleFriendRequests}
              trackColor={{ false: '#333', true: COLORS.signal }}
              thumbColor={COLORS.fog}
            />
          </GlassCard>

          {/* Account */}
          <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-2">
            Account
          </Text>

          <TouchableOpacity onPress={handleSignOut}>
            <GlassCard className="mb-6 flex-row items-center justify-center">
              <Text className="text-red-400 font-semibold">Sign Out</Text>
            </GlassCard>
          </TouchableOpacity>
        </>
      ) : (
        <GlassCard className="mb-6 items-center py-6">
          <Text className="text-fog/50 text-sm">Not signed in</Text>
        </GlassCard>
      )}

      {/* Developer */}
      <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-2">
        Developer
      </Text>

      <TouchableOpacity onPress={() => router.push('/(auth)/phone')}>
        <GlassCard className="flex-row items-center justify-center">
          <Text className="text-signal font-semibold">Test Onboarding</Text>
        </GlassCard>
      </TouchableOpacity>
    </View>
  );
}
