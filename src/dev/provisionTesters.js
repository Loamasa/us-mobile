/**
 * Provision fixed tester accounts (Phase 3 Step 3 — re-scoped: no self-registration).
 *
 *   node src/dev/provisionTesters.js --emulator --count 3     # against emulators
 *   node src/dev/provisionTesters.js --count 20               # against PRODUCTION
 *
 * Creates N email/password accounts (tester01..testerNN @ us.test) with a ready
 * profile (users/{uid}) and reserved handle (handles/testerNN). Testers sign in
 * with the Account ID + password from the CSV and can change their display name
 * in Settings → My Account (handles stay fixed — that's how friends add them).
 *
 * No admin credentials needed: accounts are created via the public signUp REST
 * endpoint and each account writes ITS OWN profile/handle docs (the security
 * rules allow exactly that), so a successful emulator run doubles as proof the
 * production rules permit the flow.
 *
 * Idempotent: testers-credentials.csv (gitignored) is both output and state.
 *   - account in CSV  → signs in with the stored password, verifies docs exist
 *   - account missing → created fresh, appended to the CSV
 *   - existing profiles are NEVER overwritten (a tester's edited name survives)
 *
 * PRODUCTION prerequisites (one-time, in the Firebase console / CLI):
 *   1. Authentication → Sign-in method → enable Email/Password
 *   2. firebase deploy --only firestore   (rules must be live)
 *
 * Note: tester emails use the reserved .test TLD — no mail is ever delivered,
 * so password RESET emails won't work. Reset passwords via the Firebase console.
 */

const fs = require('fs');
const path = require('path');

// ── Targets ──────────────────────────────────────────────────────────────────
const EMULATOR = process.argv.includes('--emulator');
const COUNT = (() => {
  const i = process.argv.indexOf('--count');
  return i === -1 ? 20 : Math.max(1, parseInt(process.argv[i + 1], 10) || 20);
})();

const FIRESTORE_PROJECT = 'us-v1-ff6b3';
// Public client key from src/config/firebase.ts (API keys are identifiers, not
// secrets). The emulator accepts any key.
const API_KEY = EMULATOR ? 'fake-api-key' : 'AIzaSyCQE2t2nLYTxKMA7SeM-FPx1y2th9wEHFM';

const AUTH_BASE = EMULATOR
  ? 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
  : 'https://identitytoolkit.googleapis.com/v1';
const DOCS = EMULATOR
  ? `http://127.0.0.1:8088/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`;

// Keep in sync with TESTER_EMAIL_DOMAIN in src/config/constants.ts (the sign-in
// screen appends this to bare account IDs). .test is RFC-reserved — never real.
const EMAIL_DOMAIN = 'us.test';
const CSV_PATH = path.join(__dirname, '..', '..', 'testers-credentials.csv');
const CSV_HEADER = 'accountId,email,password,uid,handle,displayName';

// ── Helpers ──────────────────────────────────────────────────────────────────
const WORDS = [
  'void', 'echo', 'mint', 'rose', 'fog', 'signal', 'orbit', 'pulse', 'radar',
  'spark', 'drift', 'glow', 'nova', 'flux', 'wave', 'stone', 'pine', 'cedar',
  'amber', 'coral', 'slate', 'frost', 'ember', 'cloud', 'river', 'delta',
];
function generatePassword() {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = String(Math.floor(Math.random() * 90) + 10);
  let a = pick();
  let b = pick();
  while (b === a) b = pick();
  return `${a}-${b}-${num}`;
}

function loadCsv() {
  const rows = new Map();
  if (!fs.existsSync(CSV_PATH)) return rows;
  const lines = fs.readFileSync(CSV_PATH, 'utf8').trim().split(/\r?\n/).slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const [accountId, email, password, uid, handle, displayName] = line.split(',');
    rows.set(accountId, { accountId, email, password, uid, handle, displayName });
  }
  return rows;
}

function saveCsv(rows) {
  const lines = [CSV_HEADER];
  for (const r of [...rows.values()].sort((a, b) => a.accountId.localeCompare(b.accountId))) {
    lines.push([r.accountId, r.email, r.password, r.uid, r.handle, r.displayName].join(','));
  }
  fs.writeFileSync(CSV_PATH, lines.join('\n') + '\n', 'utf8');
}

async function authPost(endpoint, body) {
  const res = await fetch(`${AUTH_BASE}/accounts:${endpoint}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function getDoc(docPath, idToken) {
  const res = await fetch(`${DOCS}/${docPath}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return res.status; // 200 exists, 404 missing, 403 denied
}

async function createDoc(docPath, fields, idToken) {
  const res = await fetch(`${DOCS}/${docPath}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`write ${docPath} → ${res.status}: ${await res.text()}`);
}

// Firestore REST value encoding for the profile shape (mirrors profile.tsx)
function profileFields(displayName, handle) {
  return {
    displayName: { stringValue: displayName },
    handle: { stringValue: handle },
    avatarUrl: { stringValue: '' },
    bio: { stringValue: '' },
    phoneNumber: { stringValue: '' },
    createdAt: { timestampValue: new Date().toISOString() },
    settings: {
      mapValue: {
        fields: {
          globalLocationSharing: { booleanValue: true },
          allowFriendRequests: { booleanValue: true },
          showOnlineStatus: { booleanValue: true },
        },
      },
    },
    currentSignal: { nullValue: null },
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(
    `Provisioning ${COUNT} tester accounts against ${EMULATOR ? 'EMULATORS' : '🔴 PRODUCTION'} (${FIRESTORE_PROJECT})\n`
  );

  const csv = loadCsv();
  const results = [];

  for (let i = 1; i <= COUNT; i++) {
    const accountId = `tester${String(i).padStart(2, '0')}`;
    const email = `${accountId}@${EMAIL_DOMAIN}`;
    const handle = accountId;
    const displayName = `Tester ${String(i).padStart(2, '0')}`;
    const known = csv.get(accountId);

    let idToken = null;
    let uid = null;
    let password = known?.password;
    let state;

    if (password) {
      // Known account — sign in with the stored password
      const r = await authPost('signInWithPassword', { email, password, returnSecureToken: true });
      if (r.ok) {
        ({ idToken, localId: uid } = r.data);
        state = 'existing';
      } else if (
        r.data?.error?.message?.includes('USER_NOT_FOUND') ||
        r.data?.error?.message?.includes('EMAIL_NOT_FOUND') ||
        r.data?.error?.message?.includes('INVALID_LOGIN_CREDENTIALS')
      ) {
        // Stale CSV row → recreate below. Emulator returns USER_NOT_FOUND/EMAIL_NOT_FOUND;
        // PRODUCTION returns the modern generic INVALID_LOGIN_CREDENTIALS (anti-enumeration)
        // for both no-such-account and wrong-password. If the account truly exists with a
        // different password, the signUp below returns EMAIL_EXISTS and we report that.
        password = null;
      } else {
        results.push({ accountId, state: `❌ sign-in failed: ${r.data?.error?.message ?? r.status}` });
        continue;
      }
    }

    if (!idToken) {
      password = password ?? generatePassword();
      const r = await authPost('signUp', { email, password, returnSecureToken: true });
      if (r.ok) {
        ({ idToken, localId: uid } = r.data);
        state = 'created';
      } else if (r.data?.error?.message?.includes('EMAIL_EXISTS')) {
        results.push({
          accountId,
          state: '❌ exists but password unknown (restore testers-credentials.csv or delete the auth user)',
        });
        continue;
      } else {
        results.push({ accountId, state: `❌ signUp failed: ${r.data?.error?.message ?? r.status}` });
        continue;
      }
    }

    // Profile — create only if missing (never clobber a tester's edits)
    const profileStatus = await getDoc(`users/${uid}`, idToken);
    if (profileStatus === 404) {
      await createDoc(`users/${uid}`, profileFields(displayName, handle), idToken);
      state += ' +profile';
    } else if (profileStatus !== 200) {
      results.push({ accountId, state: `❌ profile read → ${profileStatus} (rules deployed?)` });
      continue;
    }

    // Handle — create only if missing (rules allow create, not update)
    const handleStatus = await getDoc(`handles/${handle}`, idToken);
    if (handleStatus === 404) {
      await createDoc(`handles/${handle}`, { userId: { stringValue: uid } }, idToken);
      state += ' +handle';
    }

    csv.set(accountId, { accountId, email, password, uid, handle, displayName });
    results.push({ accountId, password, state: `✅ ${state}` });
  }

  saveCsv(csv);

  console.log(`${'ID'.padEnd(10)} ${'PASSWORD'.padEnd(18)} STATE`);
  for (const r of results) {
    console.log(`${r.accountId.padEnd(10)} ${(r.password ?? '—').padEnd(18)} ${r.state}`);
  }
  console.log(`\nCredentials written to ${path.basename(CSV_PATH)} (gitignored — distribute out-of-band).`);

  if (results.some((r) => r.state.startsWith('❌'))) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
