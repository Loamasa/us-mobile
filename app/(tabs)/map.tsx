// On web, react-native-maps resolves to the dev shim (metro.config.js →
// src/dev/fakeMaps.tsx), so the real map screen runs in the browser too.
export { default } from './map.native';
