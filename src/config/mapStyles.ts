// Prototype parity: the map is a near-empty void — landmass, water, and place
// names only. Roads (incl. route shields), transit, and POIs are all hidden.
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d2b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d2b' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e1a' }] },
];
