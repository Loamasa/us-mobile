/**
 * Device-free security-rules check. Run AFTER `node src/dev/runSeed.js` with
 * the emulators up (`firebase emulators:start --project demo-us-app`).
 *
 *   node src/dev/verifyRules.js
 *
 * Signs in as real emulator users (password REST sign-in) and exercises the
 * rules through the Firestore REST API with USER tokens (not `Bearer owner`,
 * which bypasses rules). Asserts the pre-Phase-3 review guarantees:
 *
 *   1. Friend can read your location; non-friend CANNOT (locations are not
 *      world-readable).
 *   2. Accepting a friend request works: the accepter writes their own entry
 *      into BOTH friend lists in one batch (the bug fixed 2026-06-11 — the
 *      old rules denied writing users/{them}/friends/{me}).
 *   3. You cannot inject a THIRD PARTY into someone else's friend list.
 *   4. Handles require auth to read.
 *   5. Chat summaries are member-only.
 *   6. Broadcasts are members+invitees only: outsiders can't read or update;
 *      an invitee can accept (move themselves invitedIds → memberIds).
 */

const FIRESTORE_PROJECT = 'us-v1-ff6b3';
const AUTH_URL = 'http://127.0.0.1:9099';
const FIRESTORE_URL = 'http://127.0.0.1:8088';
const DOCS = `${FIRESTORE_URL}/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`;
const ADMIN_HEADERS = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };

async function ensureDevUserAuth() {
  // dev-user is normally created by the app's ensureDevUser; create it here so
  // the script is self-contained. Idempotent.
  const base = `${AUTH_URL}/identitytoolkit.googleapis.com/v1`;
  await fetch(`${base}/projects/demo-us-app/accounts`, {
    method: 'POST',
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      localId: 'dev-user',
      email: 'dev@test.dev',
      displayName: 'Dev User',
      emailVerified: true,
    }),
  });
  await fetch(`${base}/accounts:update`, {
    method: 'POST',
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ localId: 'dev-user', password: 'test123456' }),
  });
}

async function signIn(email, password) {
  const res = await fetch(
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) throw new Error(`Sign-in failed for ${email}: ${await res.text()}`);
  const data = await res.json();
  return data.idToken;
}

async function readDoc(path, idToken) {
  const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
  const res = await fetch(`${DOCS}/${path}`, { headers });
  return res.status; // 200 allow, 403 deny, 404 allowed-but-missing
}

async function commitWrites(writes, idToken) {
  const res = await fetch(`${DOCS.replace('/documents', '')}/documents:commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ writes }),
  });
  return res.status;
}

const docName = (path) =>
  `projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${path}`;

let failures = 0;
function check(label, actual, expected) {
  const ok = expected.includes(actual);
  console.log(`${ok ? '✅' : '❌'} ${label} — HTTP ${actual} (expected ${expected.join('/')})`);
  if (!ok) failures++;
}

async function main() {
  await ensureDevUserAuth();
  const devToken = await signIn('dev@test.dev', 'test123456');
  const aliceToken = await signIn('alice@test.dev', 'test123456');

  // ── Locations: friends-only reads ──
  check('friend reads location (dev-user → locations/alice)', await readDoc('locations/alice', devToken), [200]);
  check('self reads own location (alice → locations/alice)', await readDoc('locations/alice', aliceToken), [200]);
  check('NON-friend blocked (alice → locations/bob)', await readDoc('locations/bob', aliceToken), [403]);
  check('unauthenticated blocked (locations/alice)', await readDoc('locations/alice', null), [403]);

  // ── Friend-request accept: the 3-write batch as the ACCEPTER ──
  // Seed a pending request from alice → dev-user (as owner, bypasses rules).
  await fetch(`${DOCS.replace('/documents', '')}/documents:commit`, {
    method: 'POST',
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: docName('users/dev-user/friendRequests/test_req_alice'),
            fields: {
              fromUserId: { stringValue: 'alice' },
              toUserId: { stringValue: 'dev-user' },
              status: { stringValue: 'PENDING' },
              createdAt: { timestampValue: new Date().toISOString() },
            },
          },
        },
      ],
    }),
  });

  const friendFields = {
    status: { stringValue: 'ACTIVE' },
    since: { timestampValue: new Date().toISOString() },
    nickname: { nullValue: null },
  };
  const acceptBatch = [
    {
      update: {
        name: docName('users/dev-user/friendRequests/test_req_alice'),
        fields: {
          fromUserId: { stringValue: 'alice' },
          toUserId: { stringValue: 'dev-user' },
          status: { stringValue: 'ACCEPTED' },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      },
    },
    { update: { name: docName('users/dev-user/friends/alice'), fields: friendFields } },
    { update: { name: docName('users/alice/friends/dev-user'), fields: friendFields } },
  ];
  check('accept friend request batch (as accepter dev-user)', await commitWrites(acceptBatch, devToken), [200]);

  // ── No third-party injection into someone else's friend list ──
  const injection = [
    { update: { name: docName('users/alice/friends/bob'), fields: friendFields } },
  ];
  check('third-party friend injection blocked (dev-user writes users/alice/friends/bob)', await commitWrites(injection, devToken), [403]);

  // ── Handles: auth required ──
  check('unauthenticated handle read blocked', await readDoc('handles/alice', null), [403]);
  check('authed handle read allowed', await readDoc('handles/alice', aliceToken), [200]);

  // ── Chats: member-only ──
  check('non-member chat read blocked (alice → chats/chat_study_crew)', await readDoc('chats/chat_study_crew', aliceToken), [403]);
  check('member chat read allowed (dev-user → chats/chat_study_crew)', await readDoc('chats/chat_study_crew', devToken), [200]);

  // ── Broadcasts: members + invitees only ──
  const eveToken = await signIn('eve@test.dev', 'test123456');
  const bobToken = await signIn('bob@test.dev', 'test123456');
  check('outsider broadcast read blocked (eve → broadcasts/broadcast_tonight)', await readDoc('broadcasts/broadcast_tonight', eveToken), [403]);
  check('member broadcast read allowed (dev-user → broadcast_tonight)', await readDoc('broadcasts/broadcast_tonight', devToken), [200]);
  check('invitee broadcast read allowed (bob → broadcast_tonight)', await readDoc('broadcasts/broadcast_tonight', bobToken), [200]);

  // Invitee accepts: dev-user moves THEMSELVES invitedIds → memberIds on broadcast_invite.
  const acceptInvite = [
    {
      update: {
        name: docName('broadcasts/broadcast_invite'),
        fields: {
          memberIds: {
            arrayValue: {
              values: [{ stringValue: 'charlie' }, { stringValue: 'dev-user' }],
            },
          },
          invitedIds: { arrayValue: { values: [] } },
        },
      },
      updateMask: { fieldPaths: ['memberIds', 'invitedIds'] },
    },
  ];
  check('invitee accepts broadcast invite (dev-user → broadcast_invite)', await commitWrites(acceptInvite, devToken), [200]);

  // Outsider update blocked.
  const outsiderUpdate = [
    {
      update: {
        name: docName('broadcasts/broadcast_tonight'),
        fields: {
          memberIds: {
            arrayValue: {
              values: [{ stringValue: 'alice' }, { stringValue: 'dev-user' }, { stringValue: 'eve' }],
            },
          },
        },
      },
      updateMask: { fieldPaths: ['memberIds'] },
    },
  ];
  check('outsider broadcast update blocked (eve → broadcast_tonight)', await commitWrites(outsiderUpdate, eveToken), [403]);

  console.log(failures === 0 ? '\n✅ PASS — all rules checks green' : `\n❌ FAIL — ${failures} rule check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('verifyRules crashed:', err);
  process.exit(1);
});
