# us-mobile

Nonprofit location-based social app. Expo SDK 54 + Firebase + NativeWind v4 + Tailwind v3.

## Session Protocol
Read `STATUS.md` and `.context/memory.md` (project gotchas) at session start. Keep them current:
- Update STATUS.md after milestones, before commits, and on "wrap up". Dated history goes to `docs/CHANGELOG.md`, not STATUS.md.
- Update `.context/memory.md` when discovering gotchas — it is the single committed gotchas file (mirror collapsed 2026-06-11).
- Always tell the user when you update these files.
- **Commit automatically** when a milestone is done and verified (`npx tsc --noEmit` passes) — don't ask first. Conventional commits, directly on `main`. Don't push unless asked.

## Commands
- `npx expo start` / `npx expo start --clear` — dev server
- `npx tsc --noEmit` — type check (must pass before committing)
- `npm install --legacy-peer-deps` — always use this flag (React version conflicts)
- `firebase emulators:start --project demo-us-app` — local Firebase

## Code Style
- Feature-first folders: `src/features/{name}/`
- NativeWind `className` everywhere, no inline styles
- Firestore reads: always `onSnapshot`, never one-shot `get()`
- Types centralized in `src/types/index.ts`
- One default export per file, named same as file
- Hooks: `use*` prefix. Constants: `UPPER_SNAKE_CASE`

## Design System
- Colors: void=#0F1115, fog=#F2F4F6, signal=#2E5CFF, mint=#00E096, rose=#F472B6
- Dark mode only. Glass morphism (bg-glass + border-glass-border + rounded-2xl)
- Font: Inter

## Architecture
- Locations: top-level `locations/{userId}` with geohash for spatial queries
- Friends: `users/{uid}/friends/{friendId}` subcollection
- Handles: `handles/{handle}` lookup for uniqueness
- Spots: `users/{uid}/spots/{spotId}` subcollection
- Clustering: client-side Haversine, 100m threshold
- Ghost mode: delete location doc + stop watcher + set globalLocationSharing=false
- Signals: `users/{uid}.currentSignal` with TTL, client-side expiry check
