/**
 * OpenStreetMap stand-in for react-native-maps. metro.config.js resolves
 * 'react-native-maps' to this file on web AND Android, so the same map
 * screens run in the browser and in the APK without Google Maps (no key, no
 * billing). iOS still gets the real package (Apple Maps).
 *
 * Web Mercator projection (math in ./webMercator.ts, unit-tested by
 * `npm test`) over OpenStreetMap raster tiles, darkened to the app's void
 * theme. Web: drag to pan, wheel or +/- to zoom. Android: drag to pan, pinch
 * or +/- to zoom. Taps report the tapped coordinate. Markers assume the
 * anchor={{ x: 0.5, y: 0.5 }} this codebase always passes (children centered
 * on the coordinate).
 *
 * Tiles: EXPO_PUBLIC_DEV_MAP_TILES — unset = OSM standard tiles; "off" = the
 * old dark grid (offline / CI screenshots); any other value = a
 * `{z}/{x}/{y}` URL template. OSM's tile policy allows light use (a small
 * tester group) with visible attribution and an app User-Agent.
 * shortcut: tile.openstreetmap.org is not for public-release traffic, switch
 * to a paid/self-hosted tile source before a public launch.
 */
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Image, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import {
  metersPerPixel,
  panRegion,
  project,
  tileUrl,
  unproject,
  visibleRegion,
  visibleTiles,
  zoomForRegion,
} from './webMercator';
import type { LatLng, Region, Size } from './webMercator';

const FALLBACK_REGION: Region = {
  latitude: 55.6049,
  longitude: 13.0038,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILES_SETTING = process.env.EXPO_PUBLIC_DEV_MAP_TILES;
const TILE_TEMPLATE = TILES_SETTING === 'off' ? null : TILES_SETTING || OSM_TILES;
const TILE_ATTRIBUTION =
  TILE_TEMPLATE === OSM_TILES ? '© OpenStreetMap contributors' : 'Map tiles: custom source';
// Light OSM tiles → dark map close to DARK_MAP_STYLE (void background, muted roads).
const DARK_TILE_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.35)';
const IS_WEB = Platform.OS === 'web';
// OSM's tile policy blocks generic HTTP-library User-Agents; browsers send their own.
const TILE_HEADERS = IS_WEB ? undefined : { 'User-Agent': 'us-mobile/1.0 (com.us.mobile)' };

const DRAG_THRESHOLD_PX = 6;
const MIN_ZOOM_DELTA = 0.0005; // ~zoom 17 on a phone-sized pane
const MAX_ZOOM_DELTA = 120;

const MapContext = createContext<{ region: Region; size: Size } | null>(null);

// Web-only style keys (react-native-web passes them to the DOM).
const webOnly = (style: Record<string, unknown>) => style as object;

interface MapViewProps {
  style?: object;
  initialRegion?: Region;
  region?: Region;
  onPress?: (event: { nativeEvent: { coordinate: LatLng } }) => void;
  onLongPress?: (event: { nativeEvent: { coordinate: LatLng } }) => void;
  onRegionChangeComplete?: (region: Region) => void;
  children?: ReactNode;
  // Accepted-and-ignored real props so callers don't need web forks:
  customMapStyle?: unknown;
  provider?: unknown;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
}

const GRID_CELLS = 10;

function TileLayer({ region, size }: { region: Region; size: Size }) {
  if (!TILE_TEMPLATE) return null;
  return (
    <View
      pointerEvents="none"
      style={webOnly({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        filter: DARK_TILE_FILTER,
      })}
    >
      {visibleTiles(region, size).map((tile) => (
        <Image
          key={tile.key}
          source={{ uri: tileUrl(TILE_TEMPLATE, tile), headers: TILE_HEADERS }}
          style={{
            position: 'absolute',
            left: tile.left,
            top: tile.top,
            width: tile.width,
            height: tile.height,
          }}
        />
      ))}
    </View>
  );
}

function Grid() {
  const line = { position: 'absolute' as const, backgroundColor: 'rgba(255,255,255,0.04)' };
  return (
    <>
      {Array.from({ length: GRID_CELLS - 1 }, (_, i) => (
        <View
          key={`v${i}`}
          pointerEvents="none"
          style={{ ...line, left: `${((i + 1) / GRID_CELLS) * 100}%`, top: 0, bottom: 0, width: 1 }}
        />
      ))}
      {Array.from({ length: GRID_CELLS - 1 }, (_, i) => (
        <View
          key={`h${i}`}
          pointerEvents="none"
          style={{ ...line, top: `${((i + 1) / GRID_CELLS) * 100}%`, left: 0, right: 0, height: 1 }}
        />
      ))}
    </>
  );
}

const clampDelta = (d: number) => Math.min(MAX_ZOOM_DELTA, Math.max(MIN_ZOOM_DELTA, d));

/** True when some ancestor of `el` can scroll vertically right now. */
function insideScrollable(el: HTMLElement): boolean {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return true;
    }
  }
  return false;
}

const MapView = forwardRef(function MapView(props: MapViewProps, ref) {
  const { style, initialRegion, region: regionProp, onPress, onLongPress, children } = props;
  const [region, setRegion] = useState<Region>(
    regionProp ?? initialRegion ?? FALLBACK_REGION
  );
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [pane, setPane] = useState<HTMLElement | null>(null);

  // Latest values for the DOM listeners (registered once per pane element).
  const regionRef = useRef(region);
  regionRef.current = region;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const onRegionChangeCompleteRef = useRef(props.onRegionChangeComplete);
  onRegionChangeCompleteRef.current = props.onRegionChangeComplete;
  /** Where the current/last press started, in pane pixels. */
  const pressPointRef = useRef<{ x: number; y: number } | null>(null);
  /** True from the moment a press turns into a drag until after its release. */
  const draggedRef = useRef(false);

  const reportRegion = useCallback((next: Region) => {
    const s = sizeRef.current;
    onRegionChangeCompleteRef.current?.(s.width > 0 ? visibleRegion(next, s) : next);
  }, []);

  const changeRegion = useCallback(
    (update: (r: Region) => Region) => {
      const next = update(regionRef.current);
      regionRef.current = next;
      setRegion(next);
      reportRegion(next);
    },
    [reportRegion]
  );

  // This file only ever runs on web (Metro resolver), so measure the pane with
  // DOM APIs — RNW's onLayout proved unreliable here. RNW View refs expose the
  // host element.
  const paneRef = useCallback((node: unknown) => {
    const el = node as HTMLElement | null;
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    setPane(el);
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

  // Keep the size current when the window or layout changes.
  useEffect(() => {
    if (!pane || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) {
        setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
      }
    });
    observer.observe(pane);
    return () => observer.disconnect();
  }, [pane]);

  // Drag to pan + wheel to zoom, via DOM pointer events so the press catcher
  // below keeps its tap/long-press semantics.
  useEffect(() => {
    if (!pane) return;
    let drag: { startX: number; startY: number; region: Region; pointerId: number } | null = null;

    const local = (e: PointerEvent | WheelEvent) => {
      const rect = pane.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pressPointRef.current = local(e);
      draggedRef.current = false;
      drag = { startX: e.clientX, startY: e.clientY, region: regionRef.current, pointerId: e.pointerId };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!draggedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      draggedRef.current = true;
      const next = panRegion(drag.region, sizeRef.current, dx, dy);
      regionRef.current = next;
      setRegion(next);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      drag = null;
      if (draggedRef.current) {
        reportRegion(regionRef.current);
        // Swallow the press that the browser still delivers for this release.
        setTimeout(() => {
          draggedRef.current = false;
        }, 0);
      }
    };
    const onWheel = (e: WheelEvent) => {
      // Cooperative gestures (like embedded Google Maps): inside a scrolling
      // form (My Spots editor) a plain wheel scrolls the form; Ctrl+wheel or a
      // trackpad pinch (Chrome reports it as ctrlKey) zooms the map.
      if (!e.ctrlKey && insideScrollable(pane)) return;
      e.preventDefault();
      // Zoom around the cursor: keep the coordinate under it in place.
      const point = local(e);
      const factor = 2 ** (Math.max(-1, Math.min(1, e.deltaY / 200)));
      changeRegion((r) => {
        const s = sizeRef.current;
        const anchor = unproject(r, s, point);
        const zoomed = {
          ...r,
          latitudeDelta: clampDelta(r.latitudeDelta * factor),
          longitudeDelta: clampDelta(r.longitudeDelta * factor),
        };
        const drift = project(zoomed, s, anchor);
        return panRegion(zoomed, s, point.x - drift.x, point.y - drift.y);
      });
    };

    pane.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    pane.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      pane.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      pane.removeEventListener('wheel', onWheel);
    };
  }, [pane, changeRegion, reportRegion]);

  // Android: drag to pan, pinch to zoom. Capture only once a touch moves (or a
  // second finger lands), so taps still reach markers and the press catcher.
  const gestureRef = useRef<{ region: Region; x: number; y: number; dist: number; two: boolean } | null>(null);
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        g.numberActiveTouches === 2 || Math.hypot(g.dx, g.dy) >= DRAG_THRESHOLD_PX,
      onPanResponderGrant: () => {
        draggedRef.current = true;
        gestureRef.current = null;
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const t = e.nativeEvent.touches;
        if (t.length === 0) return;
        const two = t.length >= 2;
        const x = two ? (t[0].pageX + t[1].pageX) / 2 : t[0].pageX;
        const y = two ? (t[0].pageY + t[1].pageY) / 2 : t[0].pageY;
        const dist = two ? Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY) : 0;
        const start = gestureRef.current;
        // New gesture, or a finger was added/lifted: restart from here so the map never jumps.
        if (!start || start.two !== two) {
          gestureRef.current = { region: regionRef.current, x, y, dist, two };
          return;
        }
        let next = panRegion(start.region, sizeRef.current, x - start.x, y - start.y);
        if (two && dist > 0) {
          // shortcut: zooms around the map center, not the pinch point; anchor it if it feels off.
          const factor = start.dist / dist;
          next = {
            ...next,
            latitudeDelta: clampDelta(start.region.latitudeDelta * factor),
            longitudeDelta: clampDelta(start.region.longitudeDelta * factor),
          };
        }
        regionRef.current = next;
        setRegion(next);
      },
      onPanResponderRelease: () => endGesture(),
      onPanResponderTerminate: () => endGesture(),
    })
  ).current;
  function endGesture() {
    gestureRef.current = null;
    reportRegion(regionRef.current);
    setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  }

  useImperativeHandle(ref, () => ({
    animateToRegion: (next: Region, _duration?: number) => changeRegion(() => next),
  }));

  const zoom = (factor: number) =>
    changeRegion((r) => ({
      ...r,
      latitudeDelta: clampDelta(r.latitudeDelta * factor),
      longitudeDelta: clampDelta(r.longitudeDelta * factor),
    }));

  /** The coordinate under the press, or the center if no position is known. */
  const pressedCoordinate = (): LatLng => {
    const point = pressPointRef.current;
    if (!point || size.width === 0) {
      return { latitude: region.latitude, longitude: region.longitude };
    }
    return unproject(region, size, point);
  };

  const zoomLevel = size.width > 0 ? zoomForRegion(region, size) : 0;

  return (
    <View
      ref={IS_WEB ? (paneRef as never) : undefined}
      // Native has no DOM to measure; onLayout is reliable there.
      onLayout={
        IS_WEB
          ? undefined
          : (e) => {
              const { width, height } = e.nativeEvent.layout;
              setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
            }
      }
      {...(IS_WEB ? {} : responder.panHandlers)}
      style={[
        { overflow: 'hidden', backgroundColor: '#0F1115' },
        IS_WEB ? webOnly({ cursor: 'grab', userSelect: 'none', touchAction: 'none' }) : null,
        style,
      ]}
    >
      {size.width > 0 ? <TileLayer region={region} size={size} /> : null}
      {TILE_TEMPLATE ? null : <Grid />}

      {/* Background press catcher — sits under markers/controls, so marker
          presses never double as map presses (RNW Pressable also drops
          onLayout, hence the plain View root above). A press that became a
          drag is not a tap. */}
      {onPress || onLongPress ? (
        <Pressable
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          // Web gets the press point from its pointerdown listener.
          onPressIn={
            IS_WEB
              ? undefined
              : (e) => {
                  pressPointRef.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
                }
          }
          onPress={
            onPress
              ? () => {
                  if (draggedRef.current) return;
                  onPress({ nativeEvent: { coordinate: pressedCoordinate() } });
                }
              : undefined
          }
          onLongPress={
            onLongPress
              ? () => {
                  if (draggedRef.current) return;
                  onLongPress({ nativeEvent: { coordinate: pressedCoordinate() } });
                }
              : undefined
          }
        />
      ) : null}

      <MapContext.Provider value={{ region, size }}>
        {size.width > 0 ? children : null}
      </MapContext.Provider>

      {/* Shim affordances: zoom buttons, watermark, tile attribution. Full-screen
          maps keep them above the floating tab bar; small embedded maps (My
          Spots editor) pin them to their own bottom edge. */}
      <View
        style={{
          position: 'absolute',
          bottom: size.height >= 400 ? 100 : 8,
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
        {IS_WEB ? (
          <Text
            style={{
              color: 'rgba(242,244,246,0.25)',
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {`Dev map (web shim) · z${zoomLevel.toFixed(1)}`}
          </Text>
        ) : null}
        {TILE_TEMPLATE ? (
          <Text style={{ color: 'rgba(242,244,246,0.45)', fontSize: 9 }}>{TILE_ATTRIBUTION}</Text>
        ) : null}
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
  const zoom = zoomForRegion(ctx.region, ctx.size);
  const d = Math.max((radius * 2) / metersPerPixel(center.latitude, zoom), 2);

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
