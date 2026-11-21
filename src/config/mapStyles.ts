import type { StyleSpecification } from '@maplibre/maplibre-react-native';

// Free, keyless vector tiles from OpenFreeMap (OpenMapTiles schema, OSM data).
// No API key and no billing. Attribution is required and comes from the
// source's TileJSON, shown by MapLibre's (i) button — keep `attribution` on.
// https://openfreemap.org
const OPENFREEMAP_TILES = 'https://tiles.openfreemap.org/planet';
const OPENFREEMAP_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

const LAND = '#1d1d2b';
const WATER = '#0e0e1a';
const LABEL = '#8a8a9a';

// Prototype parity: the map is a near-empty void — landmass, water, borders
// and place names only. Roads, transit, buildings and POIs are left out.
export const DARK_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'us-dark',
  sources: {
    openmaptiles: { type: 'vector', url: OPENFREEMAP_TILES },
  },
  glyphs: OPENFREEMAP_GLYPHS,
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': LAND } },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': WATER, 'fill-antialias': false },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      minzoom: 10,
      paint: { 'line-color': WATER, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 16, 3] },
    },
    {
      id: 'boundary-country',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['all', ['<=', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
      paint: { 'line-color': 'rgba(138,138,154,0.35)', 'line-width': 1 },
    },
    {
      id: 'water-name',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'water_name',
      minzoom: 11,
      layout: {
        'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
        'text-font': ['Noto Sans Italic'],
        'text-size': 11,
      },
      paint: { 'text-color': 'rgba(138,138,154,0.6)', 'text-halo-color': WATER, 'text-halo-width': 1 },
    },
    {
      id: 'place-name',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'suburb', 'quarter', 'neighbourhood']]],
      layout: {
        'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': [
          'match',
          ['get', 'class'],
          'city',
          15,
          'town',
          13,
          11,
        ],
        'text-max-width': 8,
      },
      paint: { 'text-color': LABEL, 'text-halo-color': LAND, 'text-halo-width': 1.2 },
    },
  ],
};
