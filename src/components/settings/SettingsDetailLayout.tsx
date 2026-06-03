import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeftIcon } from '@/components/ui/icons';

interface SettingsDetailLayoutProps {
  title: string;
  /** Optional intro line under the header. */
  subtitle?: string;
  children: ReactNode;
}

/**
 * Full-screen scaffold for a settings detail view: back-button header + title,
 * then a scrollable body. Mirrors the chat detail screen's own-header pattern
 * (these routes live outside the (tabs) group, so there is no tab bar).
 */
export default function SettingsDetailLayout({
  title,
  subtitle,
  children,
}: SettingsDetailLayoutProps) {
  const router = useRouter();

  return (
    <View className="flex-1 bg-void">
      <View className="flex-row items-center px-4 pt-14 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          activeOpacity={0.7}
          className="mr-3 w-9 h-9 items-center justify-center rounded-full bg-glass border border-glass-border"
        >
          <ArrowLeftIcon size={20} color="#F2F4F6" />
        </TouchableOpacity>
        <Text className="text-fog text-xl font-bold">{title}</Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="pb-12"
        keyboardShouldPersistTaps="handled"
      >
        {subtitle ? (
          <Text className="text-fog/40 text-sm mb-5 px-2">{subtitle}</Text>
        ) : null}
        {children}
      </ScrollView>
    </View>
  );
}
