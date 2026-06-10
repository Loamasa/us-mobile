import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Firebase config — real project values from google-services.json.
// Note: The web SDK needs an authDomain and appId. If you registered a Web app
// in Firebase Console, replace appId with the web-specific one.
const firebaseConfig = {
  apiKey: 'AIzaSyCQE2t2nLYTxKMA7SeM-FPx1y2th9wEHFM',
  authDomain: 'us-v1-ff6b3.firebaseapp.com',
  projectId: 'us-v1-ff6b3',
  storageBucket: 'us-v1-ff6b3.firebasestorage.app',
  messagingSenderId: '1087842612078',
  appId: '1:1087842612078:android:28042aad4b5a7a45b9c77f',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ─── Emulator Connection ─────────────────────────────
// Connect to Firebase emulators in development.
// Expo Go on a phone needs the computer's LAN IP, not "localhost".
const USE_EMULATORS = __DEV__;

export function getEmulatorHost() {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  }
  const debuggerHost = Constants.expoConfig?.hostUri;
  return debuggerHost ? debuggerHost.split(':')[0] : '127.0.0.1';
}

// On web, emulator traffic goes through the Metro dev server (same origin) and
// is forwarded by path prefix (see metro.config.js). Sandboxed preview browsers
// can only reach the dev-server port, so direct :9099/:8088 fetches fail there.
export function getAuthEmulatorUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return `http://${getEmulatorHost()}:9099`;
}

export function getFirestoreEmulatorUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return `http://${getEmulatorHost()}:8088`;
}

if (USE_EMULATORS) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      connectAuthEmulator(auth, window.location.origin, { disableWarnings: true });
      connectFirestoreEmulator(db, window.location.hostname, Number(window.location.port) || 80);
    } else {
      const hostIP = getEmulatorHost();
      connectAuthEmulator(auth, `http://${hostIP}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, hostIP, 8088);
    }
    console.log(`🔥 Firebase emulators connected via ${getAuthEmulatorUrl()}`);
  } catch (e) {
    // Already connected — safe to ignore
    console.log('Firebase emulators already connected');
  }
}
