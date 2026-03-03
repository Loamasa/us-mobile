import {
  doc,
  writeBatch,
  GeoPoint,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db, getEmulatorHost } from '@/config/firebase';
import { encodeGeohash } from '@/lib/geohash';
import fixtures from './fixtures.json';

const EMULATOR_PROJECT_ID = 'us-v1-ff6b3';
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
  const baseUrl = `http://${host}:9099/identitytoolkit.googleapis.com/v1`;
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer owner',
  };

  // Step 1: Create user with fixed UID via admin API
  const createRes = await fetch(
    `${baseUrl}/projects/${EMULATOR_PROJECT_ID}/accounts`,
    {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        localId: uid,
        email,
        displayName,
        emailVerified: true,
      }),
    }
  );

  if (!createRes.ok) {
    const body = await createRes.text();
    // DUPLICATE_LOCAL_ID or EMAIL_EXISTS means already seeded — safe to continue
    if (!body.includes('DUPLICATE') && !body.includes('EXISTS')) {
      throw new Error(`Failed to create auth user ${uid}: ${body}`);
    }
  }

  // Step 2: Set password via accounts:update (rawPassword doesn't work reliably)
  const updateRes = await fetch(`${baseUrl}/accounts:update`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      localId: uid,
      password,
    }),
  });

  if (!updateRes.ok) {
    console.warn(`Password update failed for ${uid}:`, await updateRes.text());
  }
}

/**
 * Seed all test data into Firestore emulator.
 * Idempotent — safe to call multiple times (uses setDoc via batch.set which overwrites).
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

    // Location doc: locations/{id} — only if sharing location
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
