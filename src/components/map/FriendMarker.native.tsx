import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import UserAvatar from '@/components/UserAvatar';
import type { MapEntity } from '@/types';

interface FriendMarkerProps {
  entity: MapEntity;
  onPress?: (entity: MapEntity) => void;
}

// MARKER RENDERING — FINAL DIAGNOSIS (device round 5, 2026-06-11): custom View
// markers are broken at the LIBRARY level in react-native-maps 1.20.1 on
// Android + New Architecture (clip/flicker/blank — rnm issues #5877, #5655).
// Rounds 1–5 of device evidence match the issue threads; NO JS-side workaround
// exists. Fix = react-native-maps 1.27.x (Fabric-native) + EAS dev build
// (Phase 3 Step 4) — Expo Go bundles 1.20.1 native code and crashes on newer.
// Until then keep: no tracksViewChanges, collapsable={false} fixed-size root,
// no looping Animated (these prevent total invisibility; clipping remains).
export default function FriendMarker({ entity, onPress }: FriendMarkerProps) {
  const friend = entity.friends[0];
  if (!friend) return null;

  return (
    <Marker
      coordinate={{
        latitude: entity.location.lat,
        longitude: entity.location.lng,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress ? () => onPress(entity) : undefined}
    >
      <View
        collapsable={false}
        style={{
          width: 140,
          height: 120,
          alignItems: 'center',
          justifyContent: 'center',
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
    </Marker>
  );
}
