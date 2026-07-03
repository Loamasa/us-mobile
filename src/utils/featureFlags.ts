export const FEATURE_FLAGS = {
  BACKGROUND_LOCATION: false, // Stretch goal for MVP (Phase 3 Step 5)
  // No QR UI exists (expo-camera removed 2026-07-03) — flip back on when the
  // scan-to-add flow ships (wave 3 backlog).
  QR_CODE_ADD_FRIEND: false,
  SIGNAL_BROADCASTING: true,
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}
