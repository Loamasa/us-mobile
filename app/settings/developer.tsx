import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { COLORS } from '@/config/constants';
import SettingsDetailLayout from '@/components/settings/SettingsDetailLayout';
import SettingsGroup from '@/components/settings/SettingsGroup';
import SettingRow from '@/components/settings/SettingRow';
import { PlayCircleIcon } from '@/components/ui/icons';
import {
  DEV_ACCOUNTS,
  getCurrentAccountId,
  switchAccount,
  type DevAccount,
} from '@/dev/devAccounts';

export default function DeveloperSettingsScreen() {
  const router = useRouter();

  // Debug-only screen: the Settings list already hides the entry in production,
  // but the route itself must not be reachable either (e.g. via deep link).
  if (!__DEV__) {
    return <Redirect href="/(tabs)/settings" />;
  }
  const [switching, setSwitching] = useState(false);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(
    getCurrentAccountId()
  );

  useEffect(() => {
    return onAuthStateChanged(auth, () => setCurrentAccountId(getCurrentAccountId()));
  }, []);

  const handleSwitchAccount = async (account: DevAccount) => {
    if (account.id === currentAccountId) return;
    setSwitching(true);
    try {
      await switchAccount(account);
    } catch (err: unknown) {
      console.error('Switch failed:', err);
      Alert.alert(
        'Switch Failed',
        'Could not switch account. Have you run npm run seed?'
      );
    } finally {
      setSwitching(false);
    }
  };

  return (
    <SettingsDetailLayout
      title="Developer / Debug"
      subtitle="Tools for development and testing."
    >
      {/* Account Switcher */}
      <SettingsGroup title={`Switch Account${switching ? ' (switching…)' : ''}`}>
        {DEV_ACCOUNTS.map((account) => {
          const isActive = currentAccountId === account.id;
          return (
            <SettingRow
              key={account.id}
              label={account.displayName}
              subtitle={`@${account.handle}`}
              onPress={() => handleSwitchAccount(account)}
              disabled={switching || isActive}
              right={
                isActive ? (
                  <Text className="text-signal text-xs font-bold">Active</Text>
                ) : undefined
              }
            />
          );
        })}
      </SettingsGroup>

      {/* Test Onboarding */}
      <SettingsGroup title="Onboarding">
        <SettingRow
          label="Test Onboarding"
          subtitle="Carousel → sign-in flow"
          icon={<PlayCircleIcon size={20} color={COLORS.signal} />}
          onPress={() => router.push('/(auth)/onboarding')}
        />
      </SettingsGroup>

      <View className="h-6" />
    </SettingsDetailLayout>
  );
}
