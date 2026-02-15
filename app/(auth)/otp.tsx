import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { signInWithCredential, PhoneAuthProvider } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { getUserProfile } from '@/lib/firestore';
import Constants from 'expo-constants';

/** Get the LAN IP of the dev machine (from Expo's debuggerHost). */
function getEmulatorHost(): string {
  const debuggerHost = Constants.expoConfig?.hostUri ?? 'localhost:8081';
  return debuggerHost.split(':')[0];
}

export default function OtpScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const { phone, devCode } = useLocalSearchParams<{ phone: string; devCode?: string }>();

  // Auto-fill the code in dev mode
  useEffect(() => {
    if (devCode && devCode.length === 6) {
      setCode(devCode);
    }
  }, [devCode]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const sessionInfo = (globalThis as any).__phoneSessionInfo;
      if (!sessionInfo) {
        throw new Error('Session expired. Go back and resend code.');
      }

      // Sign in via the Firebase SDK using the session from the emulator REST API.
      // The SDK is connected to the emulator via connectAuthEmulator,
      // so it will validate the credential against the emulator's session store.
      const credential = PhoneAuthProvider.credential(sessionInfo, code);
      const result = await signInWithCredential(auth, credential);

      // Check if user already has a profile
      const profile = await getUserProfile(result.user.uid);
      if (profile) {
        router.replace('/(tabs)/map');
      } else {
        router.replace('/(auth)/profile');
      }
    } catch (err: any) {
      console.error('OTP verify error:', err);
      setError(err.message ?? 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-void"
    >
      <View className="flex-1 justify-center px-8">
        {/* Header */}
        <Text className="text-fog text-3xl font-bold text-center mb-2">
          Verify
        </Text>
        <Text className="text-fog/50 text-sm text-center mb-12">
          Enter the code sent to {phone}
        </Text>

        {/* Dev hint */}
        {__DEV__ && devCode && (
          <Text className="text-mint/60 text-xs text-center mb-6">
            🧪 Auto-filled code: {devCode}
          </Text>
        )}

        {/* Code Input — hidden input behind visual boxes */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          className="mb-6"
        >
          <View className="flex-row justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                className={`w-12 h-14 rounded-xl items-center justify-center border ${code.length === i
                  ? 'border-signal bg-signal/10'
                  : code[i]
                    ? 'border-fog/30 bg-glass'
                    : 'border-glass-border bg-glass'
                  }`}
              >
                <Text className="text-fog text-2xl font-bold">
                  {code[i] ?? ''}
                </Text>
              </View>
            ))}
          </View>
          <TextInput
            ref={inputRef}
            className="absolute opacity-0 h-0 w-0"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(text) => {
              setCode(text);
              if (text.length === 6) {
                setTimeout(() => handleVerify(), 100);
              }
            }}
            autoFocus
          />
        </TouchableOpacity>

        {/* Error */}
        {error ? (
          <Text className="text-red-400 text-sm text-center mb-4">{error}</Text>
        ) : null}

        {/* Verify Button */}
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center ${loading ? 'bg-signal/50' : 'bg-signal'
            }`}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text className="text-fog font-semibold text-base">
            {loading ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>

        {/* Back */}
        <TouchableOpacity
          className="mt-4 py-2"
          onPress={() => router.back()}
        >
          <Text className="text-fog/50 text-sm text-center">
            Wrong number? Go back
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
