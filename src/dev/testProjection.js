const { geohashForLocation } = require('geofire-common');

// Haversine distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateCentroid(points) {
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}

const MAP_DEFAULTS = {
  clusterRadiusMeters: 100,
};

function runProjection(friendLocations) {
  const entities = [];
  const processed = new Set();
  const entries = Object.entries(friendLocations);

  console.log(
    'projection input userIds:',
    entries.map(([id, d]) => `${id}@(${d.location.lat.toFixed(4)},${d.location.lng.toFixed(4)})`)
  );

  if (entries.length === 0) return entities;

  // Step 1: Find clusters (2+ friends within radius)
  for (let i = 0; i < entries.length; i++) {
    const [idA, dataA] = entries[i];
    if (processed.has(idA)) continue;

    const clusterMembers = [idA];

    for (let j = i + 1; j < entries.length; j++) {
      const [idB, dataB] = entries[j];
      if (processed.has(idB)) continue;

      const dist = haversineDistance(
        dataA.location.lat,
        dataA.location.lng,
        dataB.location.lat,
        dataB.location.lng
      );

      console.log(`Comparing ${idA} and ${idB}: distance = ${dist.toFixed(2)}m`);

      if (dist <= MAP_DEFAULTS.clusterRadiusMeters) {
        clusterMembers.push(idB);
      }
    }

    if (clusterMembers.length >= 2) {
      console.log(`Found cluster for ${idA}: members = ${clusterMembers.join(', ')}`);
      // Create cluster entity
      const friends = clusterMembers.map((id) => {
        const data = friendLocations[id];
        return {
          userId: id,
          displayName: data.profile.displayName,
          avatarUrl: data.profile.avatarUrl,
          location: { lat: data.location.lat, lng: data.location.lng },
          signal: data.profile.currentSignal,
          isOnline: true,
          spot: data.location.spot
            ? { name: data.location.spot.name, emoji: data.location.spot.emoji }
            : null,
        };
      });

      const centroid = calculateCentroid(
        clusterMembers.map((id) => ({
          lat: friendLocations[id].location.lat,
          lng: friendLocations[id].location.lng,
        }))
      );

      entities.push({
        id: `cluster-${clusterMembers.sort().join('-')}`,
        type: 'CLUSTER',
        location: centroid,
        friends,
      });

      clusterMembers.forEach((id) => processed.add(id));
    }
  }

  // Step 2: Individual friends (not in any cluster)
  for (const [userId, data] of entries) {
    if (processed.has(userId)) continue;

    console.log(`Friend ${userId} is an individual marker`);
    const signal = data.profile.currentSignal;
    const isExpired = false; // assume not expired for mock test

    entities.push({
      id: `friend-${userId}`,
      type: 'FRIEND',
      location: { lat: data.location.lat, lng: data.location.lng },
      friends: [
        {
          userId,
          displayName: data.profile.displayName,
          avatarUrl: data.profile.avatarUrl,
          location: { lat: data.location.lat, lng: data.location.lng },
          signal: !isExpired ? signal : null,
          isOnline: true,
          spot: data.location.spot
            ? { name: data.location.spot.name, emoji: data.location.spot.emoji }
            : null,
        },
      ],
      signal:
        !isExpired && signal
          ? { emoji: signal.emoji, text: signal.text }
          : undefined,
    });
  }

  console.log('projection output entities:', JSON.stringify(entities, null, 2));
  return entities;
}

const mockFriendLocations = {
  alice: {
    location: { lat: 55.5978, lng: 13.0076, spot: { name: 'Home', emoji: '🏠' } },
    profile: { displayName: 'Alice Svensson', avatarUrl: null, currentSignal: null }
  },
  bob: {
    location: { lat: 55.5979, lng: 13.0077, spot: { name: 'Home', emoji: '🏠' } },
    profile: { displayName: 'Bob Nilsson', avatarUrl: null, currentSignal: null }
  },
  charlie: {
    location: { lat: 55.5890, lng: 13.0010, spot: { name: 'Hangout', emoji: '🛹' } },
    profile: { displayName: 'Charlie Öberg', avatarUrl: null, currentSignal: null }
  }
};

runProjection(mockFriendLocations);
