import { View, Text } from 'react-native';
import MapMarker from '@/components/map/MapMarker';
import { UsersIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';
import type { MapEntity } from '@/types';

interface ClusterMarkerProps {
  entity: MapEntity;
  onPress?: (entity: MapEntity) => void;
}

// Marker views render natively through MapLibre (MapMarker). Keep the
// fixed-size root: it sets the tap target and keeps the anchor centered.
export default function ClusterMarker({ entity, onPress }: ClusterMarkerProps) {
  const count = entity.friends.length;

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
    </MapMarker>
  );
}
