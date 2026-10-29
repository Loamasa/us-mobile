# us-mobile

Nonprofit location-based social app. Expo SDK 58 + Firebase + NativeWind v4 + Tailwind v3.

## Session Protocol
Read `STATUS.md` and `.context/memory.md` (project gotchas) at session start. Keep them current:
- Update STATUS.md after milestones, before commits, and on "wrap up". Dated history goes to `docs/CHANGELOG.md`, not STATUS.md.
- Update `.context/memory.md` when discovering gotchas — it is the single committed gotchas file (mirror collapsed 2026-06-11).
- Always tell the user when you update these files.
- Work on `felix/` branches (current setup branch: `felix/dev-setup`). Leave changes uncommitted for review unless the user asks for a commit; never push unless asked.

## Commands
- Windows: open `Dev-Terminal.cmd` to select the project-local Node 22 and Java 21 toolchain. See `docs/development-setup.md`.
- `npx expo start` / `npx expo start --clear` — dev server
- `npm test` — production map function regressions; `npm run check:emulators` — seeded integration/rules/SDK checks (three known privacy TODOs)
- `npx tsc --noEmit` — type check (must pass before committing)
- `npm ci` — reproducible install with normal peer dependency validation; security overrides are documented in `docs/development-setup.md`
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
