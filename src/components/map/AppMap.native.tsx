import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ReactNode, Ref } from 'react';
import { View } from 'react-native';
import type { LayoutChangeEvent, NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import * as Location from 'expo-location';
import { Camera, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
import type { CameraRef, InitialViewState, PressEvent } from '@maplibre/maplibre-react-native';
import { DARK_MAP_STYLE } from '@/config/mapStyles';
import { COLORS } from '@/config/constants';
import { zoomForRegion } from '@/features/map/mapCamera';
import MapPressGuard from './MapPressGuard';
import type { AppMapHandle, MapPressEvent, MapRegion } from '@/types';

interface AppMapProps {
  ref?: Ref<AppMapHandle>;
  style?: StyleProp<ViewStyle>;
  /** Camera on first render. Later moves go through ref.animateToRegion. */
  initialRegion: MapRegion;
  onPress?: (event: MapPressEvent) => void;
  onLongPress?: (event: MapPressEvent) => void;
  /** Blue dot for the user. Only drawn once location permission is granted. */
  showsUserLocation?: boolean;
  /** Extra space under the attribution (i) button, e.g. for a floating tab bar. */
  attributionBottom?: number;
  children?: ReactNode;
}

const DEFAULT_ANIMATION_MS = 500;
// A map tap this soon after a marker tap belongs to the marker.
const MARKER_PRESS_WINDOW_MS = 350;

const toPressEvent = (e: NativeSyntheticEvent<PressEvent>): MapPressEvent => {
  const [longitude, latitude] = e.nativeEvent.lngLat;
  return { nativeEvent: { coordinate: { latitude, longitude } } };
};

/**
 * The app's map, drawn by MapLibre with free OpenFreeMap vector tiles (no API
 * key). Keeps the small region-based API the screens were written against;
 * the web dev build swaps in src/dev/fakeMaps.tsx via AppMap.web.tsx.
 */
export default function AppMap({
  ref,
  style,
  initialRegion,
  onPress,
  onLongPress,
  showsUserLocation = false,
  attributionBottom = 8,
  children,
}: AppMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const lastMarkerPressRef = useRef(0);
  // Frozen at first layout: like initialRegion before, later prop changes
  // never move the camera (screens call animateToRegion for that).
  const initialViewRef = useRef<InitialViewState | null>(null);
  if (size && !initialViewRef.current) {
    initialViewRef.current = {
      center: [initialRegion.longitude, initialRegion.latitude],
      zoom: zoomForRegion(initialRegion, size),
    };
  }
  const [locationGranted, setLocationGranted] = useState(false);

  // The location layer needs permission; asking is the screens' job.
  useEffect(() => {
    if (!showsUserLocation) return;
    let alive = true;
    const check = () =>
      Location.getForegroundPermissionsAsync()
        .then(({ status }) => alive && setLocationGranted(status === 'granted'))
        .catch(() => undefined);
    void check();
    // Screens often ask for permission right after the map mounts.
    const retry = setInterval(check, 3000);
    return () => {
      alive = false;
      clearInterval(retry);
    };
  }, [showsUserLocation]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: MapRegion, durationMs = DEFAULT_ANIMATION_MS) => {
      const current = sizeRef.current;
      const camera = cameraRef.current;
      if (!current || !camera) return;
      // Before the native map is ready the camera throws; callers retry.
      try {
        void camera
          .setStop({
            center: [region.longitude, region.latitude],
            zoom: zoomForRegion(region, current),
            duration: durationMs,
            easing: 'ease',
          })
          .catch(() => undefined);
      } catch {
        // Not initialized yet.
      }
    },
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize((s) => (s && s.width === width && s.height === height ? s : { width, height }));
    }
  };

  const markerPressed = useCallback(() => {
    lastMarkerPressRef.current = Date.now();
  }, []);
  const tapBelongsToMarker = () =>
    Date.now() - lastMarkerPressRef.current < MARKER_PRESS_WINDOW_MS;

  return (
    <View style={style} onLayout={handleLayout}>
      {/* Wait for the first layout so the initial zoom fits this view's size. */}
      {size ? (
        <MapPressGuard.Provider value={{ markerPressed }}>
          <Map
            style={{ flex: 1 }}
            mapStyle={DARK_MAP_STYLE}
            logo={false}
            attribution
            attributionPosition={{ bottom: attributionBottom, left: 8 }}
            tintColor={COLORS.fog}
            compass={false}
            touchPitch={false}
            onPress={
              onPress
                ? (e) => {
                    if (tapBelongsToMarker()) return;
                    onPress(toPressEvent(e));
                  }
                : undefined
            }
            onLongPress={
              onLongPress
                ? (e) => {
                    if (tapBelongsToMarker()) return;
                    onLongPress(toPressEvent(e));
                  }
                : undefined
            }
          >
            <Camera
              ref={cameraRef}
              initialViewState={initialViewRef.current ?? undefined}
            />
            {showsUserLocation && locationGranted ? <NativeUserLocation /> : null}
            {children}
          </Map>
        </MapPressGuard.Provider>
      ) : null}
    </View>
  );
}
