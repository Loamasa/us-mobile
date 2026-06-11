import { View, Text } from 'react-native';
// Resolves to the dev shim on web via metro.config.js.
import { Marker } from 'react-native-maps';
import { COLORS } from '@/config/constants';
import { useMarkerTracksViewChanges } from '@/components/map/useMarkerTracksViewChanges';
import type { Broadcast } from '@/types';

interface BroadcastMarkerProps {
  broadcast: Broadcast;
  /** True while the viewer is invited but hasn't accepted yet. */
  invite: boolean;
  onPress?: (broadcast: Broadcast) => void;
}

/**
 * Rose-themed cousin of the cluster pin: the broadcast's emoji in a disc with
 * a halo and a member-count badge. Invites render dimmed with a dashed border
 * and an INVITE tag instead of the count.
 */
export default function BroadcastMarker({
  broadcast,
  invite,
  onPress,
}: BroadcastMarkerProps) {
  const count = broadcast.memberIds.length;
  const tracksViewChanges = useMarkerTracksViewChanges(
    [broadcast.emoji, invite, count].join('|')
  );

  return (
    <Marker
      coordinate={{
        latitude: broadcast.location.latitude,
        longitude: broadcast.location.longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress ? () => onPress(broadcast) : undefined}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={{ alignItems: 'center', width: 72, height: 80 }}>
        {/* Static halo (no loops inside marker bitmaps) */}
        <View
          style={{
            position: 'absolute',
            top: 1,
            width: 66,
            height: 66,
            borderRadius: 33,
            backgroundColor: COLORS.rose,
            opacity: invite ? 0.1 : 0.18,
          }}
        />

        {/* Emoji disc */}
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            marginTop: 9,
            backgroundColor: invite
              ? 'rgba(244,114,182,0.15)'
              : 'rgba(244,114,182,0.35)',
            borderWidth: 1.5,
            borderStyle: invite ? 'dashed' : 'solid',
            borderColor: COLORS.rose,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 22 }}>{broadcast.emoji}</Text>
        </View>

        {/* Count badge / INVITE tag */}
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: invite ? -6 : 6,
            backgroundColor: COLORS.rose,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            paddingHorizontal: invite ? 6 : 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: '#0F1115',
              fontSize: invite ? 8 : 11,
              fontWeight: '800',
              letterSpacing: invite ? 0.5 : 0,
            }}
          >
            {invite ? 'INVITE' : count}
          </Text>
        </View>
      </View>
    </Marker>
  );
}
