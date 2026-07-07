/**
 * End-to-end Bug #3 diagnostic (device-free).
 *
 * Reads the LIVE emulator data the way the app does:
 *   1. users/dev-user/friends/*           (onFriends)
 *   2. users/{id}                         (onUserProfile)
 *   3. locations/{id}                     (onLocation)
 * then assembles the friendLocations map exactly as useFriendLocations.commit
 * does (a friend appears only when BOTH profile AND location exist) and runs
 * the same clustering projection as src/features/map/useMapProjection.ts.
 *
 * Run AFTER `node src/dev/runSeed.js` against a running emulator:
 *   node src/dev/verifyProjection.js
 *
 * Expected output: CLUSTER(alice+bob) + FRIEND(charlie); dana/eve absent.
 */
const EMULATOR_PROJECT_ID = 'us-v1-ff6b3';
const FIRESTORE_EMULATOR_PORT = 8088;
const BASE = `http://127.0.0.1:${FIRESTORE_EMULATOR_PORT}/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents`;
const HEADERS = { Authorization: 'Bearer owner' };

// ── Firestore REST Value → plain JS (inverse of seed's toFirestoreValue) ──
function fromValue(v) {
  if (v == null) return undefined;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('geoPointValue' in v)
    return { lat: v.geoPointValue.latitude, lng: v.geoPointValue.longitude };
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return undefined;
}
function fromFields(fields) {
  const out = {};
  for (const [k, val] of Object.entries(fields)) out[k] = fromValue(val);
  return out;
}

async function getDoc(path) {
  const res = await fetch(`${BASE}/${path}`, { headers: HEADERS });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  const j = await res.json();
  return j.fields ? fromFields(j.fields) : null;
}
async function listIds(path) {
  const res = await fetch(`${BASE}/${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`LIST ${path} -> ${res.status}`);
  const j = await res.json();
  return (j.documents || []).map((d) => d.name.split('/').pop());
}

// ── projection (mirrors src/features/map/useMapProjection.ts) ──
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const CLUSTER_RADIUS_M = 100;

// Mirrors isLocationFresh (src/features/presence/presence.ts): a doc is live
// only while the publisher keeps rewriting it; no updatedAt counts as fresh.
const LOCATION_STALE_MS = 5 * 60 * 1000;
function isFresh(location, now = Date.now()) {
  const t = location.updatedAt instanceof Date ? location.updatedAt.getTime() : null;
  return t == null || now - t <= LOCATION_STALE_MS;
}

function project(friendLocations, now = Date.now()) {
  const entities = [];
  const processed = new Set();
  // Sorted ids (deterministic anchors) + fresh-only clustering, stale
  // friends as flagged individuals — mirrors useMapProjection since Wave 2.
  const entries = Object.entries(friendLocations).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  const fresh = entries.filter(([, d]) => isFresh(d.location, now));
  const stale = entries.filter(([, d]) => !isFresh(d.location, now));
  for (let i = 0; i < fresh.length; i++) {
    const [idA, dataA] = fresh[i];
    if (processed.has(idA)) continue;
    const members = [idA];
    for (let j = i + 1; j < fresh.length; j++) {
      const [idB, dataB] = fresh[j];
      if (processed.has(idB)) continue;
      const dist = haversineDistance(
        dataA.location.lat,
        dataA.location.lng,
        dataB.location.lat,
        dataB.location.lng
      );
      if (dist <= CLUSTER_RADIUS_M) members.push(idB);
    }
    if (members.length >= 2) {
      entities.push({ type: 'CLUSTER', members: [...members].sort() });
      members.forEach((id) => processed.add(id));
    }
  }
  for (const [id, d] of [...fresh, ...stale]) {
    if (!processed.has(id))
      entities.push({
        type: 'FRIEND',
        members: [id],
        stale: !isFresh(d.location, now),
      });
  }
  return entities;
}

// Freshen a location doc's updatedAt to now (admin bypass) — the seed's
// timestamps freeze at seed time, so minutes later every persona would read
// as stale (correct app behavior, wrong harness baseline). Mirrors the live
// publisher heartbeat. currentDocument.exists guards against creating docs
// for locationless personas.
async function freshenLocation(id) {
  await fetch(
    `${BASE}/locations/${id}?updateMask.fieldPaths=updatedAt&currentDocument.exists=true`,
    {
      method: 'PATCH',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { updatedAt: { timestampValue: new Date().toISOString() } },
      }),
    }
  );
}

async function main() {
  const friendIds = await listIds('users/dev-user/friends');
  console.log('friends:', friendIds.join(', '));

  const friendLocations = {};
  for (const id of friendIds) {
    await freshenLocation(id);
    const [profile, location] = await Promise.all([
      getDoc(`users/${id}`),
      getDoc(`locations/${id}`),
    ]);
    const hasProfile = !!profile;
    const hasLocation = !!location;
    console.log(
      `commit(${id}) hasProfile=${hasProfile} hasLocation=${hasLocation}` +
        (hasLocation ? ` @(${location.lat},${location.lng})` : '')
    );
    // mirror useFriendLocations.commit: include only when BOTH exist
    if (hasProfile && hasLocation) friendLocations[id] = { profile, location };
  }

  const fmt = (entities) =>
    entities
      .map((e) =>
        e.type === 'CLUSTER'
          ? `CLUSTER(${e.members.join('+')})`
          : `FRIEND(${e.members[0]}${e.stale ? ',stale' : ''})`
      )
      .join(', ');

  const entities = project(friendLocations);
  console.log('\nprojection ->', fmt(entities));

  const cluster = entities.find((e) => e.type === 'CLUSTER');
  const ok =
    cluster &&
    cluster.members.join('+') === 'alice+bob' &&
    entities.some((e) => e.type === 'FRIEND' && e.members[0] === 'charlie');
  console.log(ok ? '\n✅ PASS: alice+bob cluster + charlie individual' : '\n❌ FAIL');

  // ── Staleness scenario: freeze bob's doc >5 min back → the cluster must
  // dissolve (stale docs never cluster) and bob renders as a stale
  // individual. Pure in-memory variation — no emulator writes to restore.
  const frozen = {
    ...friendLocations,
    bob: {
      ...friendLocations.bob,
      location: {
        ...friendLocations.bob.location,
        updatedAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    },
  };
  const staleEntities = project(frozen);
  console.log('stale-bob projection ->', fmt(staleEntities));
  const staleOk =
    !staleEntities.some((e) => e.type === 'CLUSTER') &&
    staleEntities.some((e) => e.members[0] === 'bob' && e.stale === true) &&
    staleEntities.some((e) => e.members[0] === 'alice' && !e.stale);
  console.log(
    staleOk
      ? '✅ PASS: frozen bob excluded from clustering, flagged stale'
      : '❌ FAIL: staleness handling'
  );

  process.exit(ok && staleOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
