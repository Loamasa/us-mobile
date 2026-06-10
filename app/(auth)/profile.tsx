import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '@/config/firebase';
import { isHandleAvailable, reserveHandle } from '@/lib/firestore';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import AuthLayout from '@/components/auth/AuthLayout';
import { UserIcon, ZapIcon } from '@/components/ui/icons';

export default function ProfileScreen() {
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const sanitizeHandle = (text: string): string => {
    return text.toLowerCase().replace(/[^a-z0-9_]/g, '');
  };

  const checkHandle = async (value: string) => {
    const sanitized = sanitizeHandle(value);
    setHandle(sanitized);

    if (sanitized.length < 3) {
      setHandleStatus('idle');
      return;
    }

    setHandleStatus('checking');
    const available = await isHandleAvailable(sanitized, auth.currentUser?.uid);
    setHandleStatus(available ? 'available' : 'taken');
  };

  const handleContinue = async () => {
    if (!displayName.trim()) {
      setError('Enter your name');
      return;
    }
    if (handle.length < 3) {
      setError('Handle must be at least 3 characters');
      return;
    }
    if (handleStatus !== 'available') {
      setError('Handle is not available');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Reserve the handle
      await reserveHandle(handle, user.uid);

      // Create user profile
      await setDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        handle,
        avatarUrl: '',
        bio: '',
        phoneNumber: user.phoneNumber ?? '',
        createdAt: serverTimestamp(),
        settings: {
          globalLocationSharing: true,
          allowFriendRequests: true,
          showOnlineStatus: true,
        },
        currentSignal: null,
      });

      router.replace('/(auth)/permissions');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      accent="signal"
      ctaLabel={loading ? 'Creating...' : 'Initialize Profile'}
      onCta={handleContinue}
      ctaDisabled={loading}
    >
      <View className="w-full max-w-[320px]">
        <Text className="text-white text-3xl font-black uppercase tracking-tight mb-2">
          Identity.
        </Text>
        <Text className="text-fog/40 text-sm mb-8">Who are you in the dark?</Text>

        {/* Avatar — dashed border + Zap badge (prototype parity) */}
        <TouchableOpacity className="self-center mb-8" activeOpacity={0.7}>
          <View className="w-24 h-24 rounded-full bg-glass border-2 border-dashed border-white/20 items-center justify-center">
            <UserIcon size={32} color="#9CA3AF" />
          </View>
          <View className="absolute bottom-0 right-0 bg-signal p-1.5 rounded-full">
            <ZapIcon size={12} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Display Name */}
        <View className="mb-6">
          <Text className="text-signal text-xs font-bold uppercase tracking-[3px] mb-2">
            Display Name
          </Text>
          <View className="bg-glass border border-glass-border rounded-2xl px-4 py-3">
            <TextInput
              className="text-fog text-lg"
              placeholder="Jane Doe"
              placeholderTextColor="rgba(242, 244, 246, 0.3)"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Handle */}
        <View className="mb-2">
          <Text className="text-signal text-xs font-bold uppercase tracking-[3px] mb-2">
            Handle
          </Text>
          <View className="bg-glass border border-glass-border rounded-2xl px-4 py-3 flex-row items-center">
            <Text className="text-fog/50 text-lg mr-1">@</Text>
            <TextInput
              className="flex-1 text-fog text-lg"
              placeholder="jane"
              placeholderTextColor="rgba(242, 244, 246, 0.3)"
              value={handle}
              onChangeText={checkHandle}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {handleStatus === 'checking' && (
              <Text className="text-fog/50 text-sm">...</Text>
            )}
            {handleStatus === 'available' && (
              <Text className="text-mint text-sm">✓</Text>
            )}
            {handleStatus === 'taken' && (
              <Text className="text-red-400 text-sm">Taken</Text>
            )}
          </View>
        </View>

        {/* Error */}
        {error ? (
          <Text className="text-red-400 text-sm text-center mt-4">{error}</Text>
        ) : null}
      </View>
    </AuthLayout>
  );
}
