import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '@/config/firebase';
import { isHandleAvailable, reserveHandle } from '@/lib/firestore';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-void"
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text className="text-fog text-3xl font-bold text-center mb-2">
          Identity
        </Text>
        <Text className="text-fog/50 text-sm text-center tracking-[2px] uppercase mb-12">
          Who are you in the dark?
        </Text>

        {/* Avatar Placeholder */}
        <TouchableOpacity className="self-center mb-8">
          <View className="w-24 h-24 rounded-full bg-glass border-2 border-glass-border items-center justify-center">
            <Text className="text-4xl">👤</Text>
          </View>
          <Text className="text-signal text-xs text-center mt-2">Add Photo</Text>
        </TouchableOpacity>

        {/* Display Name */}
        <View className="mb-4">
          <Text className="text-fog/70 text-sm mb-2 ml-1">Display Name</Text>
          <View className="bg-glass border border-glass-border rounded-2xl px-4 py-4">
            <TextInput
              className="text-fog text-lg"
              placeholder="Your name"
              placeholderTextColor="rgba(242, 244, 246, 0.3)"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Handle */}
        <View className="mb-6">
          <Text className="text-fog/70 text-sm mb-2 ml-1">Handle</Text>
          <View className="bg-glass border border-glass-border rounded-2xl px-4 py-4 flex-row items-center">
            <Text className="text-fog/50 text-lg mr-1">@</Text>
            <TextInput
              className="flex-1 text-fog text-lg"
              placeholder="yourhandle"
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
          <Text className="text-red-400 text-sm text-center mb-4">{error}</Text>
        ) : null}

        {/* Continue */}
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center ${loading ? 'bg-signal/50' : 'bg-signal'
            }`}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text className="text-fog font-semibold text-base">
            {loading ? 'Creating...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
