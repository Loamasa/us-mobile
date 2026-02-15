# Saved Spots

## Data Model

```
users/{uid}/spots/{spotId} = {
  name: string,
  latitude: number,
  longitude: number,
  geohash: string,
  category: 'hangout' | 'food' | 'study' | 'custom',
  emoji: string,         // visual marker
  createdAt: Timestamp,
}
```

## Rendering Spots on Map

```tsx
function SpotMarkers({ spots }: { spots: Spot[] }) {
  return (
    <>
      {spots.map((spot) => (
        <Marker
          key={spot.id}
          coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
          title={spot.name}
        >
          <View className="bg-glass border border-glass-border rounded-full w-10 h-10 items-center justify-center">
            <Text className="text-lg">{spot.emoji}</Text>
          </View>
        </Marker>
      ))}
    </>
  );
}
```

## Saving a Spot

```tsx
async function saveSpot(uid: string, spot: Omit<Spot, 'id' | 'createdAt'>) {
  const geohash = geohashForLocation([spot.latitude, spot.longitude]);
  await addDoc(collection(db, 'users', uid, 'spots'), {
    ...spot,
    geohash,
    createdAt: serverTimestamp(),
  });
}
```

## Watching Spots (real-time)

```tsx
function useSpots(uid: string) {
  const [spots, setSpots] = useState<Spot[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'spots'),
      (snap) => setSpots(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Spot)))
    );
    return unsub;
  }, [uid]);

  return spots;
}
```
