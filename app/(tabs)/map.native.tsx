import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import * as Location from 'expo-location';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { onUserSpots, onUserProfile, deleteLocation } from '@/lib/firestore';
import { haversineDistance } from '@/utils/distance';
import { COLORS, MAP_DEFAULTS } from '@/config/constants';
import { DARK_MAP_STYLE } from '@/config/mapStyles';
import { useLocationTracking } from '@/features/location/useLocationTracking';
import { useFriendLocations } from '@/features/map/useFriendLocations';
import { useMapProjection } from '@/features/map/useMapProjection';
import FriendMarker from '@/components/map/FriendMarker';
import ClusterMarker from '@/components/map/ClusterMarker';
import SignalModal from '@/features/signals/SignalModal';
import ActiveSignalHUD from '@/features/signals/ActiveSignalHUD';
import {
  EyeIcon,
  EyeOffIcon,
  RadioIcon,
  NavigationIcon,
  GhostIcon,
} from '@/components/ui/icons';
import type { UserSpot, UserProfile } from '@/types';
import type MapView from 'react-native-maps';



export default function MapScreen() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [spots, setSpots] = useState<UserSpot[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const mapRef = useRef<MapView>(null);

  // Start location tracking (writes to Firestore)
  useLocationTracking();

  // Get friend locations in real-time
  const { friendLocations } = useFriendLocations();

  // Project friends into map entities (individual + clusters)
  const mapEntities = useMapProjection(friendLocations);

  const ghostMode = profile ? !profile.settings.globalLocationSharing : false;
  const activeSignal = (() => {
    const signal = profile?.currentSignal;
    if (!signal) return null;
    const expires = signal.expiresAt?.toDate?.();
    if (!expires || expires <= new Date()) return null;
    return signal;
  })();

  // Clock - update every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Get user location for local display
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: MAP_DEFAULTS.locationDistanceInterval,
        },
        (loc) => {
          setUserLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  // Load user profile (for ghost mode + signal state)
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const unsubscribe = onUserProfile(userId, setProfile);
    return unsubscribe;
  }, []);

  // Load user spots
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const unsubscribe = onUserSpots(userId, setSpots);
    return unsubscribe;
  }, []);

  // ── Visibility status ───────────────────────────────────────────────────────
  const visibilityStatus = (() => {
    if (ghostMode) return { visible: false, label: 'Ghost Mode' };
    if (!userLocation) return { visible: false, label: 'Hidden (In Transit)' };
    const activeSpots = spots.filter((s) => s.isActive);
    for (const spot of activeSpots) {
      const dist = haversineDistance(
        userLocation.lat,
        userLocation.lng,
        spot.location.latitude,
        spot.location.longitude
      );
      if (dist <= spot.radius) return { visible: true, label: `Visible at ${spot.name}` };
    }
    return { visible: false, label: 'Hidden (In Transit)' };
  })();

  const toggleGhostMode = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const newValue = !ghostMode;
    await updateDoc(doc(db, 'users', userId), {
      'settings.globalLocationSharing': !newValue,
    });
    if (newValue) await deleteLocation(userId);
  };

  const clearSignal = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId), { currentSignal: null });
  };

  const initialRegion = userLocation
    ? {
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }
    : MAP_DEFAULTS.initialRegion;

  const renderMap = () => {
    if (Platform.OS === 'web') {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="text-fog">Map is not supported on web natively.</Text>
        </View>
      );
    }

    const MapView = require('react-native-maps').default;
    const { Marker, Circle } = require('react-native-maps');

    return (
      <MapView
        ref={mapRef}
        className="flex-1"
        initialRegion={initialRegion}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={!ghostMode}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* User Spots (translucent circles) */}
        {spots
          .filter((s) => s.isActive)
          .map((spot) => (
            <Circle
              key={spot.id}
              center={{
                latitude: spot.location.latitude,
                longitude: spot.location.longitude,
              }}
              radius={spot.radius}
              fillColor="rgba(46, 92, 255, 0.08)"
              strokeColor="rgba(46, 92, 255, 0.25)"
              strokeWidth={1}
            />
          ))}
        {spots
          .filter((s) => s.isActive)
          .map((spot) => (
            <Marker
              key={`label-${spot.id}`}
              coordinate={{
                latitude: spot.location.latitude,
                longitude: spot.location.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View className="items-center opacity-60">
                <Text className="text-xl">{spot.emoji}</Text>
                <Text className="text-fog/50 text-[10px]">{spot.name}</Text>
              </View>
            </Marker>
          ))}

        {/* Friend Markers & Clusters */}
        {mapEntities.map((entity) =>
          entity.type === 'CLUSTER' ? (
            <ClusterMarker key={entity.id} entity={entity} />
          ) : (
            <FriendMarker key={entity.id} entity={entity} />
          )
        )}
      </MapView>
    );
  };

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <View className="flex-1 bg-void">
      {renderMap()}

      {/* ── Top-center HUD ── */}
      <View
        style={{
          position: 'absolute',
          top: 56,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 40,
          gap: 6,
          pointerEvents: 'box-none',
        }}
      >
        {/* Clock widget */}
        <View
          style={{
            backgroundColor: 'rgba(15,17,21,0.7)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 8,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#F2F4F6',
              fontSize: 22,
              fontWeight: '700',
              letterSpacing: -0.5,
              lineHeight: 24,
            }}
          >
            {timeStr}
          </Text>
          <Text
            style={{
              color: '#9CA3AF',
              fontSize: 10,
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginTop: 2,
            }}
          >
            {dateStr}
          </Text>
        </View>

        {/* Visibility HUD pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: visibilityStatus.visible
              ? 'rgba(46,92,255,0.2)'
              : 'rgba(0,0,0,0.55)',
            borderWidth: 1,
            borderColor: visibilityStatus.visible
              ? 'rgba(46,92,255,0.5)'
              : 'rgba(255,255,255,0.1)',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          {visibilityStatus.visible ? (
            <EyeIcon size={12} color={COLORS.signal} />
          ) : (
            <EyeOffIcon size={12} color="#9CA3AF" />
          )}
          <Text
            style={{
              color: visibilityStatus.visible ? COLORS.signal : '#9CA3AF',
              fontSize: 10,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {visibilityStatus.label}
          </Text>
        </View>
      </View>

      {/* ── Active Signal HUD ── */}
      {activeSignal && (
        <ActiveSignalHUD signal={activeSignal} onClear={clearSignal} />
      )}

      {/* ── Top-right controls ── */}
      <View
        style={{
          position: 'absolute',
          top: 56,
          right: 16,
          zIndex: 40,
          gap: 10,
        }}
      >
        {/* Ghost mode toggle */}
        <TouchableOpacity
          onPress={toggleGhostMode}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: ghostMode ? COLORS.signal : 'rgba(15,17,21,0.75)',
            borderWidth: 1,
            borderColor: ghostMode ? COLORS.signal : 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          activeOpacity={0.8}
        >
          {ghostMode ? (
            <GhostIcon size={20} color="#ffffff" />
          ) : (
            <EyeIcon size={20} color="#9CA3AF" />
          )}
        </TouchableOpacity>

        {/* Signal broadcast button — hidden in ghost mode */}
        {!ghostMode && (
          <TouchableOpacity
            onPress={() => setShowSignalModal(true)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(244,114,182,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(244,114,182,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.8}
          >
            <RadioIcon size={20} color="#F472B6" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── My location button ── */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 24,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(15,17,21,0.75)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
        }}
        onPress={() => {
          if (userLocation) {
            mapRef.current?.animateToRegion({
              latitude: userLocation.lat,
              longitude: userLocation.lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        }}
        activeOpacity={0.8}
      >
        <NavigationIcon size={18} color="#F2F4F6" />
      </TouchableOpacity>

      {/* ── Signal Modal ── */}
      <SignalModal
        visible={showSignalModal}
        onClose={() => setShowSignalModal(false)}
        currentLocation={userLocation}
      />
    </View>
  );
}
