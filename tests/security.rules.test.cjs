// Emulator-only authorization tests, run as real user tokens (never
// `Bearer owner`, which bypasses rules). Fixtures are written with the owner
// token; every assertion is made with a user token.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const authBase = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const database = 'projects/us-v1-ff6b3/databases/(default)';
const docs = `http://127.0.0.1:8088/v1/${database}/documents`;
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const prefix = `regression-${randomUUID()}`;
const paths = [];
const accounts = [];
let alice, bob, carol, dana;

function value(x) {
  if (x === null) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(value) } };
  if (typeof x === 'object') return { mapValue: { fields: fields(x) } };
  return { stringValue: x };
}
const fields = (x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, value(v)]));

async function account(name) {
  const res = await fetch(`${authBase}/accounts:signUp?key=emulator-only`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${prefix}-${name}@test.invalid`, password: randomUUID(), returnSecureToken: true }),
  });
  assert.equal(res.status, 200, 'Auth emulator must be running');
  const user = await res.json(); accounts.push(user); return user;
}
// PATCH upserts. With `mask`, only the listed fields are written (an update
// of just those keys); without it the whole document is replaced.
async function write(path, data, token = 'owner', mask) {
  paths.push(path);
  const query = mask ? `?${mask.map((f) => `updateMask.fieldPaths=${f}`).join('&')}` : '';
  const res = await fetch(`${docs}/${path}${query}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: fields(data) }),
  });
  return res.status;
}
// Atomic multi-document write — the REST shape of a client writeBatch.
async function commit(writes, token) {
  const res = await fetch(`${docs}:commit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      writes: writes.map(({ path, data, mask }) => {
        paths.push(path);
        return { update: { name: `${database}/documents/${path}`, fields: fields(data) }, ...(mask ? { updateMask: { fieldPaths: mask } } : {}) };
      }),
    }),
  });
  return res.status;
}
async function read(path, token) {
  return (await fetch(`${docs}/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })).status;
}
async function fixture(path, data) { assert.equal(await write(path, data), 200, `fixture ${path}`); return path; }
const request = (from, to, status) => ({ fromUserId: from.localId, toUserId: to.localId, status });
const chat = (name) => fixture(`chats/${prefix}-${name}`, { createdBy: alice.localId, memberIds: [alice.localId, bob.localId] });
const gathering = (name) => fixture(`broadcasts/${prefix}-${name}`, {
  createdBy: alice.localId, memberIds: [alice.localId], invitedIds: [bob.localId], visibility: 'MEMBERS', text: 'Fika', chatId: null,
});

before(async () => {
  alice = await account('alice'); bob = await account('bob'); carol = await account('carol'); dana = await account('dana');
  await fixture(`locations/${alice.localId}`, { owner: alice.localId });
  await fixture(`users/${alice.localId}`, { settings: { allowFriendRequests: true } });
  await fixture(`users/${carol.localId}`, { settings: { allowFriendRequests: false } });
});
after(async () => {
  for (const path of [...new Set(paths)].reverse()) await fetch(`${docs}/${path}`, { method: 'DELETE', headers: owner });
  for (const user of accounts) {
    const res = await fetch(`${authBase}/accounts:delete?key=emulator-only`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: user.idToken }),
    });
    assert.equal(res.status, 200, 'clean up test account');
  }
});

// ── Locations ──
test('unauthenticated callers cannot read a location', async () => {
  assert.equal(await read(`locations/${alice.localId}`), 403);
});
test('a stranger cannot read a location directly', async () => {
  assert.equal(await read(`locations/${alice.localId}`, bob.idToken), 403);
});

// ── Friendship needs the list owner's consent ──
test('a stranger cannot grant themselves friendship to read a location', async () => {
  const status = await write(`users/${alice.localId}/friends/${bob.localId}`, { status: 'ACTIVE' }, bob.idToken);
  assert.deepEqual({ grant: status, read: await read(`locations/${alice.localId}`, bob.idToken) }, { grant: 403, read: 403 });
});
test('an already-answered request cannot be reused to claim friendship', async () => {
  const id = `${prefix}-answered`;
  await fixture(`users/${bob.localId}/friendRequests/${id}`, request(alice, bob, 'ACCEPTED'));
  const status = await write(`users/${alice.localId}/friends/${bob.localId}`, { status: 'ACTIVE', requestId: id }, bob.idToken);
  assert.deepEqual({ grant: status, read: await read(`locations/${alice.localId}`, bob.idToken) }, { grant: 403, read: 403 });
});
test('accepting someone else\'s request does not grant friendship with a third user', async () => {
  const id = `${prefix}-from-carol-pending`;
  await fixture(`users/${bob.localId}/friendRequests/${id}`, request(carol, bob, 'PENDING'));
  const status = await commit([
    { path: `users/${bob.localId}/friendRequests/${id}`, data: { status: 'ACCEPTED' }, mask: ['status'] },
    { path: `users/${alice.localId}/friends/${bob.localId}`, data: { status: 'ACTIVE', requestId: id } },
  ], bob.idToken);
  assert.deepEqual({ grant: status, read: await read(`locations/${alice.localId}`, bob.idToken) }, { grant: 403, read: 403 });
});
test('accepting a pending request adds the accepter to the sender\'s friends in one batch', async () => {
  const id = `${prefix}-pending`;
  await fixture(`users/${dana.localId}/friendRequests/${id}`, request(alice, dana, 'PENDING'));
  const status = await commit([
    { path: `users/${dana.localId}/friendRequests/${id}`, data: { status: 'ACCEPTED' }, mask: ['status'] },
    { path: `users/${dana.localId}/friends/${alice.localId}`, data: { status: 'ACTIVE', requestId: id } },
    { path: `users/${alice.localId}/friends/${dana.localId}`, data: { status: 'ACTIVE', requestId: id } },
  ], dana.idToken);
  assert.deepEqual({ accept: status, read: await read(`locations/${alice.localId}`, dana.idToken) }, { accept: 200, read: 200 });
});

// ── Friend requests ──
test('nobody can send a friend request to themselves', async () => {
  assert.equal(await write(`users/${bob.localId}/friendRequests/${prefix}-self`, request(bob, bob, 'PENDING'), bob.idToken), 403);
});
test('a sender cannot create a request that is already accepted', async () => {
  assert.equal(await write(`users/${alice.localId}/friendRequests/${prefix}-preaccepted`, request(bob, alice, 'ACCEPTED'), bob.idToken), 403);
});
test('a recipient cannot rewrite who sent a request', async () => {
  const path = await fixture(`users/${bob.localId}/friendRequests/${prefix}-from-carol`, request(carol, bob, 'PENDING'));
  assert.equal(await write(path, { fromUserId: alice.localId }, bob.idToken, ['fromUserId']), 403);
});
test('a recipient cannot reopen an answered request', async () => {
  const path = await fixture(`users/${bob.localId}/friendRequests/${prefix}-reopen`, request(alice, bob, 'ACCEPTED'));
  assert.equal(await write(path, { status: 'PENDING' }, bob.idToken, ['status']), 403);
});
test('a friend request to someone who turned requests off is denied', async () => {
  assert.equal(await write(`users/${carol.localId}/friendRequests/${prefix}-blocked`, request(bob, carol, 'PENDING'), bob.idToken), 403);
});
test('a friend request to someone accepting requests goes through', async () => {
  assert.equal(await write(`users/${alice.localId}/friendRequests/${prefix}-ok`, request(bob, alice, 'PENDING'), bob.idToken), 200);
});

// ── Chats: members may only touch the last-message preview ──
test('chat members cannot rewrite the creator', async () => {
  const path = await chat('creator');
  assert.equal(await write(path, { createdBy: bob.localId, memberIds: [alice.localId, bob.localId] }, bob.idToken), 403);
});
test('chat members cannot add a stranger to the members', async () => {
  const path = await chat('add-member');
  assert.equal(await write(path, { memberIds: [alice.localId, bob.localId, carol.localId] }, bob.idToken, ['memberIds']), 403);
});
test('chat members can update the last-message preview', async () => {
  const path = await chat('preview');
  assert.equal(await write(path, { lastMessage: 'hej' }, bob.idToken, ['lastMessage']), 200);
});

// ── Gatherings: invitees answer for themselves, members link the chat ──
test('gathering invitees cannot rewrite its creator', async () => {
  const path = await gathering('creator');
  assert.equal(await write(path, { createdBy: bob.localId }, bob.idToken, ['createdBy']), 403);
});
test('gathering invitees cannot edit its text', async () => {
  const path = await gathering('text');
  assert.equal(await write(path, { text: 'Changed' }, bob.idToken, ['text']), 403);
});
test('gathering invitees cannot invite other people', async () => {
  const path = await gathering('invite');
  assert.equal(await write(path, { invitedIds: [bob.localId, carol.localId] }, bob.idToken, ['invitedIds']), 403);
});
test('a gathering invitee cannot bring someone else in when accepting', async () => {
  const path = await gathering('accept-plus-one');
  assert.equal(await write(path, {
    memberIds: [alice.localId, bob.localId, carol.localId], invitedIds: [],
  }, bob.idToken, ['memberIds', 'invitedIds']), 403);
});
test('a gathering invitee can accept', async () => {
  const path = await gathering('accept');
  assert.equal(await write(path, { memberIds: [alice.localId, bob.localId], invitedIds: [] }, bob.idToken, ['memberIds', 'invitedIds']), 200);
});
test('a gathering invitee can decline', async () => {
  const path = await gathering('decline');
  assert.equal(await write(path, { invitedIds: [] }, bob.idToken, ['invitedIds']), 200);
});
test('a gathering member can link the spawned chat', async () => {
  const path = await gathering('chat');
  assert.equal(await write(path, { chatId: `${prefix}-chat` }, alice.idToken, ['chatId']), 200);
});
