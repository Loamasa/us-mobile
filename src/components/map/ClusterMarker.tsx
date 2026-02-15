import { View, Text } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import type { MapEntity } from '@/types';

interface ClusterMarkerProps {
  entity: MapEntity;
}

export default function ClusterMarker({ entity }: ClusterMarkerProps) {
  const count = entity.friends.length;

  return (
    <Marker
      coordinate={{
        latitude: entity.location.lat,
        longitude: entity.location.lng,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View className="items-center">
        {/* Pulsing Glow */}
        <View className="w-[60px] h-[60px] rounded-full bg-signal/20 items-center justify-center">
          <View className="w-[50px] h-[50px] rounded-full bg-signal/30 items-center justify-center">
            {/* Group Icon */}
            <Text className="text-2xl">👥</Text>
          </View>
        </View>

        {/* Count Badge */}
        <View className="absolute -top-1 -right-1 bg-signal rounded-full w-6 h-6 items-center justify-center">
          <Text className="text-fog text-xs font-bold">{count}</Text>
        </View>

        {/* Label */}
        <Text className="text-fog/70 text-[10px] mt-1">
          {count} Friends
        </Text>
      </View>

      <Callout>
        <View className="p-2 min-w-[150px]">
          <Text className="text-base font-bold">{count} Friends Here</Text>
          {entity.friends.slice(0, 5).map((f) => (
            <Text key={f.userId} className="text-sm text-gray-600">
              {f.displayName}
              {f.signal ? ` ${f.signal.emoji}` : ''}
            </Text>
          ))}
          {count > 5 && (
            <Text className="text-sm text-gray-400">
              +{count - 5} more
            </Text>
          )}
        </View>
      </Callout>
    </Marker>
  );
}
