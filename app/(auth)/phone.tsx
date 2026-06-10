import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { getEmulatorHost } from '@/config/firebase';
import AuthLayout from '@/components/auth/AuthLayout';
import { SmartphoneIcon } from '@/components/ui/icons';

export default function PhoneScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
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
    <AuthLayout
      accent="signal"
      ctaLabel={loading ? 'Sending...' : 'Send Code'}
      onCta={handleSendCode}
      ctaDisabled={loading}
    >
      <View className="w-full max-w-[320px]">
        <Text className="text-white text-3xl font-black uppercase tracking-tight mb-2">
          Enter the{'\n'}Void.
        </Text>
        <Text className="text-fog/40 text-xs uppercase tracking-[3px] mb-8">
          No passwords. Just you.
        </Text>

        <Text className="text-signal text-xs font-bold uppercase tracking-[3px] mb-2">
          Mobile Number
        </Text>
        <View
          className={`bg-glass border rounded-2xl px-4 py-4 flex-row items-center gap-3 ${
            focused ? 'border-signal/50 bg-white/10' : 'border-glass-border'
          }`}
        >
          <SmartphoneIcon size={20} color="#6B7280" />
          <TextInput
            className="flex-1 text-fog text-lg"
            placeholder="+46 70 123 4567"
            placeholderTextColor="rgba(242, 244, 246, 0.3)"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus
          />
        </View>

        {/* Dev hint */}
        {__DEV__ && (
          <Text className="text-mint/60 text-xs text-center mt-4">
            🧪 Dev mode — uses Firebase Auth Emulator (port 9099)
          </Text>
        )}

        {/* Error */}
        {error ? (
          <Text className="text-red-400 text-sm text-center mt-4">{error}</Text>
        ) : null}
      </View>
    </AuthLayout>
  );
}
