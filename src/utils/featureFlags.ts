export const FEATURE_FLAGS = {
  BACKGROUND_LOCATION: false, // Stretch goal for MVP
  QR_CODE_ADD_FRIEND: true,
  SIGNAL_BROADCASTING: true,
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}
