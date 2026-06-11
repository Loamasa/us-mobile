import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, getAuthEmulatorUrl } from '@/config/firebase';
import '../global.css';

const DEV_EMAIL = 'dev@test.dev';
const DEV_PASSWORD = 'test123456';
const DEV_UID = 'dev-user';
// Auth users live in the emulator's default project (started with
// --project demo-us-app): key-based SDK requests always resolve there.
const EMULATOR_PROJECT_ID = 'demo-us-app';

/**
 * Dev auto-sign-in: creates a Firebase user with UID "dev-user" via
 * the emulator admin REST API, then signs in with email+password.
 * Creates a test profile in Firestore if missing.
 *
 * Uses a two-step approach because the emulator admin API's rawPassword
 * field doesn't reliably set the password. We create the user (for the
 * fixed UID), then update the password via a separate endpoint.
 */
async function ensureDevUser() {
  // Wait for async persistence restoration before deciding to auto-sign-in —
  // auth.currentUser is still null at boot even when a session exists, so a
  // synchronous check would stomp a persisted tester/persona session with
  // dev-user on every reload.
  const restored = await new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
  if (restored) {
    console.log('🧪 Restored session as', restored.uid);
    return;
  }

  const baseUrl = `${getAuthEmulatorUrl()}/identitytoolkit.googleapis.com/v1`;
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer owner',
  };

  // Helper: create auth user with fixed UID via admin API
  async function createDevAuthUser() {
    // Step 1: Create user with fixed UID
    const createRes = await fetch(
      `${baseUrl}/projects/${EMULATOR_PROJECT_ID}/accounts`,
      {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          localId: DEV_UID,
          email: DEV_EMAIL,
          displayName: 'Dev User',
          emailVerified: true,
        }),
      }
    );

    if (!createRes.ok) {
      const body = await createRes.text();
      // DUPLICATE_LOCAL_ID or EMAIL_EXISTS means user exists — that's fine
      if (!body.includes('DUPLICATE') && !body.includes('EXISTS')) {
        console.warn('Admin user create failed:', body);
      }
    }

    // Step 2: Set password via accounts:update endpoint (this reliably works)
    const updateRes = await fetch(`${baseUrl}/accounts:update`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        localId: DEV_UID,
        password: DEV_PASSWORD,
      }),
    });

    if (!updateRes.ok) {
      console.warn('Admin password update failed:', await updateRes.text());
    }
  }

  // Try sign-in first (user may already exist with correct password)
  try {
    await signInWithEmailAndPassword(auth, DEV_EMAIL, DEV_PASSWORD);
  } catch (err: any) {
    console.log('🧪 Dev sign-in failed, creating user...', err.code);

    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      // Delete existing user (if wrong password) via emulator clear endpoint
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        try {
          await fetch(
            `${getAuthEmulatorUrl()}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/accounts`,
            { method: 'DELETE', headers: adminHeaders }
          );
          console.log('🧹 Cleared stale auth emulator accounts');
        } catch {
          // Ignore cleanup errors
        }
      }

      // Create the user with fixed UID and proper password
      await createDevAuthUser();

      // Now sign in
      await signInWithEmailAndPassword(auth, DEV_EMAIL, DEV_PASSWORD);
    } else {
      throw err;
    }
  }

  const uid = auth.currentUser!.uid;
  console.log('🧪 Signed in as', uid);

  // Ensure Firestore profile exists
  const profileSnap = await getDoc(doc(db, 'users', uid));
  if (!profileSnap.exists()) {
    await setDoc(doc(db, 'users', uid), {
      displayName: 'Dev User',
      handle: 'dev',
      bio: '🛠️ Development account',
      avatarUrl: null,
      phoneNumber: '',
      settings: {
        globalLocationSharing: true,
        allowFriendRequests: true,
        showOnlineStatus: true,
      },
      currentSignal: null,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'handles', 'dev'), { userId: uid });
    console.log('🧪 Dev profile created for', uid);
  }
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (__DEV__) {
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          console.warn('⏱️ Dev auto-sign-in timed out — emulators might not be running');
          resolve();
        }, 5000);
      });

      Promise.race([ensureDevUser(), timeout])
        .then(() => setReady(true))
        .catch((err) => {
          console.warn('Dev auto-sign-in failed:', err);
          setReady(true);
        })
        .finally(() => clearTimeout(timer));
    } else {
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
      {/* Root stack (not Slot): keeps (tabs) mounted under pushed routes like
          /chat/[chatId], so back returns to the tab you came from. */}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
