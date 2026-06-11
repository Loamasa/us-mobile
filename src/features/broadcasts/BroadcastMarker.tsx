import { View, Text } from 'react-native';
// Resolves to the dev shim on web via metro.config.js.
import { Marker } from 'react-native-maps';
import { COLORS } from '@/config/constants';
import type { Broadcast } from '@/types';

interface BroadcastMarkerProps {
  broadcast: Broadcast;
  /** True while the viewer is invited but hasn't accepted yet. */
  invite: boolean;
  onPress?: (broadcast: Broadcast) => void;
}

// MARKER RENDERING RULES: no tracksViewChanges, no fixed-size root, no
// absolutely-positioned children, no looping Animated — see
// ClusterMarker.native.tsx for the device evidence (2026-06-11).
export default function BroadcastMarker({
  broadcast,
  invite,
  onPress,
}: BroadcastMarkerProps) {
  const count = broadcast.memberIds.length;

  return (
    <Marker
      coordinate={{
        latitude: broadcast.location.latitude,
        longitude: broadcast.location.longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress ? () => onPress(broadcast) : undefined}
    >
      <View style={{ alignItems: 'center' }}>
        {/* Emoji disc */}
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: invite
              ? 'rgba(244,114,182,0.15)'
              : 'rgba(244,114,182,0.35)',
            borderWidth: 1.5,
            borderStyle: invite ? 'dashed' : 'solid',
            borderColor: COLORS.rose,
          }}
        >
          <Text style={{ fontSize: 22 }}>{broadcast.emoji}</Text>
        </View>

        {/* Status pill under the disc */}
        <View
          style={{
            marginTop: 3,
            backgroundColor: COLORS.rose,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              color: '#0F1115',
              fontSize: 8,
              fontWeight: '800',
              letterSpacing: 0.5,
            }}
          >
            {invite ? 'INVITE' : count > 1 ? `${count} IN` : 'GATHERING'}
          </Text>
        </View>
      </View>
    </Marker>
  );
}
