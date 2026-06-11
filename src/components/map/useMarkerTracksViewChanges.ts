import { useEffect, useState } from 'react';

// How long to keep tracking after mount / content change. Long enough for
// SVG icons and custom-font text to paint before the snapshot freezes.
const CAPTURE_MS = 1200;

/**
 * Android react-native-maps renders a Marker's children into a bitmap.
 * With tracksViewChanges={false} from mount, async-drawn content (SVG icons,
 * custom-font text, avatars) gets snapshotted before it paints — the marker
 * renders invisible/blank on device (browser shim unaffected, which is why
 * this only ever showed up in physical-device runs).
 *
 * Returns true briefly on mount and whenever `contentKey` changes, then
 * settles to false for performance. Pass a string key derived from every
 * prop that changes the marker's rendered content.
 */
export function useMarkerTracksViewChanges(contentKey: string): boolean {
  const [tracking, setTracking] = useState(true);

  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), CAPTURE_MS);
    return () => clearTimeout(timer);
  }, [contentKey]);

  return tracking;
}
