import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import Constants from 'expo-constants';

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

if (USE_EMULATORS) {
  // debuggerHost gives us "192.168.x.x:8081" — we extract just the IP
  const debuggerHost = Constants.expoConfig?.hostUri ?? 'localhost:8081';
  const hostIP = debuggerHost.split(':')[0];

  try {
    connectAuthEmulator(auth, `http://${hostIP}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, hostIP, 8088);
    console.log(`🔥 Firebase emulators connected at ${hostIP}`);
  } catch (e) {
    // Already connected — safe to ignore
    console.log('Firebase emulators already connected');
  }
}
