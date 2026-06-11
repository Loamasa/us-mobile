import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import {
  onUserSpots,
  onUserProfile,
  deleteLocation,
  onChats,
  getOrCreateGroupChat,
  getOrCreateDmChat,
  acceptBroadcastInvite,
  declineBroadcastInvite,
  setBroadcastChat,
  deleteBroadcast,
} from '@/lib/firestore';
import { haversineDistance } from '@/utils/distance';
import { COLORS, MAP_DEFAULTS } from '@/config/constants';
import { DARK_MAP_STYLE } from '@/config/mapStyles';
import { useLocationTracking } from '@/features/location/useLocationTracking';
import { isSpotActiveNow } from '@/features/spots/spotSchedule';
import { useFriendLocations } from '@/features/map/useFriendLocations';
import { useMapProjection } from '@/features/map/useMapProjection';
import { useGroupMemberProfiles } from '@/features/map/useGroupMemberProfiles';
import { buildGroupPins } from '@/features/map/groupPins';
import { BlurView } from 'expo-blur';
import FriendMarker from '@/components/map/FriendMarker';
import ClusterMarker from '@/components/map/ClusterMarker';
import ClusterCard from '@/components/map/ClusterCard';
import FriendCard from '@/components/map/FriendCard';
import ActiveSignalHUD from '@/features/signals/ActiveSignalHUD';
import { useBroadcasts } from '@/features/broadcasts/useBroadcasts';
import BroadcastMarker from '@/features/broadcasts/BroadcastMarker';
import BroadcastCard from '@/features/broadcasts/BroadcastCard';
import BroadcastComposerModal from '@/features/broadcasts/BroadcastComposerModal';
import {
  EyeIcon,
  EyeOffIcon,
  RadioIcon,
  NavigationIcon,
  GhostIcon,
} from '@/components/ui/icons';
import type { UserSpot, UserProfile, ChatSummary, MapEntity, Broadcast } from '@/types';
import type MapView from 'react-native-maps';



export default function MapScreen() {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [spots, setSpots] = useState<UserSpot[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | undefined>(auth.currentUser?.uid);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [broadcastCoord, setBroadcastCoord] = useState<{ lat: number; lng: number } | null>(null);
  // Placement mode: rose button arms it, the next map tap places the pin.
  const [placingGathering, setPlacingGathering] = useState(false);
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [openingChat, setOpeningChat] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const mapRef = useRef<MapView>(null);

  // Track auth state so profile/spots re-subscribe on account switch
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? undefined));
  }, []);

  // Focus request from elsewhere (chat header "View Map" pill). focusTs makes
  // repeated jumps to the same coordinates re-trigger.
  const { focusLat, focusLng, focusTs } = useLocalSearchParams<{
    focusLat?: string;
    focusLng?: string;
    focusTs?: string;
  }>();
  useEffect(() => {
    if (!focusTs) return;
    const latitude = Number(focusLat);
    const longitude = Number(focusLng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const region = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    mapRef.current?.animateToRegion(region);
    // If the tab mounts WITH the params (lazy tabs), the map ref may not be
    // live yet — try once more after it has had time to initialize.
    const retry = setTimeout(() => mapRef.current?.animateToRegion(region), 600);
    return () => clearTimeout(retry);
  }, [focusTs, focusLat, focusLng]);

  // Start location tracking (writes to Firestore)
  useLocationTracking();

  // Get friend locations in real-time
  const { friendLocations } = useFriendLocations();

  // Project friends into map entities (individual + clusters)
  const rawEntities = useMapProjection(friendLocations);

  // Member profiles for named always-on groups — power the facepile of a resting
  // fixed-location pin, whose members may be ghost / absent from friendLocations.
  const groupMemberProfiles = useGroupMemberProfiles(chats, userId);

  // Group broadcasts: mine (member) + pending invites. Only members/invitees
  // can even read these docs — outsiders never see the pins.
  const { mine: myBroadcasts, invites: broadcastInvites, friendSolo } = useBroadcasts();

  // Reconcile named groups (mapVisibility = ALWAYS) with the live projection:
  // decorate a live proximity cluster with the group name when its members are
  // actually together, otherwise synthesize a persistent pin at the chat's
  // fixedLocation. Proximity wins when both apply. (See buildGroupPins.)
  const mapEntities: MapEntity[] = useMemo(
    () =>
      userId
        ? buildGroupPins({
            rawEntities,
            chats,
            userId,
            memberProfiles: groupMemberProfiles,
          })
        : rawEntities,
    [rawEntities, chats, userId, groupMemberProfiles]
  );

  // Selected cluster — the one whose card is currently shown.
  const selectedCluster =
    mapEntities.find((e) => e.id === selectedClusterId && e.type === 'CLUSTER') ??
    null;

  // Selected friend — the one whose popup card is currently shown.
  const selectedFriend =
    mapEntities.find((e) => e.id === selectedFriendId && e.type === 'FRIEND') ??
    null;

  // Selected gathering — the viewer's relationship picks the card variant:
  // MEMBER (mine), INVITE (pending), PEEK (a friend's solo gathering).
  const selectedBroadcast =
    myBroadcasts.find((b) => b.id === selectedBroadcastId) ??
    broadcastInvites.find((b) => b.id === selectedBroadcastId) ??
    friendSolo.find((b) => b.id === selectedBroadcastId) ??
    null;
  const selectedBroadcastMode: 'MEMBER' | 'INVITE' | 'PEEK' = myBroadcasts.some(
    (b) => b.id === selectedBroadcastId
  )
    ? 'MEMBER'
    : broadcastInvites.some((b) => b.id === selectedBroadcastId)
      ? 'INVITE'
      : 'PEEK';

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

  // Clear selected cluster if it stops existing (members moved apart, went ghost, etc.)
  useEffect(() => {
    if (selectedClusterId && !selectedCluster) setSelectedClusterId(null);
  }, [selectedClusterId, selectedCluster]);

  // Clear selected friend if they stop existing (went ghost, absorbed into cluster).
  useEffect(() => {
    if (selectedFriendId && !selectedFriend) setSelectedFriendId(null);
  }, [selectedFriendId, selectedFriend]);

  // Clear selected broadcast if it expires / gets ended / invite declined.
  useEffect(() => {
    if (selectedBroadcastId && !selectedBroadcast) setSelectedBroadcastId(null);
  }, [selectedBroadcastId, selectedBroadcast]);

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

  // Subscribe to my chats — used to tag clusters with a named group chat.
  useEffect(() => {
    setChats([]);
    if (!userId) return;
    return onChats(userId, setChats);
  }, [userId]);

  // ── Visibility status ───────────────────────────────────────────────────────
  const visibilityStatus = (() => {
    if (ghostMode) return { visible: false, label: 'Ghost Mode' };
    if (!userLocation) return { visible: false, label: 'Hidden (In Transit)' };
    // currentTime (minute tick) keeps schedule windows re-evaluating.
    const activeSpots = spots.filter((s) => isSpotActiveNow(s, currentTime));
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

  const handleMessageFriend = async (entity: MapEntity) => {
    if (entity.type !== 'FRIEND' || !userId || openingChat) return;
    const peerId = entity.friends[0]?.userId;
    if (!peerId) return;

    setOpeningChat(true);
    try {
      const chatId = await getOrCreateDmChat({ viewerId: userId, peerId });
      setSelectedFriendId(null);
      router.push(`/chat/${chatId}`);
    } catch (e: unknown) {
      console.error('getOrCreateDmChat failed', e);
      Alert.alert(
        'Could not open chat',
        e instanceof Error ? e.message : 'Check emulator connection.'
      );
    } finally {
      setOpeningChat(false);
    }
  };

  const handleOpenGroupChat = async (entity: MapEntity) => {
    if (entity.type !== 'CLUSTER' || !userId || openingChat) return;

    // Named cluster already has a chat — open it directly.
    if (entity.groupChat) {
      setSelectedClusterId(null);
      router.push(`/chat/${entity.groupChat.id}`);
      return;
    }

    setOpeningChat(true);
    try {
      const memberIds = [...entity.friends.map((f) => f.userId), userId];
      const name =
        entity.friends
          .map((f) => f.displayName.split(' ')[0])
          .slice(0, 3)
          .join(', ') + (entity.friends.length > 3 ? ' + crew' : '');
      const chatId = await getOrCreateGroupChat({
        memberIds,
        createdBy: userId,
        name: name || 'Group',
      });
      setSelectedClusterId(null);
      router.push(`/chat/${chatId}`);
    } catch (e: unknown) {
      console.error('getOrCreateGroupChat failed', e);
      Alert.alert(
        'Could not open chat',
        e instanceof Error ? e.message : 'Check emulator connection.'
      );
    } finally {
      setOpeningChat(false);
    }
  };

  // ── Broadcast handlers ──────────────────────────────────────────────────────

  const handleOpenBroadcastChat = async (b: Broadcast) => {
    if (!userId || openingChat) return;
    if (b.chatId) {
      setSelectedBroadcastId(null);
      router.push(`/chat/${b.chatId}`);
      return;
    }
    setOpeningChat(true);
    try {
      const chatId = await getOrCreateGroupChat({
        memberIds: b.memberIds,
        createdBy: userId,
        name: `${b.emoji} ${b.text}`,
      });
      await setBroadcastChat(b.id, chatId);
      setSelectedBroadcastId(null);
      router.push(`/chat/${chatId}`);
    } catch (e: unknown) {
      console.error('open broadcast chat failed', e);
      Alert.alert(
        'Could not open chat',
        e instanceof Error ? e.message : 'Check emulator connection.'
      );
    } finally {
      setOpeningChat(false);
    }
  };

  const handleAcceptBroadcast = async (b: Broadcast) => {
    if (!userId || broadcastBusy) return;
    setBroadcastBusy(true);
    try {
      await acceptBroadcastInvite(b.id, userId);
    } catch (e) {
      console.error('accept broadcast failed', e);
    } finally {
      setBroadcastBusy(false);
    }
  };

  const handleDeclineBroadcast = async (b: Broadcast) => {
    if (!userId || broadcastBusy) return;
    setBroadcastBusy(true);
    try {
      await declineBroadcastInvite(b.id, userId);
      setSelectedBroadcastId(null);
    } catch (e) {
      console.error('decline broadcast failed', e);
    } finally {
      setBroadcastBusy(false);
    }
  };

  const handleEndBroadcast = async (b: Broadcast) => {
    if (broadcastBusy) return;
    setBroadcastBusy(true);
    try {
      await deleteBroadcast(b.id);
      setSelectedBroadcastId(null);
    } catch (e) {
      console.error('end broadcast failed', e);
    } finally {
      setBroadcastBusy(false);
    }
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
    // On web this resolves to the dev shim (metro.config.js → src/dev/fakeMaps.tsx).
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
        onPress={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
          // In placement mode the tap PLACES the gathering pin; otherwise it
          // just dismisses any open card.
          if (placingGathering) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setPlacingGathering(false);
            setBroadcastCoord({ lat: latitude, lng: longitude });
            return;
          }
          setSelectedClusterId(null);
          setSelectedFriendId(null);
          setSelectedBroadcastId(null);
        }}
        onLongPress={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
          // Long-press shortcut: place a gathering right here (FEATURES.md #1).
          const { latitude, longitude } = e.nativeEvent.coordinate;
          setPlacingGathering(false);
          setSelectedClusterId(null);
          setSelectedFriendId(null);
          setSelectedBroadcastId(null);
          setBroadcastCoord({ lat: latitude, lng: longitude });
        }}
      >
        {/* User Spots (translucent circles) — schedule-aware via the minute tick */}
        {spots
          .filter((s) => isSpotActiveNow(s, currentTime))
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
          .filter((s) => isSpotActiveNow(s, currentTime))
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
            <ClusterMarker
              key={entity.id}
              entity={entity}
              onPress={(e) => {
                setSelectedFriendId(null);
                setSelectedBroadcastId(null);
                setSelectedClusterId(e.id);
              }}
            />
          ) : (
            <FriendMarker
              key={entity.id}
              entity={entity}
              onPress={(e) => {
                setSelectedClusterId(null);
                setSelectedBroadcastId(null);
                setSelectedFriendId(e.id);
              }}
            />
          )
        )}

        {/* Gathering pins — mine + friends' solo gatherings solid, invites dashed */}
        {[...myBroadcasts, ...friendSolo].map((b) => (
          <BroadcastMarker
            key={b.id}
            broadcast={b}
            invite={false}
            onPress={(pressed) => {
              setSelectedClusterId(null);
              setSelectedFriendId(null);
              setSelectedBroadcastId(pressed.id);
            }}
          />
        ))}
        {broadcastInvites.map((b) => (
          <BroadcastMarker
            key={b.id}
            broadcast={b}
            invite
            onPress={(pressed) => {
              setSelectedClusterId(null);
              setSelectedFriendId(null);
              setSelectedBroadcastId(pressed.id);
            }}
          />
        ))}
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

      {/* ── Gathering placement banner ── */}
      {placingGathering && (
        <View
          style={{
            position: 'absolute',
            top: 150,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 45,
            pointerEvents: 'box-none',
          }}
        >
          <TouchableOpacity
            onPress={() => setPlacingGathering(false)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(244,114,182,0.15)',
              borderWidth: 1,
              borderColor: 'rgba(244,114,182,0.5)',
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                color: COLORS.rose,
                fontSize: 11,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Tap the map to place a gathering
            </Text>
            <Text style={{ color: COLORS.rose, fontSize: 13, fontWeight: '700' }}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>
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

        {/* Gathering button — hidden in ghost mode. Arms placement mode:
            the next map tap chooses WHERE the gathering pin goes (never
            implicitly your GPS position). Long-press skips the button. */}
        {!ghostMode && (
          <TouchableOpacity
            onPress={() => {
              setSelectedClusterId(null);
              setSelectedFriendId(null);
              setSelectedBroadcastId(null);
              setPlacingGathering((v) => !v);
            }}
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

      {/* ── My location button (hidden while a card is open; both sit above the
            floating glass tab bar at bottom: 96) ── */}
      {!selectedCluster && !selectedFriend && !selectedBroadcast && (
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 96,
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
      )}

      {/* ── Cluster Card ── */}
      {selectedCluster && (
        <ClusterCard
          entity={selectedCluster}
          onClose={() => setSelectedClusterId(null)}
          onOpenGroupChat={handleOpenGroupChat}
        />
      )}

      {/* ── Friend Card ── */}
      {selectedFriend && (
        <FriendCard
          entity={selectedFriend}
          onClose={() => setSelectedFriendId(null)}
          onMessage={handleMessageFriend}
        />
      )}

      {/* ── Broadcast Card ── */}
      {selectedBroadcast && userId && (
        <BroadcastCard
          broadcast={selectedBroadcast}
          viewerId={userId}
          mode={selectedBroadcastMode}
          busy={broadcastBusy || openingChat}
          onClose={() => setSelectedBroadcastId(null)}
          onOpenChat={handleOpenBroadcastChat}
          onAccept={handleAcceptBroadcast}
          onDecline={handleDeclineBroadcast}
          onEnd={handleEndBroadcast}
        />
      )}

      {/* ── Broadcast Composer (rose button or map long-press) ── */}
      <BroadcastComposerModal
        visible={broadcastCoord !== null}
        coordinate={broadcastCoord}
        onClose={() => setBroadcastCoord(null)}
      />
    </View>
  );
}
