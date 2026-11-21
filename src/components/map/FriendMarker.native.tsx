import { View, Text } from 'react-native';
import MapMarker from '@/components/map/MapMarker';
import UserAvatar from '@/components/UserAvatar';
import type { MapEntity } from '@/types';

interface FriendMarkerProps {
  entity: MapEntity;
  onPress?: (entity: MapEntity) => void;
}

// Marker views render natively through MapLibre (MapMarker). Keep the
// fixed-size root: it sets the tap target and keeps the anchor centered.
export default function FriendMarker({ entity, onPress }: FriendMarkerProps) {
  const friend = entity.friends[0];
  if (!friend) return null;

  // Stale = the location doc froze (app killed > LOCATION_STALE_MS ago).
  // Dim the whole marker; the root keeps its FIXED size (marker rule) and
  // the status dot reads offline via friend.isOnline. FriendCard says
  // "LAST SEEN Xm AGO" on tap.
  const stale = entity.stale === true;

  return (
    <MapMarker
      coordinate={{
        latitude: entity.location.lat,
        longitude: entity.location.lng,
      }}
      onPress={onPress ? () => onPress(entity) : undefined}
    >
      <View
        collapsable={false}
        style={{
          width: 140,
          height: 120,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: stale ? 0.45 : 1,
        }}
      >
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
    </MapMarker>
  );
}
