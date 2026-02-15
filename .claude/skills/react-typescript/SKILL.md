---
name: react-typescript
description: React + TypeScript component development patterns for this project. Use when creating or modifying React components, hooks, types, or state management. Covers proper typing, component patterns, performance, and project conventions (NativeWind className, feature-first folders, one default export per file).
---

# React + TypeScript

## Project Conventions

- Feature-first folders: `src/features/{name}/`
- NativeWind `className` everywhere, no inline styles
- One default export per file, named same as file
- Hooks: `use*` prefix. Constants: `UPPER_SNAKE_CASE`
- Types centralized in `src/types/index.ts`
- Dark mode only. Colors: void=#0F1115, fog=#F2F4F6, signal=#2E5CFF, mint=#00E096, rose=#F472B6

## Component Patterns

### Typing props

```tsx
// Props interface, not type alias
interface UserCardProps {
  user: User;
  onPress: (uid: string) => void;
  variant?: 'compact' | 'full';
}

export default function UserCard({ user, onPress, variant = 'full' }: UserCardProps) {
  // ...
}
```

### Children typing

```tsx
interface LayoutProps {
  children: React.ReactNode; // not ReactElement
}
```

### Event handlers

```tsx
// Name handler props on*, handler functions handle*
interface Props {
  onSignalSend: (signal: Signal) => void;
}

function SignalPicker({ onSignalSend }: Props) {
  const handlePress = (s: Signal) => onSignalSend(s);
}
```

## Hooks

### Custom hook pattern

```tsx
function useLocationSharing(uid: string) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'locations', uid), (snap) => {
      setLocation(snap.data() as UserLocation);
    }, setError);
    return unsub;
  }, [uid]);

  return { location, error } as const;
}
```

### Rules
- Return cleanup functions from useEffect
- Deps arrays must be complete, no lint suppressions
- Extract shared logic into `src/hooks/use*.ts`
- Avoid useEffect for derived state; use useMemo

## Performance

- `React.memo` only on components that re-render with same props frequently (list items)
- `useCallback` for functions passed as props to memoized children
- `useMemo` for expensive computations, not simple references
- Avoid anonymous objects/arrays in JSX props (new references each render)

## Anti-Patterns

- `any` -- use `unknown` and narrow, or define proper types
- Index signatures when a union or mapped type works
- `as` assertions -- prefer type guards
- Barrel files (`index.ts` re-exports) -- break tree-shaking

## Detailed Patterns

For advanced typing (generics, discriminated unions, utility types), see `references/advanced-types.md`.
