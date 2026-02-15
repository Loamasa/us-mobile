import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  signInWithPhoneNumber,
  type ApplicationVerifier,
} from 'firebase/auth';
import { auth } from '@/config/firebase';

/**
 * Minimal mock verifier for Firebase Auth Emulator.
 * The emulator accepts any token — no real reCAPTCHA needed.
 * This avoids the "Failed to initialize reCAPTCHA Enterprise config" error
 * that occurs because there's no browser DOM in React Native / Expo Go.
 */
const emulatorVerifier: ApplicationVerifier = {
  type: 'recaptcha',
  verify: () => Promise.resolve('emulator-mock-token'),
};

export default function PhoneScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError('Enter your phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Format phone number (ensure it starts with +)
      const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      // In dev mode (emulator), use a mock verifier that skips reCAPTCHA.
      // In production, this will need a real RecaptchaVerifier or a switch
      // to @react-native-firebase/auth (native SDK).
      const confirmation = await signInWithPhoneNumber(
        auth,
        formatted,
        emulatorVerifier as ApplicationVerifier
      );

      // Store confirmation result for OTP screen
      // Using a simple global for now — in production, use context or state management
      (globalThis as any).__phoneConfirmation = confirmation;

      router.push({
        pathname: '/(auth)/otp',
        params: { phone: formatted },
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to send code');
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
        {/* Logo */}
        <Text className="text-fog text-5xl font-bold text-center mb-2">us</Text>
        <Text className="text-fog/50 text-sm text-center tracking-[4px] uppercase mb-16">
          Enter the Void
        </Text>

        {/* Phone Input */}
        <View className="mb-6">
          <Text className="text-fog/70 text-sm mb-2 ml-1">Phone Number</Text>
          <View className="bg-glass border border-glass-border rounded-2xl px-4 py-4 flex-row items-center">
            <Text className="text-fog/50 text-lg mr-2">📱</Text>
            <TextInput
              className="flex-1 text-fog text-lg"
              placeholder="+46 70 123 4567"
              placeholderTextColor="rgba(242, 244, 246, 0.3)"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoFocus
            />
          </View>
        </View>

        {/* Error */}
        {error ? (
          <Text className="text-red-400 text-sm text-center mb-4">{error}</Text>
        ) : null}

        {/* Send Code Button */}
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center ${loading ? 'bg-signal/50' : 'bg-signal'
            }`}
          onPress={handleSendCode}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text className="text-fog font-semibold text-base">
            {loading ? 'Sending...' : 'Send Code'}
          </Text>
        </TouchableOpacity>

        {/* Privacy Note */}
        <Text className="text-fog/30 text-xs text-center mt-8 px-4">
          Your phone number is only used for authentication.{'\n'}
          We never share your data with third parties.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
