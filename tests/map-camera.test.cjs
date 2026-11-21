// Camera + zone geometry for the native MapLibre map (src/features/map/mapCamera.ts).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const m = require('../.expo/test-build/features/map/mapCamera.js');

const MALMO = { latitude: 55.6049, longitude: 13.0038 };
const PHONE = { width: 390, height: 700 };
const EARTH_RADIUS_M = 6_371_008.8;

// Independent reference: haversine distance in meters.
const haversine = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

test('zoomForRegion: a 0.02° region on a phone is a neighbourhood zoom (MapLibre 512px tiles)', () => {
  const z = m.zoomForRegion({ ...MALMO, latitudeDelta: 0.02, longitudeDelta: 0.02 }, PHONE);
  // Width is the tight axis: log2(390 / (512 * 0.02 / 360)) ≈ 13.74
  assert.ok(Math.abs(z - Math.log2(390 / ((512 * 0.02) / 360))) < 1e-9, `zoom ${z}`);
});

test('zoomForRegion: halving the deltas zooms in by exactly one level', () => {
  const a = m.zoomForRegion({ ...MALMO, latitudeDelta: 0.02, longitudeDelta: 0.02 }, PHONE);
  const b = m.zoomForRegion({ ...MALMO, latitudeDelta: 0.01, longitudeDelta: 0.01 }, PHONE);
  assert.ok(Math.abs(b - a - 1) < 0.01, `${a} → ${b}`);
});

test('zoomForRegion: clamps, and an unmeasured view gives zoom 0', () => {
  assert.equal(m.zoomForRegion({ ...MALMO, latitudeDelta: 1e-9, longitudeDelta: 1e-9 }, PHONE), 20);
  assert.equal(m.zoomForRegion({ ...MALMO, latitudeDelta: 0.02, longitudeDelta: 0.02 }, { width: 0, height: 0 }), 0);
});

test('circleRing: every point sits radius meters from the center, ring is closed', () => {
  for (const radius of [50, 150, 1000]) {
    const ring = m.circleRing(MALMO, radius);
    assert.equal(ring.length, 65);
    assert.deepEqual(ring[0], ring[ring.length - 1]);
    for (const [longitude, latitude] of ring) {
      const d = haversine(MALMO, { latitude, longitude });
      assert.ok(Math.abs(d - radius) < radius * 1e-6 + 1e-6, `radius ${radius}: point at ${d} m`);
    }
  }
});

test('circleRing: first point is due north (GeoJSON [lng, lat] order)', () => {
  const [[lng, lat]] = m.circleRing(MALMO, 100);
  assert.ok(Math.abs(lng - MALMO.longitude) < 1e-9);
  assert.ok(lat > MALMO.latitude);
});
