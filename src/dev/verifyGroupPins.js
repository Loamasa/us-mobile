/**
 * Device-free verification for named "always-on" group pins (Task 1).
 *
 * Mirrors src/features/map/groupPins.ts (buildGroupPins) the same way
 * verifyProjection.js mirrors useMapProjection. Reads LIVE emulator data through
 * the app's read path, then asserts BOTH branches of the proximity-wins rule:
 *
 *   Case A — members clustered (as seeded): chat_mollevangen decorates the live
 *            alice+bob proximity cluster (at their REAL centroid ~55.598); NO
 *            synthetic fixed pin.
 *   Case B — members apart (bob removed in-memory to simulate ghost/away): no
 *            proximity match, so a synthetic CLUSTER `group-chat_mollevangen` is
 *            pinned at fixedLocation (55.5917, 13.0070) with roster alice+bob.
 *
 * Run AFTER `node src/dev/runSeed.js` against a running emulator:
 *   npm run build:checks
 *   node src/dev/verifyGroupPins.js
 */
const EMULATOR_PROJECT_ID = 'us-v1-ff6b3';
const FIRESTORE_EMULATOR_PORT = 8088;
const BASE = `http://127.0.0.1:${FIRESTORE_EMULATOR_PORT}/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents`;
const HEADERS = { Authorization: 'Bearer owner' };
const VIEWER = 'dev-user';

// ── Firestore REST Value → plain JS (inverse of seed's toFirestoreValue) ──
function fromValue(v) {
  if (v == null) return undefined;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return { toDate: () => new Date(v.timestampValue) };
  if ('geoPointValue' in v)
    // Mirror the firestore-js GeoPoint shape buildGroupPins reads (.latitude/.longitude).
    return { latitude: v.geoPointValue.latitude, longitude: v.geoPointValue.longitude };
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
async function queryChats(viewerId) {
  const res = await fetch(`${BASE}:runQuery`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'chats' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'memberIds' },
            op: 'ARRAY_CONTAINS',
            value: { stringValue: viewerId },
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`runQuery chats -> ${res.status}`);
  const rows = await res.json();
  return rows
    .filter((r) => r.document)
    .map((r) => ({ id: r.document.name.split('/').pop(), ...fromFields(r.document.fields) }));
}

// Execute the production functions compiled by npm run build:checks.
const { projectMapEntities: project } = require('../../.expo/test-build/features/map/mapProjection.js');
const { buildGroupPins } = require('../../.expo/test-build/features/map/groupPins.js');
const sameMembers = (a, b) => [...a].sort().join('|') === [...b].sort().join('|');

// ── helpers ──
function describe(entities) {
  return entities
    .map((e) => {
      const tag = e.groupChat ? `${e.groupChat.fixed ? 'FIXED' : 'LIVE'}:${e.groupChat.name}` : e.type;
      const who = e.friends.map((f) => f.userId).join('+');
      return `${tag}(${who})@${e.location.lat.toFixed(4)},${e.location.lng.toFixed(4)}`;
    })
    .join(', ');
}
function approx(a, b, eps = 1e-4) {
  return Math.abs(a - b) <= eps;
}

async function main() {
  const friendIds = await listIds(`users/${VIEWER}/friends`);
  const chats = await queryChats(VIEWER);
  const mollevangen = chats.find((c) => c.id === 'chat_mollevangen');
  console.log('friends:', friendIds.join(', '));
  console.log('chats  :', chats.map((c) => c.id).join(', '));

  if (!mollevangen) throw new Error('chat_mollevangen not found — run runSeed.js first');
  if (!mollevangen.fixedLocation) throw new Error('chat_mollevangen has no fixedLocation');
  const fx = mollevangen.fixedLocation;

  // Assemble friendLocations + member profiles exactly as the app does.
  // Freshen updatedAt first: since Wave 2 the app's projection excludes
  // stale docs (>5 min) from clustering, and seed timestamps freeze at seed
  // time — without the heartbeat mirror, Case A would dissolve minutes
  // after seeding. Staleness itself is regression-tested in verifyProjection.
  const friendLocations = {};
  const memberProfiles = {};
  for (const id of friendIds) {
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
    const [profile, location] = await Promise.all([
      getDoc(`users/${id}`),
      getDoc(`locations/${id}`),
    ]);
    if (profile) memberProfiles[id] = profile;
    if (profile && location) friendLocations[id] = { profile, location };
  }

  const checks = [];

  // ── Case A: as-seeded (alice+bob clustered) → proximity wins ──
  const entitiesA = buildGroupPins({
    rawEntities: project(friendLocations),
    chats,
    userId: VIEWER,
    memberProfiles,
  });
  console.log('\nCase A (as seeded) ->', describe(entitiesA));
  const liveA = entitiesA.find(
    (e) => e.groupChat && e.groupChat.id === 'chat_mollevangen'
  );
  checks.push([
    'A1 named group decorates a LIVE proximity cluster',
    !!liveA && liveA.groupChat.fixed !== true && liveA.friends.length === 2,
  ]);
  checks.push([
    'A2 live cluster sits at members’ real location (not fixedLocation)',
    !!liveA && !(approx(liveA.location.lat, fx.latitude) && approx(liveA.location.lng, fx.longitude)),
  ]);
  checks.push([
    'A3 no synthetic fixed pin while clustered',
    !entitiesA.some((e) => e.id === 'group-chat_mollevangen'),
  ]);

  // ── Case B: members apart (drop bob) → resting fixed pin ──
  const apart = { ...friendLocations };
  delete apart.bob;
  const entitiesB = buildGroupPins({
    rawEntities: project(apart),
    chats,
    userId: VIEWER,
    memberProfiles,
  });
  console.log('Case B (bob away)  ->', describe(entitiesB));
  const fixedB = entitiesB.find((e) => e.id === 'group-chat_mollevangen');
  checks.push(['B1 synthetic fixed pin exists when not clustered', !!fixedB]);
  checks.push([
    'B2 fixed pin sits at chat.fixedLocation',
    !!fixedB && approx(fixedB.location.lat, fx.latitude) && approx(fixedB.location.lng, fx.longitude),
  ]);
  checks.push([
    'B3 fixed pin carries the group name + fixed flag',
    !!fixedB && fixedB.groupChat.name === 'Möllevången Crew' && fixedB.groupChat.fixed === true,
  ]);
  checks.push([
    'B4 fixed pin roster = non-viewer members (alice, bob)',
    !!fixedB && sameMembers(fixedB.friends.map((f) => f.userId), ['alice', 'bob']),
  ]);
  checks.push([
    'B5 roster facepile resolved real display names',
    !!fixedB && fixedB.friends.every((f) => f.displayName && f.displayName !== 'Member'),
  ]);

  console.log('');
  let pass = true;
  for (const [label, ok] of checks) {
    console.log(`${ok ? '✅' : '❌'} ${label}`);
    if (!ok) pass = false;
  }
  console.log(pass ? '\n✅ PASS: named group pins (proximity-wins) verified' : '\n❌ FAIL');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
