// Emulator-only authorization tests, run as real user tokens (never
// `Bearer owner`, which bypasses rules). Fixtures are written with the owner
// token; every assertion is made with a user token.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const authBase = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const docs = 'http://127.0.0.1:8088/v1/projects/us-felix-test-20261030/databases/(default)/documents';
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const prefix = `regression-${randomUUID()}`;
const paths = [];
const accounts = [];
let alice, bob, carol, dana;
const value = (x) => {
  if (x === null) return { nullValue: null };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(value) } };
  if (x instanceof Uint8Array) return { bytesValue: Buffer.from(x).toString('base64') };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return { integerValue: String(x) };
  if (typeof x === 'object') return { mapValue: { fields: fields(x) } };
  return { stringValue: x };
};
const fields = (x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, value(v)]));
const docName = (path) => `projects/us-felix-test-20261030/databases/(default)/documents/${path}`;
// A well-formed envelope: the rules check its shape, they can't read inside it.
const envelope = () => ({
  v: 1, from: new Uint8Array(32), n: new Uint8Array(24), body: new Uint8Array(64), grants: { a: new Uint8Array(80) },
});
// Writes with server-set time fields, the way the app's serverTimestamp() does.
async function commit(path, data, token, serverTimeFields = [], updateMask) {
  const res = await fetch(`${docs}:commit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ writes: [{
      update: { name: docName(path), fields: fields(data) },
      ...(updateMask ? { updateMask: { fieldPaths: updateMask } } : {}),
      updateTransforms: serverTimeFields.map((fieldPath) => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })),
    }] }),
  });
  return res.status;
}
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
async function read(path, token) {
  return (await fetch(`${docs}/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })).status;
}
// Atomic multi-document write, the REST shape of a client writeBatch.
async function batch(writes, token) {
  const res = await fetch(`${docs}:commit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ writes: writes.map(({ path, data, mask }) => {
      paths.push(path);
      return { update: { name: docName(path), fields: fields(data) }, ...(mask ? { updateMask: { fieldPaths: mask } } : {}) };
    }) }),
  });
  return res.status;
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
  await fixture(`users/${alice.localId}`, { handle: 'alice', settings: { allowFriendRequests: true } });
  await fixture(`users/${carol.localId}`, { handle: 'carol', settings: { allowFriendRequests: false } });
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
test('unauthenticated callers cannot read a location', async () => {
  assert.equal(await read(`locations/${alice.localId}`), 403);
});
test('a stranger cannot read a location directly', async () => {
  assert.equal(await read(`locations/${alice.localId}`, bob.idToken), 403);
});
// ── Friendship needs the list owner's consent ──
test('a stranger cannot grant themselves friendship to read a location', async () => {
  const status = await write(`users/${alice.localId}/friends/${bob.localId}`, { status: 'ACTIVE' }, bob.idToken);
  assert.deepEqual({ grant: status, read: await read(`locations/${alice.localId}`, bob.idToken) }, { grant: 403, read: 403 }, 'stranger self-grant and location read must both be denied');
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
  const status = await batch([
    { path: `users/${bob.localId}/friendRequests/${id}`, data: { status: 'ACCEPTED' }, mask: ['status'] },
    { path: `users/${alice.localId}/friends/${bob.localId}`, data: { status: 'ACTIVE', requestId: id } },
  ], bob.idToken);
  assert.deepEqual({ grant: status, read: await read(`locations/${alice.localId}`, bob.idToken) }, { grant: 403, read: 403 });
});
test('a recipient can accept a real request and create both friend records', async () => {
  const id = `${prefix}-pending`;
  await fixture(`users/${dana.localId}/friendRequests/${id}`, request(alice, dana, 'PENDING'));
  const status = await batch([
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
  const path = await fixture(`chats/${prefix}`, { createdBy: alice.localId, memberIds: [alice.localId, bob.localId] });
  assert.equal(await write(path, { createdBy: bob.localId, memberIds: [alice.localId, bob.localId] }, bob.idToken), 403);
  assert.equal(await commit(path, { lastMessage: 'Hello' }, bob.idToken, ['lastMessageAt'], ['lastMessage']), 403, 'plain-text preview');
  assert.equal(await commit(path, { lastMessage: envelope() }, bob.idToken, ['lastMessageAt'], ['lastMessage']), 200, 'encrypted preview');
});
test('chat members cannot add a stranger to the members', async () => {
  const path = await chat('add-member');
  assert.equal(await write(path, { memberIds: [alice.localId, bob.localId, carol.localId] }, bob.idToken, ['memberIds']), 403);
});
test('a stranger cannot pre-create a DM between two other people', async () => {
  const [a, b] = [alice.localId, bob.localId].sort();
  const path = `chats/dm_${a}_${b}`; paths.push(path);
  const chat = (type, memberIds, createdBy) => ({ type, createdBy, memberIds, name: null, avatarUrl: null, lastMessage: null, lastMessageAt: null });
  const create = (data, token) => commit(path, data, token, ['createdAt']);
  assert.equal(await create(chat('DM', [a, b, carol.localId], carol.localId), carol.idToken), 403, 'stranger added to the DM');
  assert.equal(await create(chat('DM', [carol.localId], carol.localId), carol.idToken), 403, 'stranger blocks the DM');
  assert.equal(await create(chat('GROUP', [carol.localId, a, b], carol.localId), carol.idToken), 403, 'stranger disguises it as a group');
  assert.equal(await create(chat('DM', [a, b], alice.localId), alice.idToken), 200, 'a real participant creates it');
});
test('messages must be encrypted and only members can send them', async () => {
  const chatPath = await fixture(`chats/${prefix}-messages`, { createdBy: alice.localId, memberIds: [alice.localId] });
  const message = (id) => { const path = `${chatPath}/messages/${id}`; paths.push(path); return path; };
  const send = (id, data, token) => commit(message(id), data, token, ['createdAt']);
  assert.equal(await send('plain', { senderId: alice.localId, content: 'hello' }, alice.idToken), 403, 'plain text');
  assert.equal(await send('mixed', { senderId: alice.localId, content: 'hello', envelope: envelope() }, alice.idToken), 403, 'plain text beside an envelope');
  assert.equal(await send('stranger', { senderId: bob.localId, envelope: envelope() }, bob.idToken), 403, 'non-member');
  assert.equal(await send('sealed', { senderId: alice.localId, envelope: envelope() }, alice.idToken), 200, 'encrypted');
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
test('a gathering invitee cannot join twice or pad the invite list', async () => {
  const path = await gathering('padding');
  assert.equal(await write(path, {
    memberIds: [alice.localId, bob.localId, bob.localId], invitedIds: [],
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
