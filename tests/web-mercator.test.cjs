// Web Mercator math behind the dev web map shim (src/dev/fakeMaps.tsx).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const m = require('../.expo/test-build/dev/webMercator.js');

const MALMO = { latitude: 55.6049, longitude: 13.0038 };
const region = (delta = 0.02, center = MALMO) => ({
  ...center,
  latitudeDelta: delta,
  longitudeDelta: delta,
});
const PHONE = { width: 390, height: 700 };
const close = (actual, expected, tolerance, label) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} not within ${tolerance} of ${expected}`
  );

// Independent reference: the slippy-map tile formula from the OSM wiki.
const osmTile = (lat, lon, z) => {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lon + 180) / 360) * n),
    y: Math.floor(((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * n),
  };
};

test('world coordinates round-trip and match the OSM tile formula', () => {
  close(m.worldXToLng(m.lngToWorldX(MALMO.longitude)), MALMO.longitude, 1e-9, 'lng');
  close(m.worldYToLat(m.latToWorldY(MALMO.latitude)), MALMO.latitude, 1e-9, 'lat');
  for (const z of [3, 12, 17]) {
    const n = 2 ** z;
    assert.deepEqual(
      {
        x: Math.floor(m.lngToWorldX(MALMO.longitude) * n),
        y: Math.floor(m.latToWorldY(MALMO.latitude) * n),
      },
      osmTile(MALMO.latitude, MALMO.longitude, z),
      `tile at z${z}`
    );
  }
});

test('the whole world in one 256px tile is zoom 0', () => {
  const world = { latitude: 0, longitude: 0, latitudeDelta: 170.1, longitudeDelta: 360 };
  close(m.zoomForRegion(world, { width: 256, height: 256 }), 0, 1e-6, 'zoom');
});

test('the tighter axis decides the zoom, so both requested deltas stay visible', () => {
  for (const size of [PHONE, { width: 1200, height: 500 }, { width: 300, height: 300 }]) {
    const requested = region(0.02);
    const visible = m.visibleRegion(requested, size);
    assert.ok(visible.latitudeDelta >= requested.latitudeDelta - 1e-9, 'lat delta fits');
    assert.ok(visible.longitudeDelta >= requested.longitudeDelta - 1e-9, 'lng delta fits');
  }
});

test('the region center projects to the viewport center and unproject inverts project', () => {
  const r = region(0.05);
  assert.deepEqual(m.project(r, PHONE, MALMO), { x: PHONE.width / 2, y: PHONE.height / 2 });
  const other = { latitude: 55.611, longitude: 12.99 };
  const back = m.unproject(r, PHONE, m.project(r, PHONE, other));
  close(back.latitude, other.latitude, 1e-9, 'lat');
  close(back.longitude, other.longitude, 1e-9, 'lng');
  // North is up, east is right.
  const p = m.project(r, PHONE, other);
  assert.ok(p.y < PHONE.height / 2 && p.x < PHONE.width / 2, 'north-west of center');
});

test('meters per pixel matches the standard 156543 m/px at zoom 0 and scales markers', () => {
  close(m.metersPerPixel(0, 0), 156543.03, 0.01, 'equator z0');
  const r = region(0.01);
  const zoom = m.zoomForRegion(r, PHONE);
  // ~100 m north of the center, by the meridian's 111,320 m per degree.
  const north = { latitude: MALMO.latitude + 100 / 111_320, longitude: MALMO.longitude };
  const dy = PHONE.height / 2 - m.project(r, PHONE, north).y;
  close(dy, 100 / m.metersPerPixel(MALMO.latitude, zoom), 0.5, 'px for 100 m');
});

test('panning keeps the dragged point under the cursor without changing zoom', () => {
  const r = region(0.02);
  const grabbed = { x: 120, y: 500 };
  const coord = m.unproject(r, PHONE, grabbed);
  const panned = m.panRegion(r, PHONE, 40, -90);
  const now = m.project(panned, PHONE, coord);
  close(now.x, grabbed.x + 40, 1e-6, 'x');
  close(now.y, grabbed.y - 90, 1e-6, 'y');
  close(m.zoomForRegion(panned, PHONE), m.zoomForRegion(r, PHONE), 1e-6, 'zoom');
});

test('panning across the antimeridian wraps longitude into -180..180', () => {
  const r = { latitude: 0, longitude: 179.9, latitudeDelta: 1, longitudeDelta: 1 };
  const panned = m.panRegion(r, PHONE, -400, 0);
  assert.ok(panned.longitude >= -180 && panned.longitude < -179, `got ${panned.longitude}`);
});

test('visible tiles cover the viewport with no gaps or overlaps', () => {
  for (const delta of [0.003, 0.02, 0.3]) {
    const tiles = m.visibleTiles(region(delta), PHONE);
    assert.ok(tiles.length > 0, 'some tiles');
    const z = tiles[0].z;
    assert.ok(tiles.every((t) => t.z === z), 'one zoom level');
    const rows = new Map();
    for (const t of tiles) rows.set(t.top, [...(rows.get(t.top) ?? []), t]);
    const tops = [...rows.keys()].sort((a, b) => a - b);
    assert.ok(tops[0] <= 0, 'covers the top edge');
    for (let i = 0; i < tops.length; i++) {
      const row = rows.get(tops[i]).sort((a, b) => a.left - b.left);
      assert.ok(row[0].left <= 0, 'covers the left edge');
      const last = row[row.length - 1];
      assert.ok(last.left + last.width >= PHONE.width, 'covers the right edge');
      for (let j = 1; j < row.length; j++) {
        assert.equal(row[j].left, row[j - 1].left + row[j - 1].width, 'no horizontal gap');
      }
      if (i > 0) {
        const above = rows.get(tops[i - 1])[0];
        assert.equal(tops[i], above.top + above.height, 'no vertical gap');
      }
    }
    const bottom = rows.get(tops[tops.length - 1])[0];
    assert.ok(bottom.top + bottom.height >= PHONE.height, 'covers the bottom edge');
  }
});

test('tiles beyond the poles are skipped and x wraps at the antimeridian', () => {
  const tiles = m.visibleTiles(
    { latitude: 0, longitude: 179.99, latitudeDelta: 200, longitudeDelta: 500 },
    { width: 1024, height: 1024 }
  );
  const n = 2 ** tiles[0].z;
  assert.ok(tiles.every((t) => t.y >= 0 && t.y < n), 'y in range');
  assert.ok(tiles.every((t) => t.x >= 0 && t.x < n), 'x wrapped');
  assert.equal(new Set(tiles.map((t) => t.key)).size, tiles.length, 'keys unique when the world repeats');
});

test('tile keys stay stable while panning (no remount per frame)', () => {
  const before = m.visibleTiles(region(0.02), PHONE).map((t) => t.key);
  const after = m.visibleTiles(m.panRegion(region(0.02), PHONE, 7, 3), PHONE).map((t) => t.key);
  assert.ok(before.filter((k) => after.includes(k)).length >= before.length - 4, 'most tiles kept');
});

test('tile URL templates are filled', () => {
  assert.equal(
    m.tileUrl('https://tile.example.org/{z}/{x}/{y}.png', { z: 12, x: 2195, y: 1281 }),
    'https://tile.example.org/12/2195/1281.png'
  );
});
