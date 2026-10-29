const { test } = require('node:test');
const assert = require('node:assert/strict');
const { projectMapEntities } = require('../.expo/test-build/features/map/mapProjection.js');
const { buildGroupPins } = require('../.expo/test-build/features/map/groupPins.js');
const presence = (lat, lng = 13, signal = null) => ({
  location: { lat, lng },
  profile: { displayName: 'Friend', avatarUrl: null, currentSignal: signal },
});
const together = () => ({ alice: presence(55.6), bob: presence(55.6001) });
const group = (changes = {}) => ({
  id: 'crew', type: 'GROUP', name: 'Crew', mapVisibility: 'ALWAYS',
  memberIds: ['bob', 'viewer', 'alice'],
  fixedLocation: { latitude: 55.59, longitude: 13.01 }, ...changes,
});
const reconcile = (rawEntities, chats = [group()], memberProfiles = {}) =>
  buildGroupPins({ rawEntities, chats, memberProfiles, userId: 'viewer' });
const signal = (offset) => ({ emoji: '☕', text: 'Coffee', expiresAt: { toDate: () => new Date(Date.now() + offset) } });

test('empty locations produce no markers', () => assert.deepEqual(projectMapEntities({}), []));
test('a lone friend retains coordinates, spot and active signal', () => {
  const data = presence(55.6, 13, signal(60000));
  data.location.spot = { name: 'Cafe', emoji: '☕' };
  const [entity] = projectMapEntities({ alice: data });
  assert.equal(entity.id, 'friend-alice');
  assert.deepEqual(entity.location, { lat: 55.6, lng: 13 });
  assert.equal(entity.friends[0].spot.name, 'Cafe');
  assert.equal(entity.signal.text, 'Coffee');
});
test('nearby friends cluster at the real centroid', () => {
  const [entity] = projectMapEntities(together());
  assert.equal(entity.type, 'CLUSTER');
  assert.equal(entity.id, 'cluster-alice-bob');
  assert.ok(Math.abs(entity.location.lat - 55.60005) < 1e-9);
  assert.deepEqual(entity.friends.map(f => f.userId).sort(), ['alice', 'bob']);
});
test('friends outside 100 metres remain individual', () => {
  const entities = projectMapEntities({ alice: presence(55.6), bob: presence(55.602) });
  assert.equal(entities.length, 2);
  assert.ok(entities.every(e => e.type === 'FRIEND'));
});
test('each friend appears only once across clusters and individuals', () => {
  const entities = projectMapEntities({ ...together(), charlie: presence(56) });
  assert.deepEqual(entities.flatMap(e => e.friends.map(f => f.userId)).sort(), ['alice', 'bob', 'charlie']);
});
test('expired signals disappear from individual markers', () => {
  const [entity] = projectMapEntities({ alice: presence(55.6, 13, signal(-60000)) });
  assert.equal(entity.friends[0].signal, null);
  assert.equal(entity.signal, undefined);
});
test('expired signals disappear from cluster members', () => {
  const [entity] = projectMapEntities({ alice: presence(55.6, 13, signal(-60000)), bob: presence(55.6001) });
  assert.ok(entity.friends.every(f => f.signal === null));
});
test('live groups match membership regardless of order and suppress fixed pins', () => {
  const entities = reconcile(projectMapEntities(together()));
  assert.equal(entities.length, 1);
  assert.deepEqual(entities[0].groupChat, { id: 'crew', name: 'Crew' });
  assert.ok(Math.abs(entities[0].location.lat - 55.60005) < 1e-9);
});
test('apart members keep their live pins alongside the resting group', () => {
  const raw = projectMapEntities({ alice: presence(55.6) });
  const entities = reconcile(raw);
  assert.equal(entities.length, 2);
  assert.equal(entities[0], raw[0]);
  assert.deepEqual(entities[1].location, { lat: 55.59, lng: 13.01 });
  assert.equal(entities[1].groupChat.fixed, true);
  assert.deepEqual(entities[1].friends.map(f => f.userId).sort(), ['alice', 'bob']);
  assert.ok(entities[1].friends.every(f => f.isOnline === false));
});
test('resting pins use profiles and suppress expired signals', () => {
  const [entity] = reconcile([], [group()], { alice: { displayName: 'Alice', avatarUrl: 'avatar', currentSignal: signal(-60000) } });
  assert.equal(entity.friends.find(f => f.userId === 'alice').displayName, 'Alice');
  assert.equal(entity.friends.find(f => f.userId === 'alice').signal, null);
  assert.equal(entity.friends.find(f => f.userId === 'bob').displayName, 'Member');
});
test('groups require exact membership before decorating a live cluster', () => {
  const entities = reconcile(projectMapEntities(together()), [group({ memberIds: ['viewer', 'alice', 'bob', 'charlie'] })]);
  assert.equal(entities[0].groupChat, undefined);
  assert.equal(entities[1].groupChat.fixed, true);
});
test('DMs, unnamed groups and hidden groups do not create group pins', () => {
  for (const changes of [{ type: 'DM' }, { name: null }, { mapVisibility: 'NEVER' }]) {
    assert.deepEqual(reconcile([], [group(changes)]), []);
  }
});
test('an absent fixed location does not create a resting pin', () => assert.deepEqual(reconcile([], [group({ fixedLocation: null })]), []));
test('projection and reconciliation leave their inputs untouched', () => {
  const locations = together();
  const before = JSON.stringify(locations);
  const raw = projectMapEntities(locations);
  const chats = [group()];
  const rawBefore = JSON.stringify(raw);
  const chatsBefore = JSON.stringify(chats);
  reconcile(raw, chats);
  assert.equal(JSON.stringify(locations), before);
  assert.equal(JSON.stringify(raw), rawBefore);
  assert.equal(JSON.stringify(chats), chatsBefore);
});
