// Design System Colors
export const COLORS = {
  void: '#0F1115',
  fog: '#F2F4F6',
  signal: '#2E5CFF',
  mint: '#00E096',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  rose: '#F472B6',
  red: '#EF4444',
  orange: '#F97316',
  purple: '#A855F7',
} as const;

// Tester accounts (Phase 3): the sign-in screen appends this domain to bare
// account IDs (tester01 → tester01@us.test). Keep in sync with EMAIL_DOMAIN in
// src/dev/provisionTesters.js. .test is RFC-reserved — no mail is ever sent.
export const TESTER_EMAIL_DOMAIN = 'us.test';

// Where the in-app "Report a Bug" row and the privacy notice point. The
// project owner's address (same account that owns the Firebase project).
export const SUPPORT_EMAIL = 'pal.schakonat@gmail.com';

// Map Defaults
export const MAP_DEFAULTS = {
  // Malmö, Sweden (dev default)
  initialRegion: {
    latitude: 55.6049,
    longitude: 13.0038,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  },
  // Cluster radius in meters — friends within this distance form a cluster
  clusterRadiusMeters: 100,
  // Minimum location update distance in meters
  locationDistanceInterval: 50,
} as const;

// Signal Presets
export const SIGNAL_PRESETS = [
  { emoji: '🍺', text: 'Beer' },
  { emoji: '📚', text: 'Studying' },
  { emoji: '☕', text: 'Fika' },
  { emoji: '🛹', text: 'Skating' },
  { emoji: '🎮', text: 'Gaming' },
  { emoji: '🏋️', text: 'Gym' },
  { emoji: '🍔', text: 'Lunch' },
  { emoji: '🎬', text: 'Movies' },
  { emoji: '🎨', text: 'Art' },
] as const;

// Signal Duration Options (in milliseconds)
export const SIGNAL_DURATIONS = [
  { label: '1 Hour', ms: 60 * 60 * 1000 },
  { label: '4 Hours', ms: 4 * 60 * 60 * 1000 },
  { label: 'Until Tonight', ms: 0 }, // Calculated at runtime to 23:59
] as const;

// Group broadcast "here now" containment radius in meters
export const BROADCAST_RADIUS = 150;

// Location docs carry expireAt = now + this, the target of a Firestore TTL
// policy (console: TTL on locations.expireAt) — GDPR storage limitation +
// cleanup for apps killed while inside a spot.
export const LOCATION_TTL_MS = 24 * 60 * 60 * 1000;

// A location doc older than this renders as stale ("last seen") instead of
// live — the publisher rewrites every 60s while in a spot, so a few missed
// beats means the app is gone, not the friend.
export const LOCATION_STALE_MS = 5 * 60 * 1000;

// Spot Emoji Presets (for onboarding)
export const SPOT_EMOJI_PRESETS = [
  { emoji: '🏠', label: 'Home' },
  { emoji: '💻', label: 'Work' },
  { emoji: '🏋️', label: 'Gym' },
  { emoji: '☕', label: 'Café' },
  { emoji: '📚', label: 'Library' },
  { emoji: '🌳', label: 'Park' },
  { emoji: '🛹', label: 'Skate' },
  { emoji: '🎵', label: 'Studio' },
] as const;

// Max spots during onboarding
export const MAX_ONBOARDING_SPOTS = 3;

// Default spot radius in meters
export const DEFAULT_SPOT_RADIUS = 200;

// Spot icon grid for manage-places modal (from prototype)
export const SPOT_ICONS = [
  '🏠', '💼', '🏋️', '🎓', '☕',
  '🍺', '🌳', '🏖️', '🎮', '❤️',
  '📍', '🚲', '🛒', '🍔', '📚',
] as const;

// Radius slider range for spot creation/editing
export const SPOT_RADIUS_RANGE = { min: 50, max: 1000, step: 50 } as const;
