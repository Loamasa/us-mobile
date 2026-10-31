import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth';
// getReactNativePersistence lives only in the react-native entry of
// @firebase/auth. Metro resolves it via the "react-native" exports condition;
// tsc can't (the export map's "types" condition takes precedence and the
// public browser types don't declare it) — hence the expect-error.
// @ts-expect-error — typed only in the react-native entry (see above)
import { getReactNativePersistence } from '@firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Firebase config — real project values from google-services.json.
// Note: The web SDK needs an authDomain and appId. If you registered a Web app
// in Firebase Console, replace appId with the web-specific one.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyCQE2t2nLYTxKMA7SeM-FPx1y2th9wEHFM',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'us-v1-ff6b3.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'us-v1-ff6b3',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'us-v1-ff6b3.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '1087842612078',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '1:1087842612078:android:28042aad4b5a7a45b9c77f',
};

const app = initializeApp(firebaseConfig);

// Native needs EXPLICIT AsyncStorage persistence: plain getAuth() on React
// Native is memory-only in the JS SDK, signing every user out on app kill.
// Web keeps getAuth's indexedDB default. The try/catch handles Fast Refresh
// re-evaluating this module — initializeAuth throws on a second call.
function createAuth(): Auth {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // Expected on Fast Refresh (initializeAuth throws when called twice —
    // the existing instance KEPT its persistence). Any other cause means the
    // fallback is memory-only and testers would sign out on app kill, so
    // make the downgrade loud instead of silent.
    console.warn('initializeAuth fell back to getAuth:', e);
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);

// ─── Emulator Connection ─────────────────────────────
// Connect to Firebase emulators in development.
// Expo Go on a phone needs the computer's LAN IP, not "localhost".
// Set EXPO_PUBLIC_USE_EMULATORS=false to dry-run the PRODUCTION backend from a
// dev build (Phase 3 Step 2) — emulators stay the dev default otherwise.
const USE_EMULATORS = __DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS !== 'false';

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
