import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import {
  devKeyPair,
  fromHex,
  generateKeyPair,
  keyPairFromSecret,
  toHex,
  type KeyPair,
} from './envelope';
import * as trust from './trust';

// React Native has no WebCrypto, so tweetnacl has no randomness until it's
// given some. (Without this it refuses to encrypt rather than use weak bytes.)
nacl.setPRNG((target: Uint8Array, length: number) => {
  target.set(Crypto.getRandomBytes(length));
});

// The seed encrypts fixture chats with these personas' fixed keys (devKeyPair).
const DEV_PERSONAS = ['dev-user', 'alice', 'bob', 'charlie', 'dana', 'eve'];

// SecureStore doesn't exist on web. Web is a dev-only target (real users get
// the Android app), so plain storage is fine there.
const secrets = {
  get: (name: string) =>
    Platform.OS === 'web' ? AsyncStorage.getItem(name) : SecureStore.getItemAsync(name),
  set: (name: string, value: string) =>
    Platform.OS === 'web' ? AsyncStorage.setItem(name, value) : SecureStore.setItemAsync(name, value),
};

async function loadSecretKey(uid: string): Promise<KeyPair> {
  if (__DEV__ && DEV_PERSONAS.includes(uid)) return devKeyPair(uid);

  const name = `us.e2ee.secret.${uid}`;
  let stored: string | null = null;
  try {
    stored = await secrets.get(name);
  } catch (e) {
    // Android can lose the Keystore entry that protects this value. It won't
    // come back, so carry on with a new key: old messages stay unreadable, but
    // the app keeps working and friends get a key-change warning.
    console.warn('[e2ee] could not read the secret key:', e);
  }
  if (stored) return keyPairFromSecret(fromHex(stored));

  const pair = generateKeyPair();
  await secrets.set(name, toHex(pair.secretKey));
  return pair;
}

// ─── Identity + pinned keys for the signed-in user ──

let pins: trust.Pins = {};
let pinsStorageKey = '';
const trustListeners = new Set<() => void>();
let loading: { uid: string; pair: Promise<KeyPair> } | null = null;

async function load(uid: string): Promise<KeyPair> {
  const storageKey = `us.e2ee.pins.${uid}`;
  const [pair, storedPins] = await Promise.all([
    loadSecretKey(uid),
    AsyncStorage.getItem(storageKey),
  ]);
  try {
    pins = storedPins ? JSON.parse(storedPins) : {};
  } catch {
    // Unreadable pins must not lock anyone out. Keys get pinned afresh.
    pins = {};
  }
  pinsStorageKey = storageKey;
  return pair;
}

/** This user's key pair. Pinned keys are ready once it resolves. */
export function loadIdentity(uid: string): Promise<KeyPair> {
  if (loading?.uid !== uid) loading = { uid, pair: load(uid) };
  return loading.pair;
}

function savePins() {
  AsyncStorage.setItem(pinsStorageKey, JSON.stringify(pins)).catch((e) =>
    console.warn('[e2ee] could not save pinned keys:', e)
  );
}

/** True when this is the key we pinned for `uid`, pinning it on first sight. */
export function isTrustedKey(uid: string, key: Uint8Array): boolean {
  const hex = toHex(key);
  if (trust.pinIfFirstSeen(pins, uid, hex)) savePins();
  return trust.isPinned(pins, uid, hex);
}

export function acceptChangedKey(uid: string, key: Uint8Array): void {
  trust.acceptKey(pins, uid, toHex(key));
  savePins();
  trustListeners.forEach((listener) => listener());
}

export function onTrustChange(listener: () => void): () => void {
  trustListeners.add(listener);
  return () => {
    trustListeners.delete(listener);
  };
}

export function resolveKeys(
  memberIds: string[],
  directory: Record<string, Uint8Array | null | undefined>
): trust.ChatKeys {
  return trust.resolveChatKeys(memberIds, directory, pins);
}
