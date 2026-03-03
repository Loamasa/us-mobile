import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { onUserProfile, deleteLocation } from '@/lib/firestore';
import { COLORS } from '@/config/constants';
import type { UserProfile } from '@/types';
import GlassCard from '@/components/ui/GlassCard';
import {
  DEV_ACCOUNTS,
  getCurrentAccountId,
  switchAccount,
  type DevAccount,
} from '@/dev/devAccounts';
import seedDevData from '@/dev/seedDevData';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | undefined>(auth.currentUser?.uid);
  const [seeding, setSeeding] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(
    getCurrentAccountId()
  );
  const router = useRouter();

  // Track auth state changes (needed for account switching)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? undefined);
      setCurrentAccountId(getCurrentAccountId());
    });
    return unsub;
  }, []);

  // Profile listener
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const unsubscribe = onUserProfile(userId, setProfile);
    return unsubscribe;
  }, [userId]);

  const toggleLocationSharing = async (value: boolean) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId), {
      'settings.globalLocationSharing': value,
    });
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
          if (userId) await deleteLocation(userId);
          await signOut(auth);
        },
      },
    ]);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDevData();
      Alert.alert('Done', 'Test data seeded successfully.');
    } catch (err: any) {
      console.error('Seed failed:', err);
      Alert.alert(
        'Seed Failed',
        err.message?.includes('Network request failed')
          ? 'Firestore emulator not reachable. Is it running?'
          : err.message ?? 'Unknown error'
      );
    } finally {
      setSeeding(false);
    }
  };

  const handleSwitchAccount = async (account: DevAccount) => {
    if (account.id === currentAccountId) return;
    setSwitching(true);
    try {
      await switchAccount(account);
    } catch (err: any) {
      console.error('Switch failed:', err);
      Alert.alert(
        'Switch Failed',
        'Could not switch account. Have you seeded test data first?'
      );
    } finally {
      setSwitching(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-void pt-16 px-4">
      <Text className="text-fog text-2xl font-bold mb-6 px-2">Settings</Text>

      {/* Profile Card */}
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

          {/* Privacy */}
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

      {/* Developer Section — only in dev mode */}
      {__DEV__ && (
        <>
          <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-2">
            Developer
          </Text>

          {/* Seed Test Data */}
          <TouchableOpacity onPress={handleSeed} disabled={seeding}>
            <GlassCard className="mb-2 flex-row items-center justify-center">
              <Text className={`font-semibold ${seeding ? 'text-mint/50' : 'text-mint'}`}>
                {seeding ? 'Seeding...' : 'Seed Test Data'}
              </Text>
            </GlassCard>
          </TouchableOpacity>

          {/* Account Switcher */}
          <Text className="text-fog/40 text-xs mb-2 px-2 mt-4">
            Switch Account {switching ? '(switching...)' : ''}
          </Text>

          {DEV_ACCOUNTS.map((account) => {
            const isActive = currentAccountId === account.id;
            return (
              <TouchableOpacity
                key={account.id}
                onPress={() => handleSwitchAccount(account)}
                disabled={switching || isActive}
              >
                <GlassCard
                  className={`mb-2 flex-row items-center justify-between ${
                    isActive ? 'border-signal' : ''
                  }`}
                >
                  <View>
                    <Text className="text-fog font-semibold">
                      {account.displayName}
                    </Text>
                    <Text className="text-fog/40 text-xs">@{account.handle}</Text>
                  </View>
                  {isActive && (
                    <Text className="text-signal text-xs font-semibold">Active</Text>
                  )}
                </GlassCard>
              </TouchableOpacity>
            );
          })}

          {/* Test Onboarding */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/phone')}
            className="mt-2"
          >
            <GlassCard className="flex-row items-center justify-center">
              <Text className="text-signal font-semibold">Test Onboarding</Text>
            </GlassCard>
          </TouchableOpacity>

          {/* Bottom padding for scroll */}
          <View className="h-8" />
        </>
      )}
    </ScrollView>
  );
}
