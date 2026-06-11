import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface PlaceResult {
  lat: number;
  lng: number;
  /** Human-readable match label when the geocoder provides one. */
  label: string | null;
}

/**
 * Forward-geocode a free-text address/place query to a coordinate.
 * Native: the platform geocoder via expo-location (no API key needed).
 * Web (dev/browser testing): OpenStreetMap Nominatim — light dev use only;
 * unreachable from sandboxed preview browsers (they can only reach Metro).
 * Returns null when nothing matches.
 */
export default async function searchPlace(query: string): Promise<PlaceResult | null> {
  const q = query.trim();
  if (!q) return null;

  if (Platform.OS === 'web') {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
    );
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
    }>;
    if (!results.length) return null;
    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      label: results[0].display_name ?? null,
    };
  }

  const results = await Location.geocodeAsync(q);
  if (!results.length) return null;
  return { lat: results[0].latitude, lng: results[0].longitude, label: null };
}
