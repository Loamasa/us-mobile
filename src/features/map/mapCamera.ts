/**
 * Pure camera + geometry helpers for the MapLibre map (AppMap.native.tsx).
 * No React / React Native imports, so `npm test` runs them in Node
 * (compiled by tsconfig.checks.json). Types are structural on purpose.
 */

type Coordinate = { latitude: number; longitude: number };
type Region = Coordinate & { latitudeDelta: number; longitudeDelta: number };
type Size = { width: number; height: number };

/** MapLibre zoom 0 shows the whole world in 512 px (not 256 like raster tiles). */
const WORLD_PX_AT_ZOOM_0 = 512;
const MAX_LATITUDE = 85.05112878;
const EARTH_RADIUS_M = 6_371_008.8;
const MIN_ZOOM = 0;
const MAX_ZOOM = 20;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

function latToWorldY(latitude: number): number {
  const sin = Math.sin(toRad(clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE)));
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

/**
 * The MapLibre zoom at which `region` fits inside a view of `size` points.
 * Both deltas must fit, so the tighter axis wins (like the old
 * react-native-maps initialRegion). Fractional, clamped to 0..20.
 */
export function zoomForRegion(region: Region, size: Size): number {
  if (size.width <= 0 || size.height <= 0) return MIN_ZOOM;
  const spanX = Math.max(region.longitudeDelta, 1e-9) / 360;
  const spanY = Math.max(
    Math.abs(
      latToWorldY(region.latitude - region.latitudeDelta / 2) -
        latToWorldY(region.latitude + region.latitudeDelta / 2)
    ),
    1e-12
  );
  const zoomX = Math.log2(size.width / (WORLD_PX_AT_ZOOM_0 * spanX));
  const zoomY = Math.log2(size.height / (WORLD_PX_AT_ZOOM_0 * spanY));
  return clamp(Math.min(zoomX, zoomY), MIN_ZOOM, MAX_ZOOM);
}

/**
 * A closed GeoJSON ring of `[lng, lat]` points `radiusMeters` from `center`
 * (great-circle destination formula). MapLibre has no circle-in-meters
 * primitive, so spot / gathering zones are drawn as this polygon.
 */
export function circleRing(
  center: Coordinate,
  radiusMeters: number,
  steps = 64
): [number, number][] {
  const lat1 = toRad(center.latitude);
  const lng1 = toRad(center.longitude);
  const angular = Math.max(radiusMeters, 0) / EARTH_RADIUS_M;
  const ring: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing)
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
      );
    ring.push([toDeg(lng2), toDeg(lat2)]);
  }
  ring.push(ring[0]);
  return ring;
}
