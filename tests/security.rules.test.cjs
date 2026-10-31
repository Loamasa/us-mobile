// Emulator-only authorization regression tests with disposable accounts.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const authBase = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const docs = 'http://127.0.0.1:8088/v1/projects/us-v1-ff6b3/databases/(default)/documents';
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const prefix = `regression-${randomUUID()}`;
const paths = [];
const accounts = [];
let alice, bob;
const value = (x) => Array.isArray(x) ? { arrayValue: { values: x.map(value) } } : { stringValue: x };
const fields = (x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, value(v)]));
async function account(name) {
  const res = await fetch(`${authBase}/accounts:signUp?key=emulator-only`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${prefix}-${name}@test.invalid`, password: randomUUID(), returnSecureToken: true }),
  });
  assert.equal(res.status, 200, 'Auth emulator must be running');
  const user = await res.json(); accounts.push(user); return user;
}
async function write(path, data, token = 'owner') {
  const res = await fetch(`${docs}/${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: fields(data) }),
  });
  return res.status;
}
async function read(path, token) {
  return (await fetch(`${docs}/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })).status;
}
async function fixture(path, data) { paths.push(path); assert.equal(await write(path, data), 200); return path; }
before(async () => {
  alice = await account('alice'); bob = await account('bob');
  await fixture(`locations/${alice.localId}`, { owner: alice.localId });
});
after(async () => {
  for (const path of paths.reverse()) await fetch(`${docs}/${path}`, { method: 'DELETE', headers: owner });
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
test('a stranger cannot grant themselves friendship to read a location', async () => {
  const path = `users/${alice.localId}/friends/${bob.localId}`; paths.push(path);
  const status = await write(path, { status: 'ACTIVE' }, bob.idToken);
  assert.deepEqual({ grant: status, read: await read(`locations/${alice.localId}`, bob.idToken) }, { grant: 403, read: 403 }, 'stranger self-grant and location read must both be denied');
});
test('a recipient can accept a real request and create both friend records', async () => {
  const requestPath = `users/${alice.localId}/friendRequests/${prefix}`;
  const mine = `users/${alice.localId}/friends/${bob.localId}`;
  const theirs = `users/${bob.localId}/friends/${alice.localId}`;
  paths.push(requestPath, mine, theirs);
  assert.equal(await write(requestPath, { fromUserId: bob.localId, toUserId: alice.localId, status: 'PENDING' }, bob.idToken), 200);
  assert.equal(await write(requestPath, { fromUserId: alice.localId, toUserId: alice.localId, status: 'ACCEPTED' }, alice.idToken), 403);
  const name = (path) => `projects/us-v1-ff6b3/databases/(default)/documents/${path}`;
  const friend = fields({ status: 'ACTIVE', requestId: prefix });
  const response = await fetch(`${docs}:commit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice.idToken}` },
    body: JSON.stringify({ writes: [
      { update: { name: name(requestPath), fields: fields({ status: 'ACCEPTED' }) }, updateMask: { fieldPaths: ['status'] } },
      { update: { name: name(mine), fields: friend } },
      { update: { name: name(theirs), fields: friend } },
    ] }),
  });
  assert.equal(response.status, 200, await response.text());
  assert.equal(await read(`locations/${alice.localId}`, bob.idToken), 200);
});
test('chat members cannot rewrite the creator', async () => {
  const path = await fixture(`chats/${prefix}`, { createdBy: alice.localId, memberIds: [alice.localId, bob.localId] });
  assert.equal(await write(path, { createdBy: bob.localId, memberIds: [alice.localId, bob.localId] }, bob.idToken), 403);
  assert.equal(await write(path, { createdBy: alice.localId, memberIds: [alice.localId, bob.localId], lastMessage: 'Hello' }, bob.idToken), 200);
});
test('gathering invitees cannot rewrite its creator', async () => {
  const path = await fixture(`broadcasts/${prefix}`, {
    createdBy: alice.localId, memberIds: [alice.localId], invitedIds: [bob.localId], visibility: 'MEMBERS',
  });
  assert.equal(await write(path, {
    createdBy: bob.localId, memberIds: [alice.localId], invitedIds: [bob.localId], visibility: 'MEMBERS',
  }, bob.idToken), 403);
  assert.equal(await write(path, {
    createdBy: alice.localId, memberIds: [alice.localId, bob.localId], invitedIds: [], visibility: 'MEMBERS',
  }, bob.idToken), 200);
});
