/**
 * Checks that the Google Maps key in app.json cannot call a metered Google API.
 *
 *   npm run check:maps-key
 *
 * Sends ONE Geocoding request with the key (the key is never printed). Once the
 * key is restricted (docs/maps-key-hardening.md), Google must refuse it:
 *
 *   RESTRICTED    denied for a reason other than billing        → exit 0
 *   BILLING OFF   the key's project has no billing linked, so
 *                 nothing can be charged; the restriction itself
 *                 is not proven yet — re-run after linking billing → exit 2
 *   UNRESTRICTED  the request went through: the key reaches a
 *                 metered API                                    → exit 1
 *
 * An invalid key, network errors and unexpected statuses exit 1. On an unrestricted key with
 * billing on, the probe uses one Geocoding request (inside the free tier).
 */
const path = require('path');

const appJson = require(path.join(__dirname, '..', '..', 'app.json'));
const plugin = appJson.expo.plugins.find(
  (p) => Array.isArray(p) && p[0] === 'react-native-maps',
);
const key = plugin && plugin[1] && plugin[1].androidGoogleMapsApiKey;

if (!key) {
  console.error('❌ No androidGoogleMapsApiKey in the react-native-maps plugin config (app.json).');
  process.exit(1);
}

const redact = (text) => String(text || '').split(key).join('<key>');

async function main() {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Berlin&key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  const body = await res.json();
  const message = redact(body.error_message);

  if (body.status === 'OK' || body.status === 'ZERO_RESULTS') {
    console.error('❌ UNRESTRICTED — the Maps key can call the Geocoding API (metered).');
    console.error('   Restrict it: docs/maps-key-hardening.md, step 3.');
    process.exit(1);
  }
  if (body.status === 'REQUEST_DENIED' && /invalid/i.test(message)) {
    // Not a restriction: Google doesn't know this key (typo, deleted, rotated).
    console.error('❌ INVALID KEY — Google does not recognise the key in app.json.');
    console.error(`   ${message}`);
    process.exit(1);
  }
  if (body.status === 'REQUEST_DENIED' && /billing/i.test(message)) {
    console.log('⚠️  BILLING OFF — the key\'s project has no billing, so nothing can be charged.');
    console.log('   The restriction is not proven yet; re-run after linking billing (step 5).');
    process.exit(2);
  }
  if (body.status === 'REQUEST_DENIED') {
    console.log('✅ RESTRICTED — Google refused the key for a metered API.');
    console.log(`   ${message}`);
    process.exit(0);
  }
  console.error(`❌ Unexpected response: HTTP ${res.status}, status ${body.status}. ${message}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`❌ Request failed: ${redact(err && err.message)}`);
  process.exit(1);
});
