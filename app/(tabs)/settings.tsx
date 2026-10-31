import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { auth } from '@/config/firebase';
import { onUserProfile, deleteLocation, onUserSpots } from '@/lib/firestore';
import { COLORS, SUPPORT_EMAIL } from '@/config/constants';
import type { UserProfile, UserSpot } from '@/types';
import UserAvatar from '@/components/UserAvatar';
import MySpotsModal from '@/features/spots/MySpotsModal';
import SettingsGroup from '@/components/settings/SettingsGroup';
import SettingRow from '@/components/settings/SettingRow';
import {
  UserIcon,
  ShieldIcon,
  MapPinIcon,
  TerminalIcon,
  LogOutIcon,
  ChevronRightIcon,
  MessageSquareIcon,
} from '@/components/ui/icons';

export default function SettingsScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | undefined>(auth.currentUser?.uid);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [spots, setSpots] = useState<UserSpot[]>([]);
  const [showSpotsModal, setShowSpotsModal] = useState(false);

  // Track auth state so profile/spots re-subscribe on account switch.
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? undefined));
  }, []);

  useEffect(() => {
    setProfile(null);
    setSpots([]);
    if (!userId) return;
    const unsubProfile = onUserProfile(userId, setProfile);
    const unsubSpots = onUserSpots(userId, setSpots);
    return () => {
      unsubProfile();
      unsubSpots();
    };
  }, [userId]);

  // Native version comes from the installed APK; web/Expo Go fall back to
  // app.json. Build number ties tester reports to a specific EAS build.
  const appVersion =
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    '?';
  const buildNumber = Application.nativeBuildVersion;

  const handleReportBug = async () => {
    const subject = encodeURIComponent(
      `us bug report — v${appVersion}${buildNumber ? ` (${buildNumber})` : ''} ${Platform.OS}`
    );
    const body = encodeURIComponent(
      `What happened:\n\nWhat I expected:\n\nSteps to reproduce:\n\n— sent from us v${appVersion}, ${Platform.OS}`
    );
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No mail app', `Email your report to ${SUPPORT_EMAIL}`);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          // Writes only resolve once the server confirms, so offline this would
          // hang forever. Give it a moment, then sign out regardless: the
          // record expires on its own.
          if (userId) {
            await Promise.race([
              deleteLocation(userId).catch(() => {}),
              new Promise((resolve) => setTimeout(resolve, 3000)),
            ]);
          }
          await signOut(auth);
          // Back through the auth gate (app/index.tsx) — signed-out users
          // land on onboarding instead of staying on the tabs.
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-void" contentContainerClassName="px-4 pt-16 pb-24">
      <Text className="text-fog text-2xl font-bold mb-6 px-2">Settings</Text>

      {/* Profile card — tap to edit */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/settings/account')}
        className="bg-glass border border-glass-border rounded-2xl p-4 mb-6 flex-row items-center"
      >
        <UserAvatar displayName={profile?.displayName ?? '?'} size="lg" />
        <View className="flex-1 ml-4">
          <Text className="text-fog text-lg font-bold">
            {profile?.displayName ?? 'Not signed in'}
          </Text>
          {profile ? (
            <Text className="text-fog/50 text-sm">@{profile.handle}</Text>
          ) : null}
          {profile?.bio ? (
            <Text className="text-fog/40 text-xs mt-1" numberOfLines={1}>
              {profile.bio}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-signal text-xs font-bold">Edit</Text>
          <ChevronRightIcon size={16} color={COLORS.signal} />
        </View>
      </TouchableOpacity>

      {/* User settings */}
      <SettingsGroup title="Account">
        <SettingRow
          label="My Account"
          subtitle="Name, handle, bio"
          icon={<UserIcon size={20} color={COLORS.fog} />}
          onPress={() => router.push('/settings/account')}
        />
        <SettingRow
          label="Privacy & Safety"
          subtitle="Location sharing, friend requests"
          icon={<ShieldIcon size={18} color={COLORS.fog} />}
          onPress={() => router.push('/settings/privacy')}
        />
        <SettingRow
          label="My Spots"
          subtitle="Places where friends can see you"
          icon={<MapPinIcon size={18} color={COLORS.fog} />}
          badge={spots.length}
          onPress={() => setShowSpotsModal(true)}
        />
      </SettingsGroup>

      {/* Help & about */}
      <SettingsGroup title="Help">
        <SettingRow
          label="Report a Bug"
          subtitle="Email the developer — version is attached"
          icon={<MessageSquareIcon size={18} color={COLORS.fog} />}
          onPress={handleReportBug}
        />
        <SettingRow
          label="Privacy Notice"
          subtitle="What we store and why"
          icon={<ShieldIcon size={18} color={COLORS.fog} />}
          onPress={() => router.push('/settings/privacy-notice')}
        />
      </SettingsGroup>

      {/* Developer — dev builds only */}
      {__DEV__ ? (
        <SettingsGroup title="App">
          <SettingRow
            label="Developer / Debug"
            subtitle="Switch accounts, onboarding"
            icon={<TerminalIcon size={18} color={COLORS.fog} />}
            onPress={() => router.push('/settings/developer')}
          />
        </SettingsGroup>
      ) : null}

      {/* Sign out */}
      <SettingsGroup>
        <SettingRow
          label="Sign Out"
          tint="danger"
          icon={<LogOutIcon size={18} color={COLORS.rose} />}
          onPress={handleSignOut}
          right={<View />}
        />
      </SettingsGroup>

      {/* Version footer — testers quote this in bug reports */}
      <Text className="text-fog/25 text-xs text-center mt-6">
        us v{appVersion}
        {buildNumber ? ` (build ${buildNumber})` : ''}
      </Text>

      <MySpotsModal visible={showSpotsModal} onClose={() => setShowSpotsModal(false)} />
    </ScrollView>
  );
}
