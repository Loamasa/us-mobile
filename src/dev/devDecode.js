// The verify scripts read Firestore over REST as the seeded dev-user. Stored
// values are sealed, so decode them the way src/lib/firestore.ts does.
const { devKeyPair, open } = require('../../.expo/test-build/features/e2ee/envelope.js');

const VIEWER = 'dev-user';
const openFor = (envelope, scope) =>
  envelope ? open(envelope, VIEWER, devKeyPair(VIEWER), scope) : null;

const fromBytes = (value) => new Uint8Array(Buffer.from(value, 'base64'));

function decodeLocation(id, doc) {
  const opened = doc && openFor(doc.envelope, `location:${id}`);
  return opened ? { ...doc, ...JSON.parse(opened.text) } : null;
}

function decodeProfile(id, doc, timestamp) {
  if (!doc) return null;
  const opened = openFor(doc.currentSignal, `signal:${id}`);
  if (!opened) return { ...doc, currentSignal: null };
  const signal = JSON.parse(opened.text);
  return {
    ...doc,
    currentSignal: { ...signal, expiresAt: timestamp(new Date(signal.expiresAt)) },
  };
}

function decodeChatName(chat) {
  return { ...chat, name: openFor(chat.name, `chat-name:${chat.id}`)?.text ?? null };
}

module.exports = { decodeChatName, decodeLocation, decodeProfile, fromBytes };
