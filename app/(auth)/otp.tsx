import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getUserProfile } from '@/lib/firestore';
import { auth } from '@/config/firebase';

export default function OtpScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const confirmation = (globalThis as any).__phoneConfirmation;
      if (!confirmation) {
        throw new Error('Session expired. Go back and resend code.');
      }

      const result = await confirmation.confirm(code);

      // Check if user already has a profile
      const profile = await getUserProfile(result.user.uid);
      if (profile) {
        router.replace('/(tabs)/map');
      } else {
        router.replace('/(auth)/profile');
      }
    } catch (err: any) {
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
                className={`w-12 h-14 rounded-xl items-center justify-center border ${
                  code.length === i
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
                // Auto-submit when 6 digits entered
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
          className={`rounded-2xl py-4 items-center ${
            loading ? 'bg-signal/50' : 'bg-signal'
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
