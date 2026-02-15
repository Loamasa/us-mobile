import { geohashForLocation, geohashQueryBounds } from 'geofire-common';

/**
 * Encode lat/lng to a geohash string.
 * Precision 6 = ~1.2km cell, good for friend discovery.
 */
export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  return geohashForLocation([lat, lng], precision);
}

/**
 * Get Firestore query bounds for a geohash-based radius query.
 * Returns array of [start, end] string pairs for orderBy('geohash').
 */
export function getGeohashBounds(
  center: [number, number],
  radiusInMeters: number
): [string, string][] {
  return geohashQueryBounds(center, radiusInMeters);
}
