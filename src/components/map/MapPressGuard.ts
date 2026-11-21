import { createContext } from 'react';

/**
 * Lets a marker tell its map "this tap was mine", so the map's own onPress
 * (dismiss card / place a gathering) doesn't also fire for the same touch.
 * Native only — see AppMap.native.tsx.
 */
const MapPressGuard = createContext<{ markerPressed: () => void } | null>(null);

export default MapPressGuard;
