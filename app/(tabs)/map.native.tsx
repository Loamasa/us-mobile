import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import * as Location from 'expo-location';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { onUserSpots, onUserProfile, deleteLocation } from '@/lib/firestore';
import { haversineDistance } from '@/utils/distance';
import { COLORS, MAP_DEFAULTS } from '@/config/constants';
import { DARK_MAP_STYLE } from '@/config/mapStyles';
import { useLocationTracking } from '@/features/location/useLocationTracking';
import { useFriendLocations } from '@/features/map/useFriendLocations';
import { useMapProjection } from '@/features/map/useMapProjection';
import { BlurView } from 'expo-blur';
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
  const [userId, setUserId] = useState<string | undefined>(auth.currentUser?.uid);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const mapRef = useRef<MapView>(null);

  // Track auth state so profile/spots re-subscribe on account switch
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? undefined));
  }, []);

  // Start location tracking (writes to Firestore)
  useLocationTracking();

  // Get friend locations in real-time
  const { friendLocations } = useFriendLocations();

  // Project friends into map entities (individual + clusters)
  const mapEntities = useMapProjection(friendLocations);

  // Friend spot snapshots — each visible friend's current containing spot.
  const friendSpots = Object.values(friendLocations)
    .map(({ location, profile }) => {
      if (!location.spot) return null;
      return {
        key: `${profile.id}-${location.spot.id}`,
        ownerName: profile.displayName,
        spot: location.spot,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

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
      const { status } = await Location.requestForegroundPermissionsAsync();
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
    setProfile(null);
    if (!userId) return;
    return onUserProfile(userId, setProfile);
  }, [userId]);

  // Load user spots
  useEffect(() => {
    setSpots([]);
    if (!userId) return;
    return onUserSpots(userId, setSpots);
  }, [userId]);

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
    if (!userId) {
      console.warn('toggleGhostMode: no user signed in');
      return;
    }
    const newValue = !ghostMode;
    try {
      await updateDoc(doc(db, 'users', userId), {
        'settings.globalLocationSharing': !newValue,
      });
      if (newValue) await deleteLocation(userId);
    } catch (err) {
      console.error('toggleGhostMode failed:', err);
      Alert.alert('Error', 'Could not toggle ghost mode. Check emulator connection.');
    }
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
        style={{ flex: 1 }}
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

        {/* Friend Spot Zones — mint-tinted circles for each visible friend's current spot */}
        {friendSpots.map(({ key, spot }) => (
          <Circle
            key={`friend-spot-${key}`}
            center={{
              latitude: spot.center.latitude,
              longitude: spot.center.longitude,
            }}
            radius={spot.radius}
            fillColor="rgba(0, 224, 150, 0.06)"
            strokeColor="rgba(0, 224, 150, 0.28)"
            strokeWidth={1}
          />
        ))}
        {friendSpots.map(({ key, ownerName, spot }) => (
          <Marker
            key={`friend-spot-label-${key}`}
            coordinate={{
              latitude: spot.center.latitude,
              longitude: spot.center.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="items-center opacity-50">
              <Text className="text-base">{spot.emoji}</Text>
              <Text className="text-mint/70 text-[9px]">
                {ownerName.split(' ')[0]}'s {spot.name}
              </Text>
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
        <BlurView
          tint="dark"
          intensity={40}
          style={{
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 8,
            alignItems: 'center',
            overflow: 'hidden',
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
        </BlurView>

        {/* Visibility HUD pill */}
        <BlurView
          tint={visibilityStatus.visible ? "light" : "dark"}
          intensity={visibilityStatus.visible ? 20 : 40}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: visibilityStatus.visible
              ? 'rgba(46,92,255,0.2)'
              : 'rgba(0,0,0,0.5)',
            borderWidth: 1,
            borderColor: visibilityStatus.visible
              ? 'rgba(46,92,255,0.5)'
              : 'rgba(255,255,255,0.1)',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
            overflow: 'hidden',
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
        </BlurView>
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
          zIndex: 50,
          gap: 10,
        }}
      >
        {/* Ghost mode toggle */}
        <TouchableOpacity
          onPress={toggleGhostMode}
          activeOpacity={0.8}
        >
          <BlurView
            tint="dark"
            intensity={40}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: ghostMode ? COLORS.signal : 'rgba(0,0,0,0.4)',
              borderWidth: 1,
              borderColor: ghostMode ? COLORS.signal : 'rgba(255,255,255,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {ghostMode ? (
              <GhostIcon size={20} color="#ffffff" />
            ) : (
              <EyeIcon size={20} color="#9CA3AF" />
            )}
          </BlurView>
        </TouchableOpacity>

        {/* Signal broadcast button — hidden in ghost mode */}
        {!ghostMode && (
          <TouchableOpacity
            onPress={() => setShowSignalModal(true)}
            activeOpacity={0.8}
          >
            <BlurView
              tint="light"
              intensity={20}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(244,114,182,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(244,114,182,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <RadioIcon size={20} color="#F472B6" />
            </BlurView>
          </TouchableOpacity>
        )}
      </View>

      {/* ── My location button ── */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 24,
          right: 16,
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
        <BlurView
          tint="dark"
          intensity={40}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <NavigationIcon size={18} color="#F2F4F6" />
        </BlurView>
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
