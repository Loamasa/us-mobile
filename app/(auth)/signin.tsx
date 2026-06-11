import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import * as Location from 'expo-location';
import { auth } from '@/config/firebase';
import { TESTER_EMAIL_DOMAIN } from '@/config/constants';
import AuthLayout from '@/components/auth/AuthLayout';
import { UserIcon, ShieldIcon } from '@/components/ui/icons';

/**
 * Tester sign-in (Phase 3 — fixed pre-provisioned accounts, no self-registration).
 * Accounts come from src/dev/provisionTesters.js; testers get an Account ID +
 * password out-of-band. Bare IDs are mapped to {id}@TESTER_EMAIL_DOMAIN; a full
 * email is also accepted. Display name is editable later in Settings → My Account.
 */
export default function SignInScreen() {
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<'id' | 'password' | null>(null);
  const router = useRouter();

  const handleSignIn = async () => {
    const id = accountId.trim().toLowerCase();
    if (!id || !password) {
      setError('Enter your account ID and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const email = id.includes('@') ? id : `${id}@${TESTER_EMAIL_DOMAIN}`;
      await signInWithEmailAndPassword(auth, email, password);

      // First run on this device → ask for location; otherwise straight to the map.
      const { status } = await Location.getForegroundPermissionsAsync();
      router.replace(status === 'granted' ? '/(tabs)/map' : '/(auth)/permissions');
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (
        code.includes('invalid-credential') ||
        code.includes('wrong-password') ||
        code.includes('user-not-found') ||
        code.includes('invalid-email')
      ) {
        setError('Wrong account ID or password.');
      } else if (code.includes('too-many-requests')) {
        setError('Too many attempts — wait a minute and try again.');
      } else if (err?.message?.includes('Network')) {
        setError("Can't reach the server. Check your connection.");
      } else {
        setError(err?.message ?? 'Sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      accent="signal"
      ctaLabel={loading ? 'Signing in...' : 'Sign In'}
      onCta={handleSignIn}
      ctaDisabled={loading}
      secondaryLabel={__DEV__ ? 'Dev: phone sign-in' : undefined}
      onSecondary={__DEV__ ? () => router.push('/(auth)/phone') : undefined}
    >
      <View className="w-full max-w-[320px]">
        <Text className="text-white text-3xl font-black uppercase tracking-tight mb-2">
          Enter the{'\n'}Void.
        </Text>
        <Text className="text-fog/40 text-xs uppercase tracking-[3px] mb-8">
          Tester access — use the ID you were given.
        </Text>

        {/* Account ID */}
        <Text className="text-signal text-xs font-bold uppercase tracking-[3px] mb-2">
          Account ID
        </Text>
        <View
          className={`bg-glass border rounded-2xl px-4 py-4 flex-row items-center gap-3 mb-6 ${
            focusedField === 'id' ? 'border-signal/50 bg-white/10' : 'border-glass-border'
          }`}
        >
          <UserIcon size={20} color="#6B7280" />
          <TextInput
            className="flex-1 text-fog text-lg"
            placeholder="tester01"
            placeholderTextColor="rgba(242, 244, 246, 0.3)"
            value={accountId}
            onChangeText={setAccountId}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocusedField('id')}
            onBlur={() => setFocusedField(null)}
            autoFocus
          />
        </View>

        {/* Password */}
        <Text className="text-signal text-xs font-bold uppercase tracking-[3px] mb-2">
          Password
        </Text>
        <View
          className={`bg-glass border rounded-2xl px-4 py-4 flex-row items-center gap-3 ${
            focusedField === 'password' ? 'border-signal/50 bg-white/10' : 'border-glass-border'
          }`}
        >
          <ShieldIcon size={20} color="#6B7280" />
          <TextInput
            className="flex-1 text-fog text-lg"
            placeholder="••••••••"
            placeholderTextColor="rgba(242, 244, 246, 0.3)"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            onSubmitEditing={handleSignIn}
          />
        </View>

        <Text className="text-fog/30 text-xs mt-4">
          You can change your display name anytime in Settings → My Account.
        </Text>

        {/* Error */}
        {error ? (
          <Text className="text-red-400 text-sm text-center mt-4">{error}</Text>
        ) : null}
      </View>
    </AuthLayout>
  );
}
