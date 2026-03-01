import { Stack } from 'expo-router';
import { COLORS } from '@/config/constants';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.void },
        animation: 'slide_from_right',
      }}
    />
  );
}
