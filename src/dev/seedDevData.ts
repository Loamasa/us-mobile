import { GeoPoint, Timestamp } from 'firebase/firestore';
import { getAuthEmulatorUrl, getFirestoreEmulatorUrl } from '@/config/firebase';
import { encodeGeohash } from '@/lib/geohash';
import { haversineDistance } from '@/utils/distance';
import fixtures from './fixtures.json';

// Firestore data lives under the SDK's projectId; auth users must live in the
// emulator's default project (started with --project demo-us-app) because
// key-based SDK requests (signInWithPassword etc.) always resolve there.
const EMULATOR_PROJECT_ID = 'us-v1-ff6b3';
const AUTH_EMULATOR_PROJECT_ID = 'demo-us-app';

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
  const baseUrl = `${getAuthEmulatorUrl()}/identitytoolkit.googleapis.com/v1`;
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer owner',
  };

  // Step 1: Create user with fixed UID via admin API
  const createRes = await fetch(
    `${baseUrl}/projects/${AUTH_EMULATOR_PROJECT_ID}/accounts`,
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

// Firestore REST "Value" encoding — https://firebase.google.com/docs/firestore/reference/rest/v1/Value
type FirestoreValue =
  | { nullValue: null }
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { geoPointValue: { latitude: number; longitude: number } }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

function toFirestoreValue(v: unknown): FirestoreValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  }
  if (v instanceof Timestamp) {
    return { timestampValue: v.toDate().toISOString() };
  }
  if (v instanceof Date) {
    return { timestampValue: v.toISOString() };
  }
  if (v instanceof GeoPoint) {
    return { geoPointValue: { latitude: v.latitude, longitude: v.longitude } };
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toFirestoreValue) } };
  }
  if (typeof v === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported value type for Firestore REST: ${typeof v}`);
}

function toFirestoreFields(obj: Record<string, unknown>) {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}

type SeedWrite = { path: string; data: Record<string, unknown> };

/**
 * Commit a batch of upserts to the Firestore emulator via the REST `:commit`
 * endpoint using the `Bearer owner` admin token, which bypasses security rules.
 */
async function commitWritesAsOwner(writes: SeedWrite[]): Promise<void> {
  const url = `${getFirestoreEmulatorUrl()}/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents:commit`;

  const body = {
    writes: writes.map(({ path, data }) => ({
      update: {
        name: `projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents/${path}`,
        fields: toFirestoreFields(data),
      },
    })),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer owner',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore commit failed (${res.status}): ${errText}`);
  }
}

/**
 * Seed all test data into Firestore emulator.
 * Idempotent — safe to call multiple times (upserts via REST commit).
 *
 * Writes bypass security rules by using the emulator's admin `Bearer owner`
 * token, so seeding works regardless of which account is currently signed in.
 */
export default async function seedDevData(): Promise<void> {
  const personaEntries = Object.entries(fixtures.personas);

  // 1. Create auth users for all 5 dummies
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

  // 2. Assemble Firestore writes
  const writes: SeedWrite[] = [];
  const now = new Date();

  for (const [id, persona] of personaEntries) {
    const { profile, location, spots } = persona;

    const profileData: Record<string, unknown> = {
      displayName: profile.displayName,
      handle: profile.handle,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      phoneNumber: profile.phoneNumber,
      settings: profile.settings,
      currentSignal: null,
      createdAt: now.toISOString(),
    };

    // Alice has an active signal
    if (profile.signal && location) {
      profileData.currentSignal = {
        emoji: profile.signal.emoji,
        text: profile.signal.text,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        location: new GeoPoint(location.lat, location.lng),
      };
    }

    writes.push({ path: `users/${id}`, data: profileData });
    writes.push({ path: `handles/${profile.handle}`, data: { userId: id } });

    if (profile.settings.globalLocationSharing && location) {
      // Match real tracking: only publish a location doc if the persona is
      // inside one of their own active spots. Embed that spot so friends can
      // render its zone on the map.
      const containingSpot = spots.find(
        (s) =>
          s.isActive &&
          haversineDistance(location.lat, location.lng, s.lat, s.lng) <= s.radius
      );

      if (containingSpot) {
        writes.push({
          path: `locations/${id}`,
          data: {
            geohash: encodeGeohash(location.lat, location.lng),
            geopoint: new GeoPoint(location.lat, location.lng),
            lat: location.lat,
            lng: location.lng,
            updatedAt: now,
            precision: 'EXACT',
            spot: {
              id: containingSpot.id,
              name: containingSpot.name,
              emoji: containingSpot.emoji,
              center: new GeoPoint(containingSpot.lat, containingSpot.lng),
              radius: containingSpot.radius,
            },
          },
        });
      }
    }

    for (const spot of spots) {
      writes.push({
        path: `users/${id}/spots/${spot.id}`,
        data: {
          name: spot.name,
          emoji: spot.emoji,
          location: new GeoPoint(spot.lat, spot.lng),
          radius: spot.radius,
          isActive: spot.isActive,
        },
      });
    }
  }

  // 3. Bilateral friendships: dev-user <-> each dummy
  for (const [userA, userB] of fixtures.friendships) {
    writes.push({
      path: `users/${userA}/friends/${userB}`,
      data: { status: 'ACTIVE', since: now, nickname: null },
    });
    writes.push({
      path: `users/${userB}/friends/${userA}`,
      data: { status: 'ACTIVE', since: now, nickname: null },
    });
  }

  // 4. Seeded chats (named group crews). Fixtures are optional — skip if absent.
  const chats = (fixtures as { chats?: Array<Record<string, unknown>> }).chats ?? [];
  for (const chat of chats) {
    const data: Record<string, unknown> = {
      name: chat.name ?? null,
      avatarUrl: chat.avatarUrl ?? null,
      type: chat.type,
      memberIds: chat.memberIds,
      createdBy: chat.createdBy,
      createdAt: now,
      lastMessage: chat.lastMessage ?? null,
      // Stagger by chat position so seeded chats land in a stable order in
      // the list. Timestamp is a few seconds ago rather than exactly now.
      lastMessageAt: chat.lastMessage ? now : null,
    };
    if (chat.mapVisibility) data.mapVisibility = chat.mapVisibility;
    const fixed = chat.fixedLocation as { lat: number; lng: number } | undefined;
    if (fixed) data.fixedLocation = new GeoPoint(fixed.lat, fixed.lng);
    writes.push({ path: `chats/${chat.id}`, data });
  }

  // 5. Commit as owner (bypasses security rules)
  await commitWritesAsOwner(writes);
  console.log(
    `🌱 Seeded ${personaEntries.length} test accounts + friendships + ${chats.length} chats`
  );
}
