import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import UserAvatar from '@/components/UserAvatar';
import { useMarkerTracksViewChanges } from '@/components/map/useMarkerTracksViewChanges';
import type { MapEntity } from '@/types';

interface FriendMarkerProps {
  entity: MapEntity;
  onPress?: (entity: MapEntity) => void;
}

export default function FriendMarker({ entity, onPress }: FriendMarkerProps) {
  const friend = entity.friends[0];
  const tracksViewChanges = useMarkerTracksViewChanges(
    [
      friend?.userId,
      friend?.displayName,
      friend?.isOnline,
      entity.signal?.emoji,
      entity.signal?.text,
    ].join('|')
  );
  if (!friend) return null;

  return (
    <Marker
      coordinate={{
        latitude: entity.location.lat,
        longitude: entity.location.lng,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress ? () => onPress(entity) : undefined}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={{ alignItems: 'center' }}>
        {/* Signal Badge */}
        {entity.signal && (
          <View
            style={{
              backgroundColor: 'rgba(15,17,21,0.8)',
              borderWidth: 1,
              borderColor: 'rgba(244,114,182,0.4)',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginBottom: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 11 }}>{entity.signal.emoji}</Text>
            <Text style={{ color: '#F2F4F6', fontSize: 10 }}>{entity.signal.text}</Text>
          </View>
        )}

        {/* Avatar with online indicator; rose tint when signal is active */}
        <UserAvatar
          displayName={friend.displayName}
          size="md"
          showStatus
          status={friend.isOnline ? 'online' : 'offline'}
          tint={entity.signal ? 'rose' : 'signal'}
        />

        {/* Name label */}
        <Text
          style={{
            color: 'rgba(242,244,246,0.7)',
            fontSize: 10,
            marginTop: 3,
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}
        >
          {friend.displayName.split(' ')[0]}
        </Text>
      </View>
    </Marker>
  );
}
