import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { COLORS } from '@/config/constants';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  // Simple text-based icons for now — replace with SVG icons later
  const icons: Record<string, string> = {
    map: '🗺️',
    friends: '👥',
    settings: '⚙️',
  };

  return (
    <View className="items-center justify-center">
      <Text className="text-lg">{icons[name] ?? '?'}</Text>
      {focused && (
        <View className="w-1 h-1 rounded-full bg-signal mt-1" />
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.void,
          borderTopColor: COLORS.glassBorder,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.signal,
        tabBarInactiveTintColor: 'rgba(242, 244, 246, 0.25)',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ focused }) => <TabIcon name="friends" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
