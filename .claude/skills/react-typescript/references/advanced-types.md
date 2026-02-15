# Advanced TypeScript Patterns

## Discriminated Unions for State

```tsx
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function render(state: AsyncState<User[]>) {
  switch (state.status) {
    case 'loading': return <Spinner />;
    case 'error': return <ErrorView error={state.error} />;
    case 'success': return <UserList users={state.data} />;
    default: return null;
  }
}
```

## Generic Component Props

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function GenericList<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return <>{items.map((item, i) => (
    <View key={keyExtractor(item)}>{renderItem(item, i)}</View>
  ))}</>;
}
```

## Firestore Converter

```tsx
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

function createConverter<T extends DocumentData>() {
  return {
    toFirestore: (data: T) => data,
    fromFirestore: (snap: QueryDocumentSnapshot): T => snap.data() as T,
  };
}

const userConverter = createConverter<User>();
const userRef = doc(db, 'users', uid).withConverter(userConverter);
```

## Utility Types in Practice

```tsx
type UserSummary = Pick<User, 'uid' | 'displayName' | 'photoURL'>;
type UserUpdate = Partial<Omit<User, 'uid' | 'createdAt'>>;
type FriendStatusMap = Record<string, 'pending' | 'accepted' | 'blocked'>;
```

## Type Guards

```tsx
function isUserLocation(data: unknown): data is UserLocation {
  return (
    typeof data === 'object' && data !== null &&
    'latitude' in data && 'longitude' in data &&
    typeof (data as UserLocation).latitude === 'number'
  );
}
```

## Exhaustive Switch

```tsx
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

function handleSignal(signal: Signal['type']) {
  switch (signal) {
    case 'wave': return handleWave();
    case 'ping': return handlePing();
    default: return assertNever(signal);
  }
}
```
