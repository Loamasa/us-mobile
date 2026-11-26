import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import * as Location from 'expo-location';
import { auth, db } from '@/config/firebase';
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

  // Permission already granted → straight to the map. Otherwise only a truly
  // fresh account (no spots yet) gets the first-run permissions → spots flow;
  // a returning user goes to the map, where the location permission is
  // requested natively anyway. One-shot read is fine here (imperative
  // post-login check, not reactive UI). Same for testers and guests.
  const routeAfterSignIn = async (uid: string) => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      router.replace('/(tabs)/map');
      return;
    }
    const spotsSnap = await getDocs(query(collection(db, 'users', uid, 'spots'), limit(1)));
    router.replace(spotsSnap.empty ? '/(auth)/permissions' : '/(tabs)/map');
  };

  // Guest = Firebase anonymous account + a random @guest_xxxxxx handle so friends can add it.
  // The account lives only on this device: signing out loses it for good.
  const handleGuest = async () => {
    setLoading(true);
    setError('');
    try {
      const { user } = await signInAnonymously(auth);
      if (!(await getDoc(doc(db, 'users', user.uid))).exists()) {
        let handle = '';
        // Handles are create-only in the rules, so a taken one fails; try a few.
        for (let i = 0; i < 5 && !handle; i++) {
          const candidate = `guest_${Math.random().toString(36).slice(2, 8)}`;
          try {
            await setDoc(doc(db, 'handles', candidate), { userId: user.uid });
            handle = candidate;
          } catch {
            // taken, try another
          }
        }
        if (!handle) throw new Error('Could not reserve a guest handle. Try again.');
        await setDoc(doc(db, 'users', user.uid), {
          displayName: 'Guest',
          handle,
          avatarUrl: null,
          bio: '',
          phoneNumber: '',
          createdAt: serverTimestamp(),
          settings: { globalLocationSharing: true, allowFriendRequests: true, showOnlineStatus: true },
          currentSignal: null,
        });
      }
      await routeAfterSignIn(user.uid);
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code.includes('operation-not-allowed') || code.includes('admin-restricted-operation')) {
        setError('Guest access is turned off right now.');
      } else if (err?.message?.includes('Network')) {
        setError("Can't reach the server. Check your connection.");
      } else {
        setError(err?.message ?? 'Guest sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

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
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await routeAfterSignIn(cred.user.uid);
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

        <Pressable
          onPress={handleGuest}
          disabled={loading}
          accessibilityRole="button"
          className="mt-6 py-3 rounded-2xl border border-glass-border items-center"
        >
          <Text className="text-fog/70 text-sm font-bold uppercase tracking-[2px]">
            Continue as guest
          </Text>
          <Text className="text-fog/30 text-[10px] mt-1">
            No password. Signing out deletes access to this account.
          </Text>
        </Pressable>

        {/* Error */}
        {error ? (
          <Text className="text-red-400 text-sm text-center mt-4">{error}</Text>
        ) : null}
      </View>
    </AuthLayout>
  );
}
