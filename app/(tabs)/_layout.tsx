import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '@/config/constants';
import { MapIcon, UsersIcon, MessageSquareIcon } from '@/components/ui/icons';

function TabIcon({
  name,
  focused,
}: {
  name: 'chats' | 'map' | 'communities';
  focused: boolean;
}) {
  const iconColor = focused ? COLORS.signal : 'rgba(242,244,246,0.4)';
  const iconSize = 24;

  const Icon = {
    chats: <MessageSquareIcon size={iconSize} color={iconColor} />,
    map: <MapIcon size={iconSize} color={iconColor} />,
    communities: <UsersIcon size={iconSize} color={iconColor} />,
  }[name];

  // Active tab: scale up + signal-blue glow (halo for Android, shadow for iOS).
  return (
    <View
      style={{
        width: 48,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: focused ? 1.12 : 1 }],
      }}
    >
      {focused && (
        <View
          style={{
            position: 'absolute',
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(46,92,255,0.18)',
            shadowColor: COLORS.signal,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 10,
          }}
        />
      )}
      {Icon}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Floating glass bar — absolute so map/chat content blurs through it.
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          elevation: 0,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill} className="overflow-hidden">
            <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
            {/* bg-void/80 overlay over the blur */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(15,17,21,0.8)' },
              ]}
            />
          </View>
        ),
        tabBarActiveTintColor: COLORS.signal,
        tabBarInactiveTintColor: 'rgba(242, 244, 246, 0.4)',
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
          tabBarIcon: ({ focused }) => <TabIcon name="chats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Communities',
          tabBarIcon: ({ focused }) => <TabIcon name="communities" focused={focused} />,
        }}
      />
      {/* Hidden from tab bar — Settings accessed from Chats header gear.
          Not `href: null`: since expo-router 58 that marks the route `hidden`,
          which makes it unreachable (push/URL redirect back to the first tab). */}
      <Tabs.Screen
        name="settings"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}
