# Layout Patterns

## Safe Area

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-void" edges={['top']}>
      {/* content */}
    </SafeAreaView>
  );
}
```

NativeWind shorthand: `pt-safe`, `pb-safe`, `px-safe`

## Keyboard Handling

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  className="flex-1"
  keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
>
  <ScrollView>{/* form fields */}</ScrollView>
</KeyboardAvoidingView>
```

## Bottom Sheet

```tsx
import BottomSheet from '@gorhom/bottom-sheet';

const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

<BottomSheet
  ref={bottomSheetRef} index={-1} snapPoints={snapPoints}
  enablePanDownToClose
  backgroundStyle={{ backgroundColor: '#0F1115' }}
  handleIndicatorStyle={{ backgroundColor: '#F2F4F6' }}
>
  {/* content */}
</BottomSheet>
```

## Screen Template

```tsx
export default function ScreenName() {
  return (
    <SafeAreaView className="flex-1 bg-void" edges={['top']}>
      <View className="px-4 py-3 flex-row items-center justify-between">
        <Text className="text-fog text-xl font-bold">Title</Text>
      </View>
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-safe">
        {/* content */}
      </ScrollView>
    </SafeAreaView>
  );
}
```
