// react-native-maps resolves to the dev shim on web (metro.config.js →
// src/dev/fakeMaps.tsx), so the real marker renders in the browser too.
export { default } from './FriendMarker.native';
