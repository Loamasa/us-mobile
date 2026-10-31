import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { onUserProfile } from '@/lib/firestore';
import { COLORS } from '@/config/constants';
import type { UserProfile } from '@/types';
import UserAvatar from '@/components/UserAvatar';
import SettingsDetailLayout from '@/components/settings/SettingsDetailLayout';
import { CameraIcon, CheckIcon } from '@/components/ui/icons';

const MIN_PASSWORD_LENGTH = 10;

export default function AccountSettingsScreen() {
  const [userId, setUserId] = useState<string | undefined>(auth.currentUser?.uid);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? undefined));
  }, []);

  useEffect(() => {
    hydrated.current = false;
    setProfile(null);
    if (!userId) return;
    return onUserProfile(userId, setProfile);
  }, [userId]);

  // Populate the form once, from the first profile snapshot — later snapshots
  // must not clobber in-progress edits.
  useEffect(() => {
    if (profile && !hydrated.current) {
      setDisplayName(profile.displayName);
      setBio(profile.bio ?? '');
      hydrated.current = true;
    }
  }, [profile]);

  const trimmedName = displayName.trim();
  const dirty =
    !!profile &&
    (trimmedName !== profile.displayName || bio.trim() !== (profile.bio ?? '').trim());
  const canSave = dirty && trimmedName.length > 0 && !saving;

  const handleSave = async () => {
    if (!userId || !canSave) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        displayName: trimmedName,
        bio: bio.trim(),
      });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err: unknown) {
      console.error('account save failed', err);
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Check emulator connection.'
      );
    } finally {
      setSaving(false);
    }
  };

  const canChangePassword =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    !changingPassword;

  // Testers start with a password the developer issued. Changing it means only
  // they can sign in as themselves.
  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user?.email || !canChangePassword) return;
    setChangingPassword(true);
    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, currentPassword)
      );
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Password changed', 'Keep it safe. It cannot be reset by email.');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      Alert.alert(
        'Could not change password',
        code.includes('invalid-credential') || code.includes('wrong-password')
          ? 'Your current password is wrong.'
          : 'Check your connection and try again.'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <SettingsDetailLayout title="My Account">
      {!profile ? (
        <View className="items-center py-16">
          <ActivityIndicator color={COLORS.signal} />
        </View>
      ) : (
        <>
          {/* Avatar + identity */}
          <View className="items-center mb-8">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert('Photo coming soon', 'Custom profile photos arrive in a later build.')
              }
            >
              <UserAvatar displayName={profile.displayName} size="xl" />
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-void border border-glass-border items-center justify-center">
                <CameraIcon size={14} color={COLORS.fog} />
              </View>
            </TouchableOpacity>
            <Text className="text-fog/40 text-sm mt-3">@{profile.handle}</Text>
          </View>

          {/* Display Name */}
          <Text className="text-fog/50 text-xs font-bold uppercase tracking-wider mb-1.5 px-1">
            Display Name
          </Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="rgba(242,244,246,0.3)"
            className="bg-black/20 border border-glass-border rounded-xl px-4 py-3 text-fog font-semibold mb-5"
          />

          {/* Handle (read-only) */}
          <Text className="text-fog/50 text-xs font-bold uppercase tracking-wider mb-1.5 px-1">
            Handle
          </Text>
          <View className="bg-black/10 border border-glass-border rounded-xl px-4 py-3 mb-1 flex-row items-center">
            <Text className="text-fog/50 font-semibold">@{profile.handle}</Text>
          </View>
          <Text className="text-fog/30 text-xs mb-5 px-1">
            Your handle is unique and can't be changed yet.
          </Text>

          {/* Bio */}
          <Text className="text-fog/50 text-xs font-bold uppercase tracking-wider mb-1.5 px-1">
            Bio
          </Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Say something about yourself"
            placeholderTextColor="rgba(242,244,246,0.3)"
            multiline
            className="bg-black/20 border border-glass-border rounded-xl px-4 py-3 text-fog h-24 mb-8"
            style={{ textAlignVertical: 'top' }}
          />

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
            className={`rounded-xl py-3.5 flex-row items-center justify-center gap-2 ${
              canSave ? 'bg-signal' : 'bg-glass'
            }`}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.fog} />
            ) : (
              <>
                <CheckIcon size={18} color={canSave ? COLORS.fog : 'rgba(242,244,246,0.3)'} />
                <Text
                  className={`font-bold ${canSave ? 'text-fog' : 'text-fog/30'}`}
                >
                  Save Changes
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Password */}
          <Text className="text-fog/50 text-xs font-bold uppercase tracking-wider mt-10 mb-1.5 px-1">
            Change Password
          </Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor="rgba(242,244,246,0.3)"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            className="bg-black/20 border border-glass-border rounded-xl px-4 py-3 text-fog font-semibold mb-3"
          />
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={`New password (${MIN_PASSWORD_LENGTH}+ characters)`}
            placeholderTextColor="rgba(242,244,246,0.3)"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            className="bg-black/20 border border-glass-border rounded-xl px-4 py-3 text-fog font-semibold mb-4"
          />
          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={!canChangePassword}
            activeOpacity={0.85}
            className={`rounded-xl py-3.5 items-center ${canChangePassword ? 'bg-signal' : 'bg-glass'}`}
          >
            {changingPassword ? (
              <ActivityIndicator color={COLORS.fog} />
            ) : (
              <Text className={`font-bold ${canChangePassword ? 'text-fog' : 'text-fog/30'}`}>
                Change Password
              </Text>
            )}
          </TouchableOpacity>
          <Text className="text-fog/30 text-xs mt-2 mb-6 px-1">
            Your starting password was issued to you. Choose your own so only you can sign in.
          </Text>
        </>
      )}
    </SettingsDetailLayout>
  );
}
