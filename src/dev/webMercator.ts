/**
 * Web Mercator math for the dev web map shim (src/dev/fakeMaps.tsx).
 *
 * Pure functions, no React / React Native imports, so `npm test` can run them
 * in Node (compiled by tsconfig.checks.json). Coordinates follow the slippy-map
 * convention: "world" x/y are fractions 0..1 of the whole map, scaled by
 * TILE_SIZE * 2^zoom to get pixels at a zoom level.
 */

export const TILE_SIZE = 256;
export const MAX_TILE_ZOOM = 19;
const MAX_LATITUDE = 85.05112878; // Web Mercator cutoff (square world)
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;

export type LatLng = { latitude: number; longitude: number };
export type Region = LatLng & { latitudeDelta: number; longitudeDelta: number };
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

export interface Tile {
  /** Stable React key: unwrapped column, so a world repeated at low zoom stays unique. */
  key: string;
  /** Slippy-map tile address (x already wrapped into 0..2^z-1). */
  z: number;
  x: number;
  y: number;
  /** Placement in viewport pixels, rounded so neighbouring tiles never gap. */
  left: number;
  top: number;
  width: number;
  height: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function lngToWorldX(longitude: number): number {
  return (longitude + 180) / 360;
}

export function latToWorldY(latitude: number): number {
  const sin = Math.sin(toRad(clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE)));
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

export function worldXToLng(x: number): number {
  return x * 360 - 180;
}

export function worldYToLat(y: number): number {
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

/**
 * The zoom at which `region` fits inside `size` — like the real map, both
 * deltas must fit, so the tighter axis wins. Fractional; clamped to 0..20.
 */
export function zoomForRegion(region: Region, size: Size): number {
  if (size.width <= 0 || size.height <= 0) return 0;
  const spanX = Math.max(region.longitudeDelta, 1e-9) / 360;
  const spanY = Math.max(
    Math.abs(
      latToWorldY(region.latitude - region.latitudeDelta / 2) -
        latToWorldY(region.latitude + region.latitudeDelta / 2)
    ),
    1e-12
  );
  const zoomX = Math.log2(size.width / (TILE_SIZE * spanX));
  const zoomY = Math.log2(size.height / (TILE_SIZE * spanY));
  return clamp(Math.min(zoomX, zoomY), 0, 20);
}

/** Pixel size of the whole world at `zoom`. */
export function worldPixels(zoom: number): number {
  return TILE_SIZE * 2 ** zoom;
}

/** Viewport pixel for a coordinate (the region's center sits mid-viewport). */
export function project(region: Region, size: Size, coord: LatLng): Point {
  const px = worldPixels(zoomForRegion(region, size));
  return {
    x: size.width / 2 + (lngToWorldX(coord.longitude) - lngToWorldX(region.longitude)) * px,
    y: size.height / 2 + (latToWorldY(coord.latitude) - latToWorldY(region.latitude)) * px,
  };
}

/** Coordinate under a viewport pixel — the inverse of `project`. */
export function unproject(region: Region, size: Size, point: Point): LatLng {
  const px = worldPixels(zoomForRegion(region, size));
  return {
    latitude: worldYToLat(latToWorldY(region.latitude) + (point.y - size.height / 2) / px),
    longitude: worldXToLng(lngToWorldX(region.longitude) + (point.x - size.width / 2) / px),
  };
}

/** Meters covered by one viewport pixel at `latitude` and `zoom`. */
export function metersPerPixel(latitude: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos(toRad(latitude))) / worldPixels(zoom);
}

/**
 * Region after dragging the map content by (dx, dy) pixels: the point that was
 * under the cursor stays under it, so the center moves the opposite way.
 * Deltas are kept, so the zoom does not change.
 */
export function panRegion(region: Region, size: Size, dx: number, dy: number): Region {
  const center = unproject(region, size, { x: size.width / 2 - dx, y: size.height / 2 - dy });
  return {
    ...region,
    latitude: clamp(center.latitude, -MAX_LATITUDE, MAX_LATITUDE),
    longitude: ((((center.longitude + 180) % 360) + 360) % 360) - 180,
  };
}

/**
 * The region actually visible in `size` (what react-native-maps reports from
 * onRegionChangeComplete): the requested deltas re-fitted to the viewport.
 */
export function visibleRegion(region: Region, size: Size): Region {
  const topLeft = unproject(region, size, { x: 0, y: 0 });
  const bottomRight = unproject(region, size, { x: size.width, y: size.height });
  return {
    latitude: region.latitude,
    longitude: region.longitude,
    latitudeDelta: Math.abs(topLeft.latitude - bottomRight.latitude),
    longitudeDelta: Math.abs(bottomRight.longitude - topLeft.longitude),
  };
}

/** Raster tiles that cover the viewport, at the nearest integer tile zoom. */
export function visibleTiles(region: Region, size: Size): Tile[] {
  if (size.width <= 0 || size.height <= 0) return [];
  const zoom = zoomForRegion(region, size);
  const z = clamp(Math.round(zoom), 0, MAX_TILE_ZOOM);
  const tilesPerSide = 2 ** z;
  const scale = 2 ** (zoom - z); // screen px per tile px
  const tilePx = TILE_SIZE * scale;

  // Center in tile-pixel space at the integer zoom, then the viewport's corner.
  const centerX = lngToWorldX(region.longitude) * tilesPerSide * TILE_SIZE;
  const centerY = latToWorldY(region.latitude) * tilesPerSide * TILE_SIZE;
  const originX = centerX - size.width / 2 / scale;
  const originY = centerY - size.height / 2 / scale;

  const firstX = Math.floor(originX / TILE_SIZE);
  const firstY = Math.floor(originY / TILE_SIZE);
  const lastX = Math.floor((originX + size.width / scale) / TILE_SIZE);
  const lastY = Math.floor((originY + size.height / scale) / TILE_SIZE);

  const tiles: Tile[] = [];
  for (let ty = firstY; ty <= lastY; ty++) {
    if (ty < 0 || ty >= tilesPerSide) continue; // no tiles beyond the poles
    for (let tx = firstX; tx <= lastX; tx++) {
      const left = Math.round((tx * TILE_SIZE - originX) * scale);
      const top = Math.round((ty * TILE_SIZE - originY) * scale);
      tiles.push({
        key: `${z}/${tx}/${ty}`,
        z,
        x: ((tx % tilesPerSide) + tilesPerSide) % tilesPerSide, // wrap the antimeridian
        y: ty,
        left,
        top,
        width: Math.round((tx * TILE_SIZE - originX) * scale + tilePx) - left,
        height: Math.round((ty * TILE_SIZE - originY) * scale + tilePx) - top,
      });
    }
  }
  return tiles;
}

/** Fill a `{z}/{x}/{y}` URL template. */
export function tileUrl(template: string, tile: Pick<Tile, 'z' | 'x' | 'y'>): string {
  return template
    .replace('{z}', String(tile.z))
    .replace('{x}', String(tile.x))
    .replace('{y}', String(tile.y));
}
