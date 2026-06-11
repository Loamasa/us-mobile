/**
 * Dev-only web stand-in for react-native-maps. metro.config.js resolves
 * 'react-native-maps' to this file on web, so the REAL native map screens run
 * unchanged in the browser (Claude preview self-testing). Never bundled on
 * native — the real package resolves there.
 *
 * KISS: equirectangular projection on a dark pane. Markers assume the
 * anchor={{ x: 0.5, y: 0.5 }} this codebase always passes (children centered
 * on the coordinate). No tiles, no pan gesture — zoom +/- buttons only.
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type LatLng = { latitude: number; longitude: number };
type Region = LatLng & { latitudeDelta: number; longitudeDelta: number };
type Size = { width: number; height: number };

const METERS_PER_DEG_LAT = 111_320;
const FALLBACK_REGION: Region = {
  latitude: 55.6049,
  longitude: 13.0038,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const MapContext = createContext<{ region: Region; size: Size } | null>(null);

function project(region: Region, size: Size, coord: LatLng) {
  return {
    x:
      size.width / 2 +
      ((coord.longitude - region.longitude) / region.longitudeDelta) * size.width,
    y:
      size.height / 2 -
      ((coord.latitude - region.latitude) / region.latitudeDelta) * size.height,
  };
}

interface MapViewProps {
  style?: object;
  initialRegion?: Region;
  region?: Region;
  onPress?: (event: { nativeEvent: { coordinate: LatLng } }) => void;
  onLongPress?: (event: { nativeEvent: { coordinate: LatLng } }) => void;
  children?: ReactNode;
  // Accepted-and-ignored real props so callers don't need web forks:
  customMapStyle?: unknown;
  provider?: unknown;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  onRegionChangeComplete?: (region: Region) => void;
}

const GRID_CELLS = 10;

const MapView = forwardRef(function MapView(props: MapViewProps, ref) {
  const { style, initialRegion, region: regionProp, onPress, onLongPress, children } = props;
  const [region, setRegion] = useState<Region>(
    regionProp ?? initialRegion ?? FALLBACK_REGION
  );
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  // This file only ever runs on web (Metro resolver), so measure the pane with
  // DOM APIs — RNW's onLayout proved unreliable here. RNW View refs expose the
  // host element.
  const paneRef = useCallback((node: unknown) => {
    const el = node as HTMLElement | null;
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) {
        setSize((s) =>
          s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }
        );
      } else {
        requestAnimationFrame(measure);
      }
    };
    measure();
  }, []);

  useImperativeHandle(ref, () => ({
    animateToRegion: (next: Region, _duration?: number) => setRegion(next),
  }));

  const zoom = (factor: number) =>
    setRegion((r) => ({
      ...r,
      latitudeDelta: r.latitudeDelta * factor,
      longitudeDelta: r.longitudeDelta * factor,
    }));

  return (
    <View
      ref={paneRef as never}
      style={[{ overflow: 'hidden', backgroundColor: '#0F1115' }, style]}
    >
      {/* Background press catcher — sits under markers/controls, so marker
          presses never double as map presses (RNW Pressable also drops
          onLayout, hence the plain View root above). */}
      {onPress || onLongPress ? (
        <Pressable
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          onPress={
            onPress
              ? () =>
                  onPress({
                    nativeEvent: {
                      coordinate: { latitude: region.latitude, longitude: region.longitude },
                    },
                  })
              : undefined
          }
          onLongPress={
            onLongPress
              ? () =>
                  onLongPress({
                    nativeEvent: {
                      coordinate: { latitude: region.latitude, longitude: region.longitude },
                    },
                  })
              : undefined
          }
        />
      ) : null}

      {/* Decorative grid so the pane reads as a map */}
      {Array.from({ length: GRID_CELLS - 1 }, (_, i) => (
        <View
          key={`v${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${((i + 1) / GRID_CELLS) * 100}%`,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        />
      ))}
      {Array.from({ length: GRID_CELLS - 1 }, (_, i) => (
        <View
          key={`h${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: `${((i + 1) / GRID_CELLS) * 100}%`,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        />
      ))}

      <MapContext.Provider value={{ region, size }}>
        {size.width > 0 ? children : null}
      </MapContext.Provider>

      {/* Shim affordances: watermark + zoom (no pan/zoom gestures on the fake) */}
      <View
        style={{
          position: 'absolute',
          bottom: 100,
          left: 16,
          gap: 8,
          alignItems: 'flex-start',
        }}
      >
        {[
          { label: '+', factor: 0.5 },
          { label: '−', factor: 2 },
        ].map(({ label, factor }) => (
          <Pressable
            key={label}
            onPress={() => zoom(factor)}
            accessibilityLabel={label === '+' ? 'Zoom in' : 'Zoom out'}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#F2F4F6', fontSize: 18, lineHeight: 20 }}>{label}</Text>
          </Pressable>
        ))}
        <Text
          style={{
            color: 'rgba(242,244,246,0.25)',
            fontSize: 9,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Dev map (web shim)
        </Text>
      </View>
    </View>
  );
});

interface MarkerProps {
  coordinate: LatLng;
  anchor?: { x: number; y: number }; // ignored — children always centered
  onPress?: () => void;
  tracksViewChanges?: boolean;
  draggable?: boolean;
  onDragEnd?: (event: { nativeEvent: { coordinate: LatLng } }) => void;
  children?: ReactNode;
}

export function Marker({ coordinate, onPress, children }: MarkerProps) {
  const ctx = useContext(MapContext);
  if (!ctx || ctx.size.width === 0) return null;
  const { x, y } = project(ctx.region, ctx.size, coordinate);

  // Zero-size box + center alignment ⇒ child's center sits on the coordinate
  // (negative free space splits evenly), matching anchor {0.5, 0.5}.
  return (
    <View
      pointerEvents={onPress ? 'box-none' : 'none'}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 0,
        height: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {onPress ? <Pressable onPress={onPress}>{children}</Pressable> : children}
    </View>
  );
}

interface CircleProps {
  center: LatLng;
  radius: number; // meters
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export function Circle({ center, radius, fillColor, strokeColor, strokeWidth }: CircleProps) {
  const ctx = useContext(MapContext);
  if (!ctx || ctx.size.width === 0) return null;
  const { x, y } = project(ctx.region, ctx.size, center);
  const pxPerMeter = ctx.size.height / (ctx.region.latitudeDelta * METERS_PER_DEG_LAT);
  const d = Math.max(radius * 2 * pxPerMeter, 2);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - d / 2,
        top: y - d / 2,
        width: d,
        height: d,
        borderRadius: d / 2,
        backgroundColor: fillColor,
        borderColor: strokeColor,
        borderWidth: strokeWidth ?? 0,
      }}
    />
  );
}

export function Callout({ children }: { children?: ReactNode }) {
  return <View>{children}</View>;
}

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = undefined;
export type { Region, LatLng };

export default MapView;
