const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator, doc, getDoc, onSnapshot, terminate } = require('firebase/firestore');

const app = initializeApp({ projectId: 'us-v1-ff6b3', apiKey: 'emulator-only' }, 'firebase-sdk-verification');
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8088);
const timeout = setTimeout(() => { console.error('FAIL: Firebase emulator smoke test timed out'); process.exit(1); }, 20000);

async function check() {
  const credential = await signInWithEmailAndPassword(auth, 'dev@test.dev', 'test123456');
  assert.equal(credential.user.uid, 'dev-user');
  const profile = doc(db, 'users', 'alice');
  assert.ok((await getDoc(profile)).exists(), 'Seeded friend profile exists');
  await new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(profile, { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache) return;
      unsubscribe();
      if (!snapshot.exists()) return reject(new Error('Profile listener returned no document'));
      resolve();
    }, reject);
  });
  console.log('PASS: Firebase sign-in, Firestore read and live listener with patched gRPC');
}

check().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  clearTimeout(timeout);
  await terminate(db);
  await deleteApp(app);
});
