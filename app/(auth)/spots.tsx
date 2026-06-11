// On web, react-native-maps resolves to the dev shim (metro.config.js →
// src/dev/fakeMaps.tsx), so the real spots step runs in the browser too.
export { default } from './spots.native';
