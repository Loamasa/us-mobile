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

// Client identifiers, not secrets: access is controlled by firestore.rules.
// Plain constants on purpose. Env-driven values aren't available to `eas update`,
// so an over-the-air fix could silently point testers at another project.
const firebaseConfig = {
  apiKey: 'AIzaSyBzqReaQtKNzcZ0UeKFVcHUiWcbzQLkaNQ',
  authDomain: 'us-felix-test-20261030.firebaseapp.com',
  projectId: 'us-felix-test-20261030',
  storageBucket: 'us-felix-test-20261030.firebasestorage.app',
  messagingSenderId: '1051180260252',
  appId: '1:1051180260252:web:a14c373f529b7397104659',
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
// A phone needs the computer's LAN IP, not "localhost".
// Set EXPO_PUBLIC_USE_EMULATORS=false to dry-run the real backend from a dev
// build; emulators stay the dev default otherwise.
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
