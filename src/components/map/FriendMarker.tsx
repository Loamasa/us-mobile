import { View, Text } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import type { MapEntity } from '@/types';

interface FriendMarkerProps {
  entity: MapEntity;
}

export default function FriendMarker({ entity }: FriendMarkerProps) {
  const friend = entity.friends[0];
  if (!friend) return null;

  return (
    <Marker
      coordinate={{
        latitude: entity.location.lat,
        longitude: entity.location.lng,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View className="items-center">
        {/* Signal Badge */}
        {entity.signal && (
          <View className="bg-void/80 border border-rose/40 rounded-full px-2 py-1 mb-1 flex-row items-center">
            <Text className="text-xs">{entity.signal.emoji}</Text>
            <Text className="text-fog text-[10px] ml-1">{entity.signal.text}</Text>
          </View>
        )}

        {/* Avatar */}
        <View className="relative">
          <View
            className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
              entity.signal ? 'border-rose bg-rose/20' : 'border-signal bg-signal/20'
            }`}
          >
            {friend.avatarUrl ? (
              <Text className="text-lg">👤</Text>
            ) : (
              <Text className="text-fog text-sm font-bold">
                {friend.displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Online Indicator */}
          {friend.isOnline && (
            <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-mint border-2 border-void" />
          )}
        </View>

        {/* Name */}
        <Text className="text-fog/70 text-[10px] mt-1">{friend.displayName.split(' ')[0]}</Text>
      </View>

      <Callout>
        <View className="p-2 min-w-[120px]">
          <Text className="text-base font-bold">{friend.displayName}</Text>
          {entity.signal && (
            <Text className="text-sm text-gray-600 mt-1">
              {entity.signal.emoji} {entity.signal.text}
            </Text>
          )}
        </View>
      </Callout>
    </Marker>
  );
}
