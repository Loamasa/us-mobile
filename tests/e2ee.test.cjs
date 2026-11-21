const { test } = require('node:test');
const assert = require('node:assert/strict');
const nacl = require('tweetnacl');
const { devKeyPair, generateKeyPair, open, safetyCode, seal, toHex } = require('../.expo/test-build/features/e2ee/envelope.js');
const { acceptKey, isPinned, pinIfFirstSeen, resolveChatKeys } = require('../.expo/test-build/features/e2ee/trust.js');

const alice = generateKeyPair();
const bob = generateKeyPair();
const carol = generateKeyPair();
const toBoth = { alice: alice.publicKey, bob: bob.publicKey };
const hello = () => seal('hej på dig 🧆', 'chat:1', 'alice', alice, toBoth);

test('every recipient reads the text, sender and sender key', () => {
  const envelope = hello();
  for (const [uid, pair] of [['alice', alice], ['bob', bob]]) {
    const opened = open(envelope, uid, pair, 'chat:1');
    assert.equal(opened.text, 'hej på dig 🧆');
    assert.equal(opened.senderId, 'alice');
    assert.deepEqual(opened.from, alice.publicKey);
  }
});
test('the stored envelope does not contain the text', () => {
  const envelope = seal('topsecretword', 'chat:1', 'alice', alice, toBoth);
  const stored = Buffer.concat([envelope.body, ...Object.values(envelope.grants)]).toString('latin1');
  assert.ok(!stored.includes('topsecretword'));
});
test('someone without a grant cannot read it, even under a granted uid', () => {
  const envelope = hello();
  assert.equal(open(envelope, 'carol', carol, 'chat:1'), null);
  assert.equal(open(envelope, 'bob', carol, 'chat:1'), null);
});
test('changed bytes are rejected', () => {
  const envelope = hello();
  const body = envelope.body.slice();
  body[0] ^= 1;
  assert.equal(open({ ...envelope, body }, 'bob', bob, 'chat:1'), null);
  const grant = envelope.grants.bob.slice();
  grant[0] ^= 1;
  assert.equal(open({ ...envelope, grants: { bob: grant } }, 'bob', bob, 'chat:1'), null);
});
test('a message moved to another chat is rejected', () => {
  assert.equal(open(hello(), 'bob', bob, 'chat:2'), null);
});
test('a reader cannot forge another body under the sender’s grants', () => {
  // Carol is a legitimate reader, so she can recover the content key...
  const envelope = seal('real', 'chat:1', 'alice', alice, { bob: bob.publicKey, carol: carol.publicKey });
  const grant = nacl.box.open(envelope.grants.carol, envelope.n, alice.publicKey, carol.secretKey);
  const contentKey = grant.slice(0, 32);
  const forged = Buffer.from(JSON.stringify({ t: 'forged', c: 'chat:1', s: 'alice' }));
  const body = nacl.secretbox(new Uint8Array(forged), envelope.n, contentKey);
  // ...but Bob's grant, authenticated by Alice, still commits to the real body.
  assert.equal(open({ ...envelope, body }, 'bob', bob, 'chat:1'), null);
});
test('a forged sender key is visible to the trust check', () => {
  const forged = seal('hi', 'chat:1', 'alice', carol, { bob: bob.publicKey });
  const opened = open(forged, 'bob', bob, 'chat:1');
  assert.deepEqual(opened.from, carol.publicKey);
  const pins = { alice: [toHex(alice.publicKey)] };
  assert.equal(isPinned(pins, 'alice', toHex(opened.from)), false);
});
test('stored size hides the exact message length', () => {
  const sizes = ['a', 'ab', 'hello there'].map((t) => seal(t, 'chat:1', 'alice', alice, toBoth).body.length);
  assert.equal(new Set(sizes).size, 1);
});
test('long text and every padding boundary survive the round trip', () => {
  for (const length of [0, 1, 200, 255, 256, 257, 4000]) {
    const text = 'å'.repeat(length);
    assert.equal(open(seal(text, 'chat:1', 'alice', alice, toBoth), 'bob', bob, 'chat:1').text, text);
  }
});
test('all of Unicode survives, and a half-cut emoji does not fail the send', () => {
  for (const text of ['abc', 'åäö', '€', '日本語', '🧆👩‍👩‍👧', '\u0000', '\uFFFF', String.fromCodePoint(0x10ffff)]) {
    assert.equal(open(seal(text, 'chat:1', 'alice', alice, toBoth), 'bob', bob, 'chat:1').text, text);
  }
  assert.equal(open(seal('hi \uD83E', 'chat:1', 'alice', alice, toBoth), 'bob', bob, 'chat:1').text.slice(0, 3), 'hi ');
});
test('malformed envelopes return null instead of throwing', () => {
  const envelope = hello();
  assert.equal(open({ ...envelope, n: new Uint8Array(3) }, 'bob', bob, 'chat:1'), null);
  assert.equal(open({ ...envelope, from: new Uint8Array(1) }, 'bob', bob, 'chat:1'), null);
});
test('both people get the same safety code, and a swapped key changes it', () => {
  const code = safetyCode(alice.publicKey, bob.publicKey);
  assert.match(code, /^\d{4}( \d{4}){5}$/);
  assert.equal(safetyCode(bob.publicKey, alice.publicKey), code);
  assert.notEqual(safetyCode(alice.publicKey, carol.publicKey), code);
});
test('dev persona keys are fixed; real keys are not', () => {
  assert.deepEqual(devKeyPair('alice').publicKey, devKeyPair('alice').publicKey);
  assert.notDeepEqual(devKeyPair('alice').publicKey, devKeyPair('bob').publicKey);
  assert.notDeepEqual(generateKeyPair().publicKey, generateKeyPair().publicKey);
});
test('a first key is pinned, a later one is not until accepted', () => {
  const pins = {};
  assert.equal(pinIfFirstSeen(pins, 'bob', 'k1'), true);
  assert.equal(pinIfFirstSeen(pins, 'bob', 'k2'), false);
  assert.equal(isPinned(pins, 'bob', 'k2'), false);
  acceptKey(pins, 'bob', 'k2');
  assert.equal(isPinned(pins, 'bob', 'k1') && isPinned(pins, 'bob', 'k2'), true);
  assert.deepEqual(pins.bob, ['k1', 'k2']);
});
test('new messages are never encrypted to an unaccepted key', () => {
  const pins = { bob: [toHex(bob.publicKey)] };
  const keys = resolveChatKeys(['bob'], { bob: carol.publicKey }, pins);
  assert.deepEqual(keys.recipients, {});
  assert.deepEqual(keys.changed, [{ uid: 'bob', key: carol.publicKey }]);
  acceptKey(pins, 'bob', toHex(carol.publicKey));
  assert.deepEqual(resolveChatKeys(['bob'], { bob: carol.publicKey }, pins).recipients, { bob: carol.publicKey });
});
test('a member with no key, or not loaded yet, is reported separately', () => {
  const keys = resolveChatKeys(['bob', 'carol', 'dana'], { bob: null, dana: alice.publicKey }, {});
  assert.deepEqual(keys.missing, ['bob']);
  assert.deepEqual(keys.unknown, ['carol']);
  assert.deepEqual(keys.recipients, { dana: alice.publicKey });
});
test('offline, the newest pinned key is used', () => {
  const pins = { bob: [toHex(carol.publicKey), toHex(bob.publicKey)] };
  assert.deepEqual(resolveChatKeys(['bob'], {}, pins).recipients, { bob: bob.publicKey });
});
