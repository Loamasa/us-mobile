import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { XIcon } from '@/components/ui/icons';
import { COLORS, LOCATION_STALE_MS } from '@/config/constants';
import type { MapEntity } from '@/types';

interface FriendCardProps {
  entity: MapEntity;
  onClose: () => void;
  onMessage: (entity: MapEntity) => void;
}

// "2M AGO" / "3H AGO" / "2D AGO" for the stale-location status line.
function formatAge(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min}M AGO`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}H AGO`;
  return `${Math.round(hr / 24)}D AGO`;
}

export default function FriendCard({ entity, onClose, onMessage }: FriendCardProps) {
  const friend = entity.friends[0];
  if (!friend) return null;

  // Truthful liveness, computed when the card opens: the publisher rewrites
  // the location doc every 60s while in a spot, so an old updatedAt means the
  // app is gone and the marker is frozen — say so instead of "ONLINE".
  const ageMs = friend.updatedAt ? Date.now() - friend.updatedAt.toMillis() : null;
  const isLive = ageMs !== null ? ageMs <= LOCATION_STALE_MS : friend.isOnline;
  const statusLabel = isLive
    ? 'LIVE NOW'
    : ageMs !== null
      ? `LAST SEEN ${formatAge(ageMs)}`
      : 'OFFLINE';
  const statusColor = isLive ? COLORS.mint : '#6B7280';

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 96,
        alignItems: 'center',
        zIndex: 60,
      }}
    >
      <BlurView
        tint="dark"
        intensity={50}
        style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: 'rgba(15, 17, 21, 0.85)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
          padding: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        {/* Header: name + close */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: COLORS.fog,
              fontSize: 16,
              fontWeight: '800',
              flexShrink: 1,
            }}
          >
            {friend.displayName}
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{ padding: 2 }}
            accessibilityLabel="Close friend card"
          >
            <XIcon size={18} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Signal pill (if active) */}
        {friend.signal && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 6,
              backgroundColor: 'rgba(244, 114, 182, 0.12)',
              borderWidth: 1,
              borderColor: 'rgba(244, 114, 182, 0.3)',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 14 }}>{friend.signal.emoji}</Text>
            <Text
              numberOfLines={1}
              style={{ color: COLORS.rose, fontSize: 11, fontWeight: '700', flexShrink: 1 }}
            >
              {friend.signal.text}
            </Text>
          </View>
        )}

        {/* "At {spot}" pill */}
        {friend.spot && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 12 }}>{friend.spot.emoji}</Text>
            <Text style={{ color: COLORS.fog, fontSize: 11, fontWeight: '700' }}>
              At {friend.spot.name}
            </Text>
          </View>
        )}

        {/* Status line */}
        <Text
          style={{
            color: statusColor,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.2,
            marginBottom: 12,
          }}
        >
          {statusLabel}
        </Text>

        {/* Message CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onMessage(entity)}
          style={{
            backgroundColor: COLORS.signal,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: 'center',
            shadowColor: COLORS.signal,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 10,
          }}
        >
          <Text
            style={{
              color: COLORS.fog,
              fontSize: 13,
              fontWeight: '900',
              letterSpacing: 0.3,
            }}
          >
            Message
          </Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}
