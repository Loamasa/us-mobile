/**
 * Global Feature Flags for the 'us' application.
 * Controls progressive rollout of new systems.
 */

export const FEATURE_FLAGS = {
  USER_SUBSCRIPTIONS: true,
  SERVER_SUPPORT: true,
  ANIMATED_AVATARS: false, // Experimental
  GATED_UPLOADS: true
};

export const isFeatureEnabled = (flag: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[flag] ?? false;
};