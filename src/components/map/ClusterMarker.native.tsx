import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { UsersIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';
import type { MapEntity } from '@/types';

interface ClusterMarkerProps {
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
