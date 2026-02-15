# Testing Strategy

## Unit Tests (Jest)

```bash
npx jest                    # run all
npx jest --watch            # watch mode
npx jest path/to/file       # single file
```

### Testing hooks

```tsx
import { renderHook, act } from '@testing-library/react-native';

test('useSignal returns active signal', () => {
  const { result } = renderHook(() => useSignal(mockUid));
  expect(result.current.isActive).toBe(true);
});
```

### Testing components

```tsx
import { render, fireEvent } from '@testing-library/react-native';

test('FriendCard shows name and signal', () => {
  const { getByText } = render(<FriendCard friend={mockFriend} onPress={jest.fn()} />);
  expect(getByText('Alice')).toBeTruthy();
});
```

### Mocking Firebase

```tsx
jest.mock('firebase/firestore', () => ({
  onSnapshot: jest.fn((ref, callback) => {
    callback({ data: () => mockData, exists: () => true });
    return jest.fn(); // unsubscribe
  }),
  doc: jest.fn(),
  collection: jest.fn(),
}));
```

## E2E Tests (Maestro)

Maestro is the simplest E2E option for Expo apps.

```yaml
# .maestro/auth-flow.yaml
appId: com.usmobile.app
---
- launchApp
- tapOn: "Sign In"
- inputText:
    id: "email-input"
    text: "test@example.com"
- inputText:
    id: "password-input"
    text: "testpass123"
- tapOn: "Submit"
- assertVisible: "Map"
```

Run: `maestro test .maestro/auth-flow.yaml`

## What to Test

| Layer          | What                              | Tool    |
|----------------|-----------------------------------|---------|
| Utils/helpers  | Pure functions (haversine, etc.)  | Jest    |
| Hooks          | State logic, subscriptions        | Jest    |
| Components     | Render output, interactions       | Jest    |
| Screens        | Navigation, integration           | Maestro |
| Auth flows     | Sign up, sign in, sign out        | Maestro |
