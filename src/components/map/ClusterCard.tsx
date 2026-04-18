import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import UserAvatar from '@/components/UserAvatar';
import { XIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';
import type { MapEntity } from '@/types';

interface ClusterCardProps {
  entity: MapEntity;
  onClose: () => void;
  onOpenGroupChat: (entity: MapEntity) => void;
}

const FACEPILE_MAX = 5;

export default function ClusterCard({
  entity,
  onClose,
  onOpenGroupChat,
}: ClusterCardProps) {
  const friends = entity.friends;
  const count = friends.length;
  const named = !!entity.groupChat;
  const title = entity.groupChat?.name ?? deriveClusterTitle(entity);
  const shown = friends.slice(0, FACEPILE_MAX);
  const overflow = Math.max(0, count - FACEPILE_MAX);
  const description = named
    ? `${count} friends from this group are here.`
    : `${count} friends are gathered nearby.`;
  const badgeLabel = named ? 'GROUP' : 'CLUSTER';

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
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: COLORS.signal,
              fontSize: 16,
              fontWeight: '800',
              flexShrink: 1,
            }}
          >
            {title}
          </Text>
          <View
            style={{
              backgroundColor: 'rgba(46, 92, 255, 0.2)',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                color: COLORS.signal,
                fontSize: 9,
                fontWeight: '900',
                letterSpacing: 1,
              }}
            >
              {badgeLabel}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{ padding: 2 }}
            accessibilityLabel="Close cluster card"
          >
            <XIcon size={18} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Facepile */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          {shown.map((friend, i) => (
            <View
              key={friend.userId}
              style={{
                marginLeft: i === 0 ? 0 : -10,
                borderWidth: 2,
                borderColor: COLORS.void,
                borderRadius: 20,
              }}
            >
              <UserAvatar
                displayName={friend.displayName}
                size="sm"
                tint={friend.signal ? 'rose' : 'signal'}
              />
            </View>
          ))}
          {overflow > 0 && (
            <View
              style={{
                marginLeft: -10,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 2,
                borderColor: COLORS.void,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: COLORS.fog, fontSize: 10, fontWeight: '700' }}>
                +{overflow}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text
          style={{
            color: '#9CA3AF',
            fontSize: 11,
            marginBottom: 12,
          }}
        >
          {description}
        </Text>

        {/* CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onOpenGroupChat(entity)}
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
            Open Group Chat
          </Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

function deriveClusterTitle(entity: MapEntity): string {
  // If every friend is inside the same spot snapshot, use "{Owner}'s {Spot}".
  // Otherwise fall back to a generic label.
  const first = entity.friends[0];
  if (!first) return 'Friends Nearby';
  return `${entity.friends.length} Friends Nearby`;
}
