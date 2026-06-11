const fs = require('fs');
const path = require('path');
const { geohashForLocation } = require('geofire-common');

// Firestore data lives under the SDK's projectId; auth users must live in the
// emulator's default project (started with --project demo-us-app) because
// key-based SDK requests (signInWithPassword etc.) always resolve there.
const EMULATOR_PROJECT_ID = 'us-v1-ff6b3';
const AUTH_EMULATOR_PROJECT_ID = 'demo-us-app';
const FIRESTORE_EMULATOR_PORT = 8088;
const AUTH_EMULATOR_PORT = 9099;

const fixturesPath = path.join(__dirname, 'fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

// Mirrors src/features/spots/spotSchedule.ts isWithinSchedule (Node has no TS imports)
function isWithinSchedule(schedule, now = new Date()) {
  if (!schedule || schedule.days.length === 0) return true;
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = toMin(schedule.start);
  const end = toMin(schedule.end);
  const day = ((now.getDay() + 6) % 7) + 1; // ISO: Mon=1 … Sun=7
  if (start === end) return schedule.days.includes(day);
  if (start < end) {
    return schedule.days.includes(day) && minutes >= start && minutes < end;
  }
  const prevDay = day === 1 ? 7 : day - 1;
  return (
    (schedule.days.includes(day) && minutes >= start) ||
    (schedule.days.includes(prevDay) && minutes < end)
  );
}

// Haversine distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function createAuthUser(uid, email, password, displayName) {
  const baseUrl = `http://localhost:${AUTH_EMULATOR_PORT}/identitytoolkit.googleapis.com/v1`;
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer owner',
  };

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
    if (!body.includes('DUPLICATE') && !body.includes('EXISTS')) {
      throw new Error(`Failed to create auth user ${uid}: ${body}`);
    }
  }

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

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  }
  if (v instanceof Date) {
    return { timestampValue: v.toISOString() };
  }
  if (typeof v === 'object') {
    if ('latitude' in v && 'longitude' in v && Object.keys(v).length === 2) {
      return { geoPointValue: { latitude: v.latitude, longitude: v.longitude } };
    }
    if ('lat' in v && 'lng' in v && Object.keys(v).length === 2) {
      return { geoPointValue: { latitude: v.lat, longitude: v.lng } };
    }
    if (Array.isArray(v)) {
      return { arrayValue: { values: v.map(toFirestoreValue) } };
    }
    const fields = {};
    for (const [k, val] of Object.entries(v)) {
      fields[k] = toFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported value type: ${typeof v}`);
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}

async function commitWritesAsOwner(writes) {
  const url = `http://localhost:${FIRESTORE_EMULATOR_PORT}/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents:commit`;

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

async function runSeed() {
  const personaEntries = Object.entries(fixtures.personas);

  console.log('1. Creating Auth Users...');
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

  console.log('2. Assembling Firestore Writes...');
  const writes = [];
  const now = new Date();

  for (const [id, persona] of personaEntries) {
    const { profile, location, spots } = persona;

    const profileData = {
      displayName: profile.displayName,
      handle: profile.handle,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      phoneNumber: profile.phoneNumber,
      settings: profile.settings,
      currentSignal: null,
      createdAt: now.toISOString(),
    };

    if (profile.signal && location) {
      profileData.currentSignal = {
        emoji: profile.signal.emoji,
        text: profile.signal.text,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        location: { lat: location.lat, lng: location.lng },
      };
    }

    writes.push({ path: `users/${id}`, data: profileData });
    writes.push({ path: `handles/${profile.handle}`, data: { userId: id } });

    if (profile.settings.globalLocationSharing && location) {
      const containingSpot = spots.find(
        (s) =>
          s.isActive &&
          isWithinSchedule(s.schedule) &&
          haversineDistance(location.lat, location.lng, s.lat, s.lng) <= s.radius
      );

      if (containingSpot) {
        console.log(`Persona ${id} is inside spot: ${containingSpot.name}`);
        writes.push({
          path: `locations/${id}`,
          data: {
            geohash: geohashForLocation([location.lat, location.lng], 6),
            geopoint: { lat: location.lat, lng: location.lng },
            lat: location.lat,
            lng: location.lng,
            updatedAt: now,
            precision: 'EXACT',
            spot: {
              id: containingSpot.id,
              name: containingSpot.name,
              emoji: containingSpot.emoji,
              center: { lat: containingSpot.lat, lng: containingSpot.lng },
              radius: containingSpot.radius,
            },
          },
        });
      } else {
        console.log(`Persona ${id} NOT inside any active spot!`);
      }
    }

    for (const spot of spots) {
      writes.push({
        path: `users/${id}/spots/${spot.id}`,
        data: {
          name: spot.name,
          emoji: spot.emoji,
          location: { lat: spot.lat, lng: spot.lng },
          radius: spot.radius,
          isActive: spot.isActive,
          ...(spot.schedule ? { schedule: spot.schedule } : {}),
        },
      });
    }
  }

  // Bilateral friendships
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

  // Chats
  const chats = fixtures.chats || [];
  for (const chat of chats) {
    // Fixture messages are listed oldest → newest; the newest one IS the
    // list preview, so lastMessage/lastMessageAt always match a real doc.
    const messages = chat.messages || [];
    const newest = messages.length ? messages[messages.length - 1] : null;
    const messageDate = (m) => new Date(now.getTime() - m.minutesAgo * 60 * 1000);

    const data = {
      name: chat.name ?? null,
      avatarUrl: chat.avatarUrl ?? null,
      type: chat.type,
      memberIds: chat.memberIds,
      createdBy: chat.createdBy,
      createdAt: now,
      lastMessage: newest ? newest.content : chat.lastMessage ?? null,
      lastMessageAt: newest ? messageDate(newest) : chat.lastMessage ? now : null,
    };
    if (chat.mapVisibility) data.mapVisibility = chat.mapVisibility;
    if (chat.fixedLocation) data.fixedLocation = { lat: chat.fixedLocation.lat, lng: chat.fixedLocation.lng };
    writes.push({ path: `chats/${chat.id}`, data });

    messages.forEach((m, i) => {
      writes.push({
        path: `chats/${chat.id}/messages/seed_${String(i + 1).padStart(2, '0')}`,
        data: {
          senderId: m.senderId,
          content: m.content,
          createdAt: messageDate(m),
        },
      });
    });
  }

  console.log(`3. Committing ${writes.length} writes...`);
  await commitWritesAsOwner(writes);
  console.log('🌱 Database seeded successfully!');
}

runSeed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
