const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Module = require('node:module');

// keystore.ts runs on React Native. Stand in for the native modules it imports.
const store = new Map();
const secureStore = {
  getItemAsync: async (name) => store.get(name) ?? null,
  setItemAsync: async (name, value) => {
    store.set(name, value);
  },
};
const stubs = {
  'react-native': { Platform: { OS: 'android' } },
  '@react-native-async-storage/async-storage': {
    getItem: async () => null,
    setItem: async () => {},
  },
  'expo-crypto': { getRandomBytes: (n) => new Uint8Array(crypto.randomBytes(n)) },
  'expo-secure-store': secureStore,
};
const realLoad = Module._load;
Module._load = function (request, ...rest) {
  return request in stubs ? stubs[request] : realLoad.call(this, request, ...rest);
};
globalThis.__DEV__ = false;
const { loadIdentity } = require('../.expo/test-build/features/e2ee/keystore.js');

test('a failed secret-key read does not replace the stored key', async () => {
  const name = 'us.e2ee.secret.read-fails';
  store.set(name, 'aa'.repeat(32));
  const realGet = secureStore.getItemAsync;
  secureStore.getItemAsync = async () => {
    throw new Error('Keystore busy');
  };
  try {
    await assert.rejects(loadIdentity('read-fails'));
  } finally {
    secureStore.getItemAsync = realGet;
  }
  assert.equal(store.get(name), 'aa'.repeat(32));
});

test('a failed key load is retried on the next call', async () => {
  const realSet = secureStore.setItemAsync;
  secureStore.setItemAsync = async () => {
    throw new Error('Keystore busy');
  };
  try {
    await assert.rejects(loadIdentity('save-fails'));
  } finally {
    secureStore.setItemAsync = realSet;
  }
  const pair = await loadIdentity('save-fails');
  assert.equal(pair.secretKey.length, 32);
});
