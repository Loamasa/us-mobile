import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { onUserSpots, onUserProfile, deleteLocation } from '@/lib/firestore';
import { haversineDistance } from '@/utils/distance';
import { COLORS, MAP_DEFAULTS } from '@/config/constants';
import { useLocationTracking } from '@/features/location/useLocationTracking';
import { useFriendLocations } from '@/features/map/useFriendLocations';
import { useMapProjection } from '@/features/map/useMapProjection';
import FriendMarker from '@/components/map/FriendMarker';
import ClusterMarker from '@/components/map/ClusterMarker';
import SignalModal from '@/features/signals/SignalModal';
import type { UserSpot, UserProfile } from '@/types';

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d2b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d2b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c3e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [spots, setSpots] = useState<UserSpot[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [visibilityStatus, setVisibilityStatus] = useState<string>('Hidden');
  const [showSignalModal, setShowSignalModal] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Start location tracking (writes to Firestore)
  useLocationTracking();

  // Get friend locations in real-time
  const { friendLocations } = useFriendLocations();

  // Project friends into map entities (individual + clusters)
  const mapEntities = useMapProjection(friendLocations);

  const ghostMode = profile ? !profile.settings.globalLocationSharing : false;

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

  // Load user profile (for ghost mode state)
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

  // Calculate visibility status based on spot proximity
  useEffect(() => {
    if (!userLocation || ghostMode) {
      setVisibilityStatus(ghostMode ? '👻 Ghost Mode' : 'Hidden');
      return;
    }

    const activeSpots = spots.filter((s) => s.isActive);
    for (const spot of activeSpots) {
      const dist = haversineDistance(
        userLocation.lat,
        userLocation.lng,
        spot.location.latitude,
        spot.location.longitude
      );
      if (dist <= spot.radius) {
        setVisibilityStatus(`👁 Visible at ${spot.name}`);
        return;
      }
    }
    setVisibilityStatus('👻 Hidden (In Transit)');
  }, [userLocation, spots, ghostMode]);

  const toggleGhostMode = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const newValue = !ghostMode;
    await updateDoc(doc(db, 'users', userId), {
      'settings.globalLocationSharing': !newValue,
    });

    if (newValue) {
      await deleteLocation(userId);
    }
  };

  const initialRegion: Region = userLocation
    ? {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : MAP_DEFAULTS.initialRegion;

  return (
    <View className="flex-1 bg-void">
      <MapView
        ref={mapRef}
        className="flex-1"
        initialRegion={initialRegion}
        customMapStyle={darkMapStyle}
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

      {/* HUD Overlay */}
      <View className="absolute top-16 left-0 right-0 items-center">
        <View className="bg-void/80 border border-glass-border rounded-full px-4 py-2">
          <Text className="text-fog/70 text-xs">{visibilityStatus}</Text>
        </View>
      </View>

      {/* Active Signal Badge */}
      {profile?.currentSignal &&
        profile.currentSignal.expiresAt.toDate() > new Date() && (
          <View className="absolute top-28 left-0 right-0 items-center">
            <View className="bg-rose/20 border border-rose/40 rounded-full px-4 py-2 flex-row items-center">
              <Text className="text-base mr-1">
                {profile.currentSignal.emoji}
              </Text>
              <Text className="text-fog text-xs">
                {profile.currentSignal.text}
              </Text>
            </View>
          </View>
        )}

      {/* Ghost Mode Toggle */}
      <TouchableOpacity
        className={`absolute top-16 right-4 w-11 h-11 rounded-full items-center justify-center border ${
          ghostMode
            ? 'bg-signal/20 border-signal/40'
            : 'bg-void/80 border-glass-border'
        }`}
        onPress={toggleGhostMode}
      >
        <Text className="text-lg">{ghostMode ? '👻' : '👁'}</Text>
      </TouchableOpacity>

      {/* Signal Broadcast Button */}
      <TouchableOpacity
        className="absolute top-32 right-4 w-11 h-11 rounded-full items-center justify-center bg-void/80 border border-glass-border"
        onPress={() => setShowSignalModal(true)}
      >
        <Text className="text-lg">📡</Text>
      </TouchableOpacity>

      {/* My Location Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-4 w-11 h-11 rounded-full items-center justify-center bg-void/80 border border-glass-border"
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
      >
        <Text className="text-lg">📍</Text>
      </TouchableOpacity>

      {/* Signal Modal */}
      <SignalModal
        visible={showSignalModal}
        onClose={() => setShowSignalModal(false)}
        currentLocation={userLocation}
      />
    </View>
  );
}
