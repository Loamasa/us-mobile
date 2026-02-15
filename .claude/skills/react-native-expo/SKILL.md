---
name: react-native-expo
description: React Native + Expo SDK 54 development patterns. Use when creating screens, navigation, native features, styling with NativeWind v4, platform-specific code, FlatList optimization, or working with Expo Router file-based routing. Covers Expo APIs, EAS Build, and mobile-specific patterns.
---

# React Native + Expo SDK 54

## Project Setup

- Expo SDK 54, Expo Router (file-based routing)
- NativeWind v4 for styling (`className` prop)
- Dark mode only, glass morphism design system
- Target: iOS + Android

## Expo Router

### File structure = routes

```
app/
  _layout.tsx          # Root layout (providers, fonts)
  (tabs)/
    _layout.tsx        # Tab navigator
    index.tsx          # Map tab (default)
    friends.tsx        # Friends tab
    profile.tsx        # Profile tab
  (auth)/
    _layout.tsx        # Auth stack
    sign-in.tsx
    sign-up.tsx
  modal.tsx            # Modal route
```

### Layout pattern

```tsx
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#0F1115' } }}>
      <Tabs.Screen name="index" options={{ title: 'Map', tabBarIcon: MapIcon }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends', tabBarIcon: UsersIcon }} />
    </Tabs>
  );
}
```

### Navigation

```tsx
import { router } from 'expo-router';

router.push('/profile');
router.replace('/(auth)/sign-in');
router.back();
router.push({ pathname: '/user/[id]', params: { id: uid } });
```

## NativeWind v4

### Always use className, never style

```tsx
<View className="flex-1 bg-void px-4 pt-safe">
  <Text className="text-fog text-lg font-semibold">Hello</Text>
</View>
```

### Glass morphism

```tsx
<View className="bg-glass border border-glass-border rounded-2xl p-4">
  <Text className="text-fog">Card content</Text>
</View>
```

## Performance

### FlatList

```tsx
<FlatList
  data={friends}
  keyExtractor={(item) => item.uid}
  renderItem={renderFriendItem}       // useCallback ref
  getItemLayout={(_, index) => ({     // fixed height optimization
    length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index,
  })}
  removeClippedSubviews
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

### Images -- use expo-image

```tsx
import { Image } from 'expo-image';

<Image source={{ uri: user.photoURL }} placeholder={blurhash}
  contentFit="cover" transition={200} className="w-12 h-12 rounded-full" />
```

### Avoid
- Inline functions in renderItem
- Nesting ScrollView inside FlatList
- `Animated` API -- use `react-native-reanimated`
- Large images without caching

## Platform Code

```tsx
import { Platform } from 'react-native';
const isIOS = Platform.OS === 'ios';

// Or use platform files: MapView.ios.tsx / MapView.android.tsx
```

## Detailed Reference

For Expo APIs (location, notifications, haptics), see `references/expo-apis.md`.
For safe area and keyboard handling, see `references/layout-patterns.md`.
