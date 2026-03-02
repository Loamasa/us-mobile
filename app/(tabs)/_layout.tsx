import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { COLORS } from '@/config/constants';
import { MapIcon, UsersIcon, SettingsIcon } from '@/components/ui/icons';

function TabIcon({
  name,
  focused,
  color,
}: {
  name: 'map' | 'friends' | 'settings';
  focused: boolean;
  color: string;
}) {
  const iconColor = focused ? COLORS.signal : 'rgba(242,244,246,0.35)';
  const iconSize = 22;

  const Icon = {
    map: <MapIcon size={iconSize} color={iconColor} />,
    friends: <UsersIcon size={iconSize} color={iconColor} />,
    settings: <SettingsIcon size={iconSize} color={iconColor} />,
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
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="map" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="friends" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="settings" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
