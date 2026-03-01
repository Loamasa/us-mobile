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
import { getEmulatorHost } from '@/config/firebase';

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
      const formatted = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      // ── Emulator path: use REST API to send verification code ──
      const host = getEmulatorHost();
      const url = `http://${host}:9099/identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=fake-api-key`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formatted }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Emulator error: ${res.status} — ${body}`);
      }

      const data = await res.json();

      // Fetch the verification code from the emulator so we can auto-fill it
      let devCode = '';
      try {
        const codesRes = await fetch(
          `http://${host}:9099/emulator/v1/projects/demo-us-app/verificationCodes`
        );
        if (codesRes.ok) {
          const codesData = await codesRes.json();
          // Get the most recent code for this phone number
          const match = codesData.verificationCodes
            ?.reverse()
            ?.find((c: any) => c.phoneNumber === formatted);
          if (match) devCode = match.code;
        }
      } catch {
        // Non-critical — user can still enter code manually
      }

      router.push({
        pathname: '/(auth)/otp',
        params: { phone: formatted, devCode, sessionInfo: data.sessionInfo },
      });
    } catch (err: any) {
      console.error('Phone auth error:', err);
      if (err.message?.includes('Network request failed')) {
        setError('Cannot reach Firebase Emulator. Is it running?\nRun: firebase emulators:start');
      } else {
        setError(err.message ?? 'Failed to send code');
      }
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

        {/* Dev hint */}
        {__DEV__ && (
          <Text className="text-mint/60 text-xs text-center mb-4">
            🧪 Dev mode — uses Firebase Auth Emulator (port 9099)
          </Text>
        )}

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
