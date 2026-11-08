/**
 * Dev heartbeat for seeded personas. Since Wave 2 every surface treats a
 * >5-min-old location doc as stale (dimmed marker, no clustering, no chat
 * pills) — correct product behavior, but seed timestamps freeze at seed
 * time, so an interactive browser/device session watches alice/bob/charlie
 * decay 5 minutes after `npm run seed`. Run this to play the personas'
 * publishers:
 *
 *   node src/dev/freshenLocations.js           # freshen once
 *   node src/dev/freshenLocations.js --watch   # re-freshen every 60s (Ctrl+C to stop)
 *
 * verifyProjection.js / verifyGroupPins.js embed the same PATCH inline so
 * the scripted harness is self-contained.
 */

const EMULATOR_PROJECT_ID = 'us-felix-test-20261030';
const FIRESTORE_EMULATOR_PORT = 8088;
const BASE = `http://127.0.0.1:${FIRESTORE_EMULATOR_PORT}/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents`;
const HEADERS = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

async function listLocationIds() {
  const res = await fetch(`${BASE}/locations`, { headers: HEADERS });
  if (!res.ok) throw new Error(`LIST locations -> ${res.status}`);
  const j = await res.json();
  return (j.documents || []).map((d) => d.name.split('/').pop());
}

async function freshen(id) {
  const res = await fetch(
    `${BASE}/locations/${id}?updateMask.fieldPaths=updatedAt&currentDocument.exists=true`,
    {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({
        fields: { updatedAt: { timestampValue: new Date().toISOString() } },
      }),
    }
  );
  return res.ok;
}

async function pass() {
  const ids = await listLocationIds();
  for (const id of ids) {
    const ok = await freshen(id);
    console.log(`${ok ? '💓' : '❌'} locations/${id}`);
  }
  if (ids.length === 0) console.log('(no location docs — seed first)');
}

async function main() {
  const watch = process.argv.includes('--watch');
  await pass();
  if (watch) {
    console.log('— watching: re-freshening every 60s (Ctrl+C to stop) —');
    setInterval(() => pass().catch((e) => console.error(e.message)), 60_000);
  }
}

main().catch((e) => {
  console.error('freshenLocations failed:', e.message);
  process.exit(1);
});
