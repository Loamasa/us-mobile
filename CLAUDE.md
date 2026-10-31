# us-mobile

Nonprofit location-based social app. Expo SDK 58 + Firebase + NativeWind v4 + Tailwind v3.

## Session Protocol
Read `PLAN.md` (current milestone — build only what it needs), `STATUS.md` and `.context/memory.md` (project gotchas) at session start. Keep them current:
- Update STATUS.md after milestones, before commits, and on "wrap up". Dated history goes to `docs/CHANGELOG.md`, not STATUS.md.
- Update `.context/memory.md` when discovering gotchas — it is the single committed gotchas file (mirror collapsed 2026-06-11).
- Always tell the user when you update these files.
- Docs: short, plain words. One fact in one place — link, don't copy. Every command lives in README `## Commands`.
- Current branch: `fel/phase1`. Never pick branch names yourself. Leave changes uncommitted for review unless asked to commit. Never push unless told to.

## Commands
Full list: `README.md` → Commands. Most used:
- `npm ci` — install · `npm run typecheck` — must pass before commit · `npm test` — map regressions
- `npm run emulators` → `npm run seed` → `npm run web` — local app in browser
- `npm run check:emulators` — full emulator checks
- `npm run apk` — tester APK (test project)

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
