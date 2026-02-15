# Expo APIs Reference

## expo-location

```tsx
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

// Watch position (returns subscription)
const sub = await Location.watchPositionAsync(
  { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
  (loc) => updateLocation(loc.coords)
);
// Cleanup: sub.remove()
```

## expo-haptics

```tsx
import * as Haptics from 'expo-haptics';
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

## expo-notifications

```tsx
import * as Notifications from 'expo-notifications';

const token = await Notifications.getExpoPushTokenAsync({ projectId: 'your-project-id' });

const sub = Notifications.addNotificationReceivedListener((notification) => {
  // handle incoming
});
```

## expo-image-picker

```tsx
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true, aspect: [1, 1], quality: 0.8,
});
if (!result.canceled) {
  const uri = result.assets[0].uri;
}
```

## expo-secure-store

```tsx
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('authToken', token);
const token = await SecureStore.getItemAsync('authToken');
```

## App Config (app.config.ts)

```tsx
export default ({ config }) => ({
  ...config,
  extra: {
    firebaseApiKey: process.env.FIREBASE_API_KEY,
    eas: { projectId: 'your-eas-project-id' },
  },
});
```

Access: `Constants.expoConfig?.extra?.firebaseApiKey`
