# us-mobile — Status

> Current state only. Dated session history lives in `docs/CHANGELOG.md`; project gotchas in
> `.context/memory.md`; the Phase 3 plan in `docs/plans/2026-06-11-phase3-readiness-plan.md`.

## Last Updated
2026-06-11 — Phase 3 (Trusted-Tester Release) in progress: Step 0 closed-with-exception,
Step 1 cleanup done, Step 2 backend wiring in progress.

## Where We Are — Phase 3 (Android, trusted testers)

Decisions locked: interim **email/password** auth, **Android only**, **EAS internal
distribution**, **background location IN scope** (it's the product — needs the dev build).

- [x] **Step 0 — full device pass** (5 rounds, Pixel 7 + Expo Go): every flow functionally
      confirmed on device (map data, chats, composer, friend accept, broadcast create).
      **One exception → moved to Step 4**: marker bitmaps clip — root-caused as a
      **library-level bug** (react-native-maps 1.20.1 + Android New Architecture,
      rnm#5877/#5655; no JS workaround exists, all were disproved on device). Fix = 1.27.x
      upgrade, which crashes Expo Go → lands with the dev build.
- [x] Step 1 — cleanup pass (Antigravity removed, STATUS diet → `docs/CHANGELOG.md`,
      memory mirror collapsed into `.context/memory.md`, skill fixes, npm scripts)
- [ ] Step 2 — production backend wiring (`.firebaserc`, friendRequests index fix,
      `firebase deploy --only firestore`, `EXPO_PUBLIC_USE_EMULATORS` override) — **in progress**
- [ ] Step 3 — interim email/password auth + prod admin/seed tooling + empty-state audit
      (**gated on the Firebase billing-plan check-in with the user**)
- [ ] Step 4 — EAS pipeline. **First item: react-native-maps 1.20.1 → 1.27.x** (closes Step 0's
      marker box; device testing moves to the dev client from here). Then `eas init`/`eas.json`,
      `expo-updates` + `expo-task-manager` in build #1, Maps key restriction via keystore SHA-1,
      version in Settings.
- [ ] Step 5 — background location implementation + field test (needs the dev build)
- [ ] Step 6 — field readiness (Sentry, tester runbook, success criteria, privacy one-liner, CI)

## Open Items (non-blocking for Steps 1–3)

1. **Markers clip in Expo Go** — library bug, fix scheduled Step 4 (see above). Judge marker
   rendering by the browser shim until then, never by Expo Go.
2. **Google Maps Android key in `app.json` is unrestricted** — restrict to package + SHA-1 in
   Step 4 (needs the EAS keystore).
3. **`currentSignal` has no setter UI** (intentional, since the Gathering redesign) — badges/HUD
   still display signals; fold the concept into gatherings or re-add a setter later.
4. **`allowFriendRequests` is client-side only** — rules accept request docs regardless of the
   recipient's toggle. Fine for trusted testers; rules `get()` before public release.
5. **No location-doc TTL** — cold-start cleanup handles reopen; a killed-forever app leaves the
   doc. Freshness check or TTL policy before public release.
6. **Expo Go two-phone testing**: both phones auto-sign-in as `dev-user` — phone B must switch
   personas (Settings → Developer → Switch Account, e.g. alice).
7. Minor: `profile.tsx` writes `avatarUrl: ''` (type says `string | null`); auth spots step
   swallows save errors; dev fixture passwords ship in the JS bundle; inline-style drift in
   `app/(tabs)/chats.tsx` (compose modal + header icons should be NativeWind classes).
8. **Tutorial overlay chain** — deferred to post-user-testing backlog (4 of 8 prototype
   tutorials target MVP features; ~1 session if built).

## Testing Methods

- **Browser (Expo web) is first-class for everything INCLUDING the map**: emulators + seed +
  `npx expo start` → `http://localhost:8081`. Real map screens run via `src/dev/fakeMaps.tsx`.
  Covers data/logic/UI — NOT react-native-maps native rendering.
- **Expo Go on the Pixel 7** for native UX — markers clip there until Step 4 (known, ignore).
- **Device-free verification harness** (run after seeding): `npm run verify` —
  `verifyProjection.js` (clustering read path) + `verifyGroupPins.js` (proximity-wins + resting
  pin) + `verifyRules.js` (17 security-rules guarantees as real users).

## How to Run

1. `npm run emulators` — Firebase emulators, **must be `--project demo-us-app`** (auth-user
   creation targets the emulator's default project)
2. `npm run seed` — Node-only seed via admin REST `:commit` (5 personas, chats, broadcasts)
3. `npx expo start --clear` — then Expo Go (scan QR) or browser at `localhost:8081`
4. `npm run typecheck` — must pass before committing
5. In-app: Settings → Developer → "Seed Test Data" / account switcher

## Key Files

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root `<Stack>` (keeps `(tabs)` mounted under pushed routes) + dev auto-sign-in |
| `app/(tabs)/map.native.tsx` | Map screen — markers, clusters, group pins, broadcasts, cards, place-on-map flow |
| `app/(tabs)/chats.tsx` | Chats tab — chat list, Messenger-style composer, friend requests |
| `app/chat/[chatId].tsx` | Chat detail — messages, View-Map pill, DM presence |
| `app/(auth)/…` | Onboarding carousel + phone/otp/profile/permissions/spots steps |
| `app/settings/…` | Full-screen settings detail routes (account, privacy, developer) |
| `src/lib/firestore.ts` | All Firestore helpers (every `onSnapshot` has an error callback) |
| `src/config/firebase.ts` | Firebase config + emulator connection (`getEmulatorHost()` + web proxy helpers) |
| `src/features/map/groupPins.ts` | `buildGroupPins` — named-group pin reconciliation (proximity wins) |
| `src/features/broadcasts/…` | Broadcast/Gathering feature (useBroadcasts, marker, card, composer) |
| `src/features/spots/spotSchedule.ts` | Spot schedule logic (single source of truth; mirrored in `runSeed.js`) |
| `src/dev/fakeMaps.tsx` | Web map shim — real map screens run in the browser |
| `src/dev/fixtures.json` | Seed fixtures (5 personas, chats, broadcasts, schedules) |
| `src/dev/runSeed.js` | Node-only emulator seed (admin REST `:commit`) |
| `src/dev/verify{Projection,GroupPins,Rules}.js` | Device-free verification harness |
| `firestore.rules` / `firestore.indexes.json` | Security rules (17 verified guarantees) + indexes |
| `firebase.json` | Emulators: auth 9099, firestore **8088**, UI 4000 |
