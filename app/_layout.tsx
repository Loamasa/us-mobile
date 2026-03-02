import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import '../global.css';

/**
 * Dev auto-sign-in: silently creates an anonymous Firebase user
 * and a test profile so all Firestore features work without
 * going through the auth/onboarding flow.
 */
async function ensureDevUser() {
  // Already signed in?
  if (auth.currentUser) return;

  // Sign in anonymously on the emulator
  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;

  // Create a dev profile if one doesn't exist
  const profileSnap = await getDoc(doc(db, 'users', uid));
  if (!profileSnap.exists()) {
    await setDoc(doc(db, 'users', uid), {
      displayName: 'Dev User',
      handle: 'dev',
      bio: '🛠️ Development account',
      avatarUrl: null,
      settings: {
        globalLocationSharing: true,
        allowFriendRequests: true,
      },
      currentSignal: null,
      createdAt: new Date().toISOString(),
    });
    // Reserve the handle
    await setDoc(doc(db, 'handles', 'dev'), { userId: uid });
    console.log('🧪 Dev profile created for', uid);
  }
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (__DEV__) {
      // Race between dev sign-in and a 5s timeout
      const timeout = new Promise<void>((resolve) => setTimeout(() => {
        console.warn('⏱️ Dev auto-sign-in timed out — emulators might not be running');
        resolve();
      }, 5000));

      Promise.race([ensureDevUser(), timeout])
        .then(() => setReady(true))
        .catch((err) => {
          console.warn('Dev auto-sign-in failed:', err);
          setReady(true);
        });
    } else {
      // In production, you'd use a proper auth guard here
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F1115', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2E5CFF" />
        <Text style={{ color: 'rgba(242,244,246,0.5)', marginTop: 12, fontSize: 12 }}>
          Setting up dev environment...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}
