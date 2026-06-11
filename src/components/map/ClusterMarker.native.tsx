import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { UsersIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';
import type { MapEntity } from '@/types';

interface ClusterMarkerProps {
  entity: MapEntity;
  onPress?: (entity: MapEntity) => void;
}

// MARKER RENDERING RULES (SDK 54 / new arch, device rounds 1–4, 2026-06-11):
// - never set tracksViewChanges (false = blank bitmap; flipping = bad capture)
// - root child must be `collapsable={false}` with a FIXED size and generous
//   inner margins — Fabric view-flattening plus edge-clipping in the marker
//   bitmap otherwise cuts the content into wedges
// - no looping Animated inside marker children
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
      <View
        collapsable={false}
        style={{
          width: 110,
          height: 110,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
