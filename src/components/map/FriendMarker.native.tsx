import { View, Text } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import UserAvatar from '@/components/UserAvatar';
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

        {/* Avatar with online indicator */}
        <UserAvatar
          displayName={friend.displayName}
          size="md"
          showStatus
          status={friend.isOnline ? 'online' : 'offline'}
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

      <Callout>
        <View style={{ padding: 8, minWidth: 120 }}>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>{friend.displayName}</Text>
          {entity.signal && (
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
              {entity.signal.emoji} {entity.signal.text}
            </Text>
          )}
        </View>
      </Callout>
    </Marker>
  );
}
