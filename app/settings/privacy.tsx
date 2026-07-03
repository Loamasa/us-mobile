import { useEffect, useState } from 'react';
import { View, Switch, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { onUserProfile, deleteLocation } from '@/lib/firestore';
import { COLORS } from '@/config/constants';
import type { UserProfile, UserSettings } from '@/types';
import SettingsDetailLayout from '@/components/settings/SettingsDetailLayout';
import SettingsGroup from '@/components/settings/SettingsGroup';
import SettingRow from '@/components/settings/SettingRow';

export default function PrivacySettingsScreen() {
  const [userId, setUserId] = useState<string | undefined>(auth.currentUser?.uid);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? undefined));
  }, []);

  useEffect(() => {
    setProfile(null);
    if (!userId) return;
    return onUserProfile(userId, setProfile);
  }, [userId]);

  const update = async (key: keyof UserSettings, value: boolean) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId), { [`settings.${key}`]: value });
    // Turning off global sharing = ghost mode → drop the live location doc.
    if (key === 'globalLocationSharing' && !value) {
      await deleteLocation(userId);
    }
  };

  const renderSwitch = (key: keyof UserSettings, value: boolean) => (
    <Switch
      value={value}
      onValueChange={(v) => update(key, v)}
      trackColor={{ false: '#333', true: COLORS.signal }}
      thumbColor={COLORS.fog}
    />
  );

  return (
    <SettingsDetailLayout
      title="Privacy & Safety"
      subtitle="Manage how you connect with others and what you share."
    >
      {!profile ? (
        <View className="items-center py-16">
          <ActivityIndicator color={COLORS.signal} />
        </View>
      ) : (
        <>
          <SettingsGroup title="Location">
            <SettingRow
              label="Location Sharing"
              subtitle={
                profile.settings.globalLocationSharing
                  ? 'Friends can see you on the map'
                  : 'Ghost mode — you are invisible'
              }
              right={renderSwitch(
                'globalLocationSharing',
                profile.settings.globalLocationSharing
              )}
            />
          </SettingsGroup>

          <SettingsGroup title="Connections">
            <SettingRow
              label="Allow Friend Requests"
              subtitle="Let others send you friend requests"
              right={renderSwitch(
                'allowFriendRequests',
                profile.settings.allowFriendRequests
              )}
            />
            {/* "Show Online Status" is deliberately NOT rendered: no presence
                system reads settings.showOnlineStatus yet — a toggle that does
                nothing erodes tester trust. Re-add when presence ships. */}
          </SettingsGroup>
        </>
      )}
    </SettingsDetailLayout>
  );
}
