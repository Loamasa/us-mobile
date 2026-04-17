import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { UsersIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';
import type { MapEntity } from '@/types';

interface ClusterMarkerProps {
  entity: MapEntity;
}

export default function ClusterMarker({ entity }: ClusterMarkerProps) {
  const count = entity.friends.length;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.6],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  return (
    <Marker
      coordinate={{
        latitude: entity.location.lat,
        longitude: entity.location.lng,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={{ alignItems: 'center', width: 72, height: 80 }}>
        {/* Animated pulse ring */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 4,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: COLORS.signal,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
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

        {/* Label */}
        <Text
          style={{
            color: 'rgba(242,244,246,0.7)',
            fontSize: 10,
            marginTop: 3,
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}
        >
          {count} Friends
        </Text>
      </View>

      <Callout>
        <View style={{ padding: 8, minWidth: 150 }}>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>
            {count} Friends Here
          </Text>
          {entity.friends.slice(0, 5).map((f) => (
            <Text
              key={f.userId}
              style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}
            >
              {f.displayName}
              {f.signal ? ` ${f.signal.emoji}` : ''}
            </Text>
          ))}
          {count > 5 && (
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
              +{count - 5} more
            </Text>
          )}
        </View>
      </Callout>
    </Marker>
  );
}
