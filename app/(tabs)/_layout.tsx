import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { COLORS } from '@/config/constants';
import { MapIcon, UsersIcon, MessageSquareIcon } from '@/components/ui/icons';

function TabIcon({
  name,
  focused,
}: {
  name: 'chats' | 'map' | 'communities';
  focused: boolean;
}) {
  const iconColor = focused ? COLORS.signal : 'rgba(242,244,246,0.35)';
  const iconSize = 22;

  const Icon = {
    chats: <MessageSquareIcon size={iconSize} color={iconColor} />,
    map: <MapIcon size={iconSize} color={iconColor} />,
    communities: <UsersIcon size={iconSize} color={iconColor} />,
  }[name];

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {Icon}
      {focused && (
        <View
          style={{
            marginTop: 4,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: COLORS.signal,
            shadowColor: COLORS.signal,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
          }}
        />
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
          backgroundColor: 'rgba(15,17,21,0.95)',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.signal,
        tabBarInactiveTintColor: 'rgba(242, 244, 246, 0.35)',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="chats" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="map" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Communities',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="communities" focused={focused} />
          ),
        }}
      />
      {/* Hidden from tab bar — Settings accessed from Chats header gear */}
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
