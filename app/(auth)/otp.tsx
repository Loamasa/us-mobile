import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { signInWithCredential, PhoneAuthProvider } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { getUserProfile } from '@/lib/firestore';
import AuthLayout from '@/components/auth/AuthLayout';

export default function OtpScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const { phone, devCode, sessionInfo } = useLocalSearchParams<{ phone: string; devCode?: string; sessionInfo?: string }>();

  // Auto-fill the code in dev mode
  useEffect(() => {
    if (devCode && devCode.length === 6) {
      setCode(devCode);
    }
  }, [devCode]);

  // Takes the code as an argument: the auto-submit in onChangeText fires from
  // a render where the `code` state is still one digit short (stale closure).
  const handleVerify = async (submitted: string = code) => {
    if (submitted.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!sessionInfo) {
        throw new Error('Session expired. Go back and resend code.');
      }

      // Sign in via the Firebase SDK using the session from the emulator REST API.
      // The SDK is connected to the emulator via connectAuthEmulator,
      // so it will validate the credential against the emulator's session store.
      const credential = PhoneAuthProvider.credential(sessionInfo, submitted);
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
    <AuthLayout
      accent="signal"
      ctaLabel={loading ? 'Verifying...' : 'Verify'}
      onCta={() => handleVerify()}
      ctaDisabled={loading}
    >
      <View className="w-full max-w-[340px]">
        <Text className="text-white text-3xl font-black uppercase tracking-tight mb-2">
          Verify.
        </Text>
        <Text className="text-fog/40 text-sm mb-8">Signal sent to {phone}</Text>

        {/* Dev hint */}
        {__DEV__ && devCode && (
          <Text className="text-mint/60 text-xs text-center mb-4">
            🧪 Auto-filled code: {devCode}
          </Text>
        )}

        {/* Code input — hidden input behind visual boxes (6 digits: Firebase emulator codes) */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          className="mb-8"
        >
          <View className="flex-row justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                className={`w-12 h-16 rounded-xl items-center justify-center border ${
                  code[i]
                    ? 'bg-white border-white'
                    : code.length === i
                      ? 'border-signal bg-signal/10'
                      : 'border-glass-border bg-glass'
                }`}
              >
                <Text
                  className={`text-2xl font-bold ${code[i] ? 'text-black' : 'text-fog'}`}
                >
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
                setTimeout(() => handleVerify(text), 100);
              }
            }}
            autoFocus
          />
        </TouchableOpacity>

        {/* Error */}
        {error ? (
          <Text className="text-red-400 text-sm text-center mb-4">{error}</Text>
        ) : null}

        {/* Back */}
        <TouchableOpacity className="py-2" onPress={() => router.back()}>
          <Text className="text-fog/40 text-xs text-center">
            Wrong number? Retarget.
          </Text>
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}
