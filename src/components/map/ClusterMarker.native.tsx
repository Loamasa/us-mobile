import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { UsersIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';
import { useMarkerTracksViewChanges } from '@/components/map/useMarkerTracksViewChanges';
import type { MapEntity } from '@/types';

interface ClusterMarkerProps {
  entity: MapEntity;
  onPress?: (entity: MapEntity) => void;
}

export default function ClusterMarker({ entity, onPress }: ClusterMarkerProps) {
  const count = entity.friends.length;
  // Android snapshots marker children to a bitmap, so a looping Animated pulse
  // can never play inside a Marker — the ring is a static halo instead.
  const tracksViewChanges = useMarkerTracksViewChanges(String(count));

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
      <View style={{ alignItems: 'center', width: 72, height: 80 }}>
        {/* Static halo ring */}
        <View
          style={{
            position: 'absolute',
            top: 1,
            width: 66,
            height: 66,
            borderRadius: 33,
            backgroundColor: COLORS.signal,
            opacity: 0.18,
          }}
        />

        {/* Core disc with group icon */}
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            marginTop: 9,
            backgroundColor: 'rgba(46, 92, 255, 0.35)',
            borderWidth: 1.5,
            borderColor: COLORS.signal,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <UsersIcon size={22} color={COLORS.fog} />
        </View>

        {/* Count badge */}
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: 6,
            backgroundColor: COLORS.signal,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: COLORS.fog, fontSize: 11, fontWeight: '700' }}>
            {count}
          </Text>
        </View>
      </View>
    </Marker>
  );
}
