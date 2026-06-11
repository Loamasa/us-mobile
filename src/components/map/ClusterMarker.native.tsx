import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { UsersIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';
import type { MapEntity } from '@/types';

interface ClusterMarkerProps {
  entity: MapEntity;
  onPress?: (entity: MapEntity) => void;
}

// NOTE: never set tracksViewChanges (see FriendMarker.native.tsx). The ring
// stays a static halo — a looping Animated pulse inside a marker bitmap
// burns CPU re-capturing every frame.
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
