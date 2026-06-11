import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { UsersIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';
import type { MapEntity } from '@/types';

interface ClusterMarkerProps {
  entity: MapEntity;
  onPress?: (entity: MapEntity) => void;
}

// MARKER RENDERING RULES (device-verified 2026-06-11, SDK 54 / new arch):
// - never set tracksViewChanges (false = blank bitmap; flipping = mis-scaled
//   clipped capture)
// - no fixed-size root and NO absolutely-positioned children — both render
//   clipped to quarter-circles in the marker bitmap. Content-sized flexbox
//   columns (like FriendMarker) are the only structure that draws correctly.
// - no looping Animated (continuous bitmap re-capture)
export default function ClusterMarker({ entity, onPress }: ClusterMarkerProps) {
  const count = entity.friends.length;

  return (
    <Marker
      coordinate={{
        latitude: entity.location.lat,
        longitude: entity.location.lng,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress ? () => onPress(entity) : undefined}
    >
      <View style={{ alignItems: 'center' }}>
        {/* Core disc: group icon + member count side by side */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: 'rgba(46, 92, 255, 0.4)',
            borderWidth: 1.5,
            borderColor: COLORS.signal,
          }}
        >
          <UsersIcon size={18} color={COLORS.fog} />
          <Text style={{ color: COLORS.fog, fontSize: 13, fontWeight: '800' }}>
            {count}
          </Text>
        </View>
      </View>
    </Marker>
  );
}
