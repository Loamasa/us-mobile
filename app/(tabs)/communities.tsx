import { View, Text } from 'react-native';
import { UsersIcon } from '@/components/ui/icons';

export default function CommunitiesScreen() {
  return (
    <View className="flex-1 bg-void items-center justify-center">
      <UsersIcon size={48} color="rgba(242,244,246,0.15)" />
      <Text className="text-fog/40 text-base text-center mt-4">Communities</Text>
      <Text className="text-fog/25 text-sm text-center mt-1">Coming soon</Text>
    </View>
  );
}
