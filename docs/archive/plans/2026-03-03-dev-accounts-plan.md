# Dev Accounts & Test Data — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a JSON fixture + seed system for 5 dummy test accounts with fixed Malmö locations, plus an account switcher in Settings, so all social features can be tested without real users.

**Architecture:** A `src/dev/fixtures.json` file defines 5 dummy personas (profiles, locations, spots, signals). A `seedDevData.ts` function creates Firebase Auth users via the emulator admin REST API (with fixed UIDs like "alice", "bob") and writes all Firestore data in a single batch. A `devAccounts.ts` module provides account switching via `signOut` + `signInWithEmailAndPassword`. The Settings Developer section gets a "Seed Test Data" button and a 6-account switcher. `ensureDevUser()` in `_layout.tsx` is updated from anonymous auth to email+password with fixed UID "dev-user" for consistent switching.

**Tech Stack:** Firebase Auth Emulator REST API, Firestore `writeBatch`, `geofire-common` for geohash encoding, Expo Router, NativeWind/GlassCard UI.

**Design doc:** `docs/plans/2026-03-03-dev-accounts-design.md`

---

### Task 1: Create fixture data file

**Files:**
- Create: `src/dev/fixtures.json`

**Step 1: Create the `src/dev/` directory and `fixtures.json`**

This JSON defines 5 dummy personas. Note: dev-user is NOT here (created by `_layout.tsx`). The `signal` field omits `expiresAt` and `location` — those are computed at seed time.

```json
{
  "personas": {
    "alice": {
      "auth": { "email": "alice@test.dev", "password": "test123456" },
      "profile": {
        "displayName": "Alice Svensson",
        "handle": "alice",
        "bio": "☕ Coffee enthusiast in Malmö",
        "avatarUrl": null,
        "phoneNumber": "+46701111111",
        "settings": {
          "globalLocationSharing": true,
          "allowFriendRequests": true,
          "showOnlineStatus": true
        },
        "signal": { "emoji": "☕", "text": "Getting coffee, come join!" }
      },
      "location": { "lat": 55.5953, "lng": 13.0115 },
      "spots": [
        { "id": "home", "name": "Home", "emoji": "🏠", "lat": 55.5953, "lng": 13.0115, "radius": 100, "isActive": true }
      ]
    },
    "bob": {
      "auth": { "email": "bob@test.dev", "password": "test123456" },
      "profile": {
        "displayName": "Bob Nilsson",
        "handle": "bob",
        "bio": "🎮 Gamer from Rörsjöstaden",
        "avatarUrl": null,
        "phoneNumber": "+46702222222",
        "settings": {
          "globalLocationSharing": true,
          "allowFriendRequests": true,
          "showOnlineStatus": true
        },
        "signal": null
      },
      "location": { "lat": 55.5954, "lng": 13.0116 },
      "spots": [
        { "id": "home", "name": "Home", "emoji": "🏠", "lat": 55.5954, "lng": 13.0116, "radius": 100, "isActive": true }
      ]
    },
    "charlie": {
      "auth": { "email": "charlie@test.dev", "password": "test123456" },
      "profile": {
        "displayName": "Charlie Öberg",
        "handle": "charlie",
        "bio": "🛹 Skater at Möllevången",
        "avatarUrl": null,
        "phoneNumber": "+46703333333",
        "settings": {
          "globalLocationSharing": true,
          "allowFriendRequests": true,
          "showOnlineStatus": true
        },
        "signal": null
      },
      "location": { "lat": 55.5890, "lng": 13.0010 },
      "spots": [
        { "id": "hangout", "name": "Hangout", "emoji": "🛹", "lat": 55.5890, "lng": 13.0010, "radius": 150, "isActive": true }
      ]
    },
    "dana": {
      "auth": { "email": "dana@test.dev", "password": "test123456" },
      "profile": {
        "displayName": "Dana Lindqvist",
        "handle": "dana",
        "bio": "📚 Studying at Malmö Uni",
        "avatarUrl": null,
        "phoneNumber": "+46704444444",
        "settings": {
          "globalLocationSharing": false,
          "allowFriendRequests": true,
          "showOnlineStatus": false
        },
        "signal": null
      },
      "location": { "lat": 55.6130, "lng": 12.9880 },
      "spots": []
    },
    "eve": {
      "auth": { "email": "eve@test.dev", "password": "test123456" },
      "profile": {
        "displayName": "Eve Bergström",
        "handle": "eve",
        "bio": "🎨 Artist at Turning Torso",
        "avatarUrl": null,
        "phoneNumber": "+46705555555",
        "settings": {
          "globalLocationSharing": false,
          "allowFriendRequests": false,
          "showOnlineStatus": false
        },
        "signal": null
      },
      "location": { "lat": 55.6135, "lng": 12.9750 },
      "spots": []
    }
  },
  "friendships": [
    ["dev-user", "alice"],
    ["dev-user", "bob"],
    ["dev-user", "charlie"],
    ["dev-user", "dana"],
    ["dev-user", "eve"]
  ]
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (JSON files don't affect types)

**Step 3: Commit**

```bash
git add src/dev/fixtures.json
git commit -m "feat(dev): add test persona fixture data

5 dummy accounts with Malmö locations for testing social features.
Alice+Bob at Rörsjögatan (cluster), Charlie at Möllevången (solo),
Dana+Eve hidden (ghost mode)."
```

---

### Task 2: Create seed function

**Files:**
- Create: `src/dev/seedDevData.ts`

**Dependencies to know about:**
- `getEmulatorHost()` from `@/config/firebase` — returns LAN IP for emulator REST calls
- `encodeGeohash(lat, lng)` from `@/lib/geohash` — generates geohash strings
- `GeoPoint`, `Timestamp`, `serverTimestamp`, `writeBatch`, `doc`, `setDoc`, `collection` from `firebase/firestore`
- `db` from `@/config/firebase`
- Emulator admin REST API: `POST http://{host}:9099/identitytoolkit.googleapis.com/v1/projects/demo-us-app/accounts` with `Authorization: Bearer owner`

**Step 1: Write `seedDevData.ts`**

```typescript
import {
  doc,
  setDoc,
  writeBatch,
  collection,
  serverTimestamp,
  GeoPoint,
  Timestamp,
} from 'firebase/firestore';
import { db, getEmulatorHost } from '@/config/firebase';
import { encodeGeohash } from '@/lib/geohash';
import fixtures from './fixtures.json';

const EMULATOR_PROJECT_ID = 'demo-us-app';
const DEV_USER_ID = 'dev-user';

/**
 * Create a Firebase Auth user with a specific UID via the emulator admin REST API.
 * Idempotent — silently continues if the user already exists.
 */
async function createAuthUser(
  uid: string,
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  const host = getEmulatorHost();
  const url = `http://${host}:9099/identitytoolkit.googleapis.com/v1/projects/${EMULATOR_PROJECT_ID}/accounts`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer owner',
    },
    body: JSON.stringify({
      localId: uid,
      email,
      rawPassword: password,
      displayName,
      emailVerified: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    // DUPLICATE_LOCAL_ID or EMAIL_EXISTS means already seeded — safe to continue
    if (!body.includes('DUPLICATE') && !body.includes('EXISTS')) {
      throw new Error(`Failed to create auth user ${uid}: ${body}`);
    }
  }
}

/**
 * Seed all test data into Firestore emulator.
 * Idempotent — safe to call multiple times (uses setDoc which overwrites).
 */
export default async function seedDevData(): Promise<void> {
  // 1. Create auth users for all 5 dummies
  const personaEntries = Object.entries(fixtures.personas);

  await Promise.all(
    personaEntries.map(([id, persona]) =>
      createAuthUser(
        id,
        persona.auth.email,
        persona.auth.password,
        persona.profile.displayName
      )
    )
  );

  // 2. Write all Firestore data in a single batch
  const batch = writeBatch(db);

  for (const [id, persona] of personaEntries) {
    const { profile, location, spots } = persona;

    // Profile doc: users/{id}
    const profileData: Record<string, unknown> = {
      displayName: profile.displayName,
      handle: profile.handle,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      phoneNumber: profile.phoneNumber,
      settings: profile.settings,
      currentSignal: null,
      createdAt: new Date().toISOString(),
    };

    // Alice has an active signal
    if (profile.signal && location) {
      profileData.currentSignal = {
        emoji: profile.signal.emoji,
        text: profile.signal.text,
        expiresAt: Timestamp.fromDate(
          new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
        ),
        location: new GeoPoint(location.lat, location.lng),
      };
    }

    batch.set(doc(db, 'users', id), profileData);

    // Handle reservation: handles/{handle}
    batch.set(doc(db, 'handles', profile.handle), { userId: id });

    // Location doc: locations/{id} — only if sharing
    if (profile.settings.globalLocationSharing && location) {
      batch.set(doc(db, 'locations', id), {
        geohash: encodeGeohash(location.lat, location.lng),
        geopoint: new GeoPoint(location.lat, location.lng),
        lat: location.lat,
        lng: location.lng,
        updatedAt: serverTimestamp(),
        precision: 'EXACT' as const,
      });
    }

    // Spots: users/{id}/spots/{spotId}
    for (const spot of spots) {
      batch.set(doc(db, 'users', id, 'spots', spot.id), {
        name: spot.name,
        emoji: spot.emoji,
        location: new GeoPoint(spot.lat, spot.lng),
        radius: spot.radius,
        isActive: spot.isActive,
      });
    }
  }

  // 3. Bilateral friendships: dev-user <-> each dummy
  for (const [userA, userB] of fixtures.friendships) {
    batch.set(doc(db, 'users', userA, 'friends', userB), {
      status: 'ACTIVE',
      since: serverTimestamp(),
      nickname: null,
    });
    batch.set(doc(db, 'users', userB, 'friends', userA), {
      status: 'ACTIVE',
      since: serverTimestamp(),
      nickname: null,
    });
  }

  await batch.commit();
  console.log(`🌱 Seeded ${personaEntries.length} test accounts + friendships`);
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/dev/seedDevData.ts
git commit -m "feat(dev): add seed function for test data

Creates 5 auth users via emulator REST API with fixed UIDs, then
writes profiles, handles, locations, spots, signals, and bilateral
friendships in a single Firestore batch."
```

---

### Task 3: Create account switching module

**Files:**
- Create: `src/dev/devAccounts.ts`

**Step 1: Write `devAccounts.ts`**

```typescript
import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import fixtures from './fixtures.json';

export interface DevAccount {
  id: string;
  displayName: string;
  handle: string;
  email: string;
  password: string;
}

const DEV_USER_ACCOUNT: DevAccount = {
  id: 'dev-user',
  displayName: 'Dev User',
  handle: 'dev',
  email: 'dev@test.dev',
  password: 'test123456',
};

/** All 6 dev accounts (dev-user + 5 dummies). */
export const DEV_ACCOUNTS: DevAccount[] = [
  DEV_USER_ACCOUNT,
  ...Object.entries(fixtures.personas).map(([id, persona]) => ({
    id,
    displayName: persona.profile.displayName,
    handle: persona.profile.handle,
    email: persona.auth.email,
    password: persona.auth.password,
  })),
];

/** Get the persona ID of the currently signed-in account, or null. */
export function getCurrentAccountId(): string | null {
  const email = auth.currentUser?.email;
  if (!email) return null;
  return DEV_ACCOUNTS.find((a) => a.email === email)?.id ?? null;
}

/** Sign out current user and sign in as the specified account. */
export async function switchAccount(account: DevAccount): Promise<void> {
  await signOut(auth);
  await signInWithEmailAndPassword(auth, account.email, account.password);
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/dev/devAccounts.ts
git commit -m "feat(dev): add account switching module

DEV_ACCOUNTS list, getCurrentAccountId(), and switchAccount()
for toggling between test personas in dev mode."
```

---

### Task 4: Update `ensureDevUser()` to use email+password auth

**Files:**
- Modify: `app/_layout.tsx`

**Why this change:** The existing `signInAnonymously()` creates a random UID that can't be switched back to. Using email+password with a fixed UID ("dev-user") via the emulator admin REST API enables consistent account switching.

**Step 1: Update `_layout.tsx`**

Replace the entire file with:

```typescript
import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, getEmulatorHost } from '@/config/firebase';
import '../global.css';

const DEV_EMAIL = 'dev@test.dev';
const DEV_PASSWORD = 'test123456';
const DEV_UID = 'dev-user';
const EMULATOR_PROJECT_ID = 'demo-us-app';

/**
 * Dev auto-sign-in: creates a Firebase user with UID "dev-user" via
 * the emulator admin REST API, then signs in with email+password.
 * Creates a test profile in Firestore if missing.
 */
async function ensureDevUser() {
  if (auth.currentUser) return;

  const host = getEmulatorHost();

  // Create auth user with fixed UID via emulator admin API (idempotent)
  try {
    await fetch(
      `http://${host}:9099/identitytoolkit.googleapis.com/v1/projects/${EMULATOR_PROJECT_ID}/accounts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer owner',
        },
        body: JSON.stringify({
          localId: DEV_UID,
          email: DEV_EMAIL,
          rawPassword: DEV_PASSWORD,
          displayName: 'Dev User',
          emailVerified: true,
        }),
      }
    );
  } catch {
    // User may already exist or emulator not ready — continue to sign-in
  }

  // Sign in with email+password
  await signInWithEmailAndPassword(auth, DEV_EMAIL, DEV_PASSWORD);

  const uid = auth.currentUser!.uid;

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
      const timeout = new Promise<void>((resolve) =>
        setTimeout(() => {
          console.warn('⏱️ Dev auto-sign-in timed out — emulators might not be running');
          resolve();
        }, 5000)
      );

      Promise.race([ensureDevUser(), timeout])
        .then(() => setReady(true))
        .catch((err) => {
          console.warn('Dev auto-sign-in failed:', err);
          setReady(true);
        });
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
      <Slot />
    </>
  );
}
```

Key changes from original:
- `signInAnonymously` → `signInWithEmailAndPassword` (with fixed UID via REST admin API)
- Import `getEmulatorHost` from `@/config/firebase`
- Added `phoneNumber` and `showOnlineStatus` to profile (matches `UserProfile` type)
- Removed unused `onAuthStateChanged` import, added `signInWithEmailAndPassword`

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(dev): update ensureDevUser to email+password auth

Use emulator admin REST API to create dev-user with fixed UID,
then sign in with email+password. Enables consistent account
switching back to dev-user."
```

---

### Task 5: Update Settings screen with seed button + account switcher

**Files:**
- Modify: `app/(tabs)/settings.tsx`

**Step 1: Update `settings.tsx`**

Replace the entire file with:

```typescript
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { onUserProfile, deleteLocation } from '@/lib/firestore';
import { COLORS } from '@/config/constants';
import type { UserProfile } from '@/types';
import GlassCard from '@/components/ui/GlassCard';
import {
  DEV_ACCOUNTS,
  getCurrentAccountId,
  switchAccount,
  type DevAccount,
} from '@/dev/devAccounts';
import seedDevData from '@/dev/seedDevData';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | undefined>(auth.currentUser?.uid);
  const [seeding, setSeeding] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(
    getCurrentAccountId()
  );
  const router = useRouter();

  // Track auth state changes (needed for account switching)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? undefined);
      setCurrentAccountId(getCurrentAccountId());
    });
    return unsub;
  }, []);

  // Profile listener
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const unsubscribe = onUserProfile(userId, setProfile);
    return unsubscribe;
  }, [userId]);

  const toggleLocationSharing = async (value: boolean) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId), {
      'settings.globalLocationSharing': value,
    });
    if (!value) {
      await deleteLocation(userId);
    }
  };

  const toggleFriendRequests = async (value: boolean) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId), {
      'settings.allowFriendRequests': value,
    });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (userId) await deleteLocation(userId);
          await signOut(auth);
        },
      },
    ]);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDevData();
      Alert.alert('Done', 'Test data seeded successfully.');
    } catch (err: any) {
      console.error('Seed failed:', err);
      Alert.alert(
        'Seed Failed',
        err.message?.includes('Network request failed')
          ? 'Firestore emulator not reachable. Is it running?'
          : err.message ?? 'Unknown error'
      );
    } finally {
      setSeeding(false);
    }
  };

  const handleSwitchAccount = async (account: DevAccount) => {
    if (account.id === currentAccountId) return;
    setSwitching(true);
    try {
      await switchAccount(account);
    } catch (err: any) {
      console.error('Switch failed:', err);
      Alert.alert(
        'Switch Failed',
        'Could not switch account. Have you seeded test data first?'
      );
    } finally {
      setSwitching(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-void pt-16 px-4">
      <Text className="text-fog text-2xl font-bold mb-6 px-2">Settings</Text>

      {/* Profile Card */}
      {profile ? (
        <>
          <GlassCard className="mb-6 items-center py-6">
            <View className="w-20 h-20 rounded-full bg-signal/20 items-center justify-center mb-3">
              <Text className="text-4xl">👤</Text>
            </View>
            <Text className="text-fog text-lg font-bold">{profile.displayName}</Text>
            <Text className="text-fog/50 text-sm">@{profile.handle}</Text>
            {profile.bio ? (
              <Text className="text-fog/40 text-xs mt-2">{profile.bio}</Text>
            ) : null}
          </GlassCard>

          {/* Privacy */}
          <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-2">
            Privacy
          </Text>

          <GlassCard className="mb-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-fog font-semibold">Location Sharing</Text>
              <Text className="text-fog/40 text-xs mt-1">
                {profile.settings.globalLocationSharing
                  ? 'Friends can see you on the map'
                  : 'Ghost mode — you are invisible'}
              </Text>
            </View>
            <Switch
              value={profile.settings.globalLocationSharing}
              onValueChange={toggleLocationSharing}
              trackColor={{ false: '#333', true: COLORS.signal }}
              thumbColor={COLORS.fog}
            />
          </GlassCard>

          <GlassCard className="mb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-fog font-semibold">Allow Friend Requests</Text>
              <Text className="text-fog/40 text-xs mt-1">
                Let others send you friend requests
              </Text>
            </View>
            <Switch
              value={profile.settings.allowFriendRequests}
              onValueChange={toggleFriendRequests}
              trackColor={{ false: '#333', true: COLORS.signal }}
              thumbColor={COLORS.fog}
            />
          </GlassCard>

          {/* Account */}
          <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-2">
            Account
          </Text>

          <TouchableOpacity onPress={handleSignOut}>
            <GlassCard className="mb-6 flex-row items-center justify-center">
              <Text className="text-red-400 font-semibold">Sign Out</Text>
            </GlassCard>
          </TouchableOpacity>
        </>
      ) : (
        <GlassCard className="mb-6 items-center py-6">
          <Text className="text-fog/50 text-sm">Not signed in</Text>
        </GlassCard>
      )}

      {/* Developer Section — only in dev mode */}
      {__DEV__ && (
        <>
          <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-2">
            Developer
          </Text>

          {/* Seed Test Data */}
          <TouchableOpacity onPress={handleSeed} disabled={seeding}>
            <GlassCard className="mb-2 flex-row items-center justify-center">
              <Text className={`font-semibold ${seeding ? 'text-mint/50' : 'text-mint'}`}>
                {seeding ? 'Seeding...' : 'Seed Test Data'}
              </Text>
            </GlassCard>
          </TouchableOpacity>

          {/* Account Switcher */}
          <Text className="text-fog/40 text-xs mb-2 px-2 mt-4">
            Switch Account {switching ? '(switching...)' : ''}
          </Text>

          {DEV_ACCOUNTS.map((account) => {
            const isActive = currentAccountId === account.id;
            return (
              <TouchableOpacity
                key={account.id}
                onPress={() => handleSwitchAccount(account)}
                disabled={switching || isActive}
              >
                <GlassCard
                  className={`mb-2 flex-row items-center justify-between ${
                    isActive ? 'border-signal' : ''
                  }`}
                >
                  <View>
                    <Text className="text-fog font-semibold">
                      {account.displayName}
                    </Text>
                    <Text className="text-fog/40 text-xs">@{account.handle}</Text>
                  </View>
                  {isActive && (
                    <Text className="text-signal text-xs font-semibold">Active</Text>
                  )}
                </GlassCard>
              </TouchableOpacity>
            );
          })}

          {/* Test Onboarding */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/phone')}
            className="mt-2"
          >
            <GlassCard className="flex-row items-center justify-center">
              <Text className="text-signal font-semibold">Test Onboarding</Text>
            </GlassCard>
          </TouchableOpacity>

          {/* Bottom padding for scroll */}
          <View className="h-8" />
        </>
      )}
    </ScrollView>
  );
}
```

Key changes from original:
- Added `ScrollView` wrapper (content is now longer than screen)
- Added `onAuthStateChanged` listener for reactive `userId` updates after switching
- Added `handleSeed` function with error handling + Alert
- Added `handleSwitchAccount` function
- Added "Seed Test Data" button (mint colored)
- Added account switcher list showing all 6 accounts with active indicator
- Wrapped Developer section in `__DEV__` guard
- Imports: added `ScrollView`, `onAuthStateChanged`, dev module imports

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/(tabs)/settings.tsx
git commit -m "feat(dev): add seed button and account switcher to Settings

Developer section now has 'Seed Test Data' button and a 6-account
switcher with active indicator. Uses onAuthStateChanged for
reactive updates after switching."
```

---

### Task 6: Type check + manual verification

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: PASS with no errors

If there are type errors, fix them before proceeding.

**Step 2: Start emulators + dev server**

Terminal 1: `firebase emulators:start --project demo-us-app`
Terminal 2: `npx expo start --clear`

**Step 3: Manual verification checklist**

Open app on phone via Expo Go. Verify:

1. App starts and auto-signs in as "Dev User" (check profile card in Settings)
2. Go to Settings → Developer section → tap "Seed Test Data"
3. See "Done — Test data seeded successfully" alert
4. Open Firestore emulator UI (http://localhost:4000/firestore) and verify:
   - 6 user profiles exist (dev-user, alice, bob, charlie, dana, eve)
   - 3 location docs exist (alice, bob, charlie)
   - Friendships exist under each user
   - Alice has `currentSignal` set
5. In Settings, tap "Alice Svensson" → account switches, profile card shows Alice
6. Tap "Dev User" → switches back, profile card shows Dev User
7. Tap "Seed Test Data" again → succeeds (idempotent)

**Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix(dev): address type/runtime issues from verification"
```

---

## Known Limitations

- **Account switching doesn't survive app restart.** Firebase Auth persistence is in-memory only (no AsyncStorage configured). On restart, app always signs in as dev-user.
- **Dummy locations are static.** When switched to a dummy account, the phone's GPS location tracker will overwrite the fixture location. This is acceptable — switching is for testing interactions, not map positions.
- **Emulator data is ephemeral.** Re-seed after each emulator restart.
- **UIDs may not be human-readable strings.** If the emulator admin REST API doesn't support `localId`, the implementation should fall back to using `createUserWithEmailAndPassword` (auto-generated UIDs) with email-based lookup. See fallback note in Task 2.
