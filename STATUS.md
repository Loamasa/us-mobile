# us-mobile — Status

> Current state only. Dated session history lives in `docs/CHANGELOG.md`; project gotchas in
> `.context/memory.md`; the Phase 3 plan in `docs/plans/2026-06-11-phase3-readiness-plan.md`.

## Last Updated
2026-10-24 — Expo SDK 58 migration on `felix/dev-setup`: React Native 0.88.0,
React 19.3, Maps 1.29.11, development-client build profile and CI prepared.
Clean-install audit: 8 affected package entries (5 high, 3 moderate).
Cloud APK creation is deferred until the user logs in and links EAS; native
marker/location behavior is not yet verified. Setup: `docs/development-setup.md`;
audit assessment: `docs/dependency-audit.md`. Three privacy rule regressions are
reproduced as known failing TODOs; application privacy fixes remain open.

### Previous product milestone
2026-06-12 (session wrap) — Phase 3 Steps 0–3 effectively done, all code-side work complete
and browser-verified. Billing decided: **Spark (free) for Phase 3**. My Spots editor gained
place search + find-yourself; chats friendless empty state fixed; distribution runbook at
`docs/tester-distribution.md`.

**Backend distribution prerequisites** (privacy findings also remain open):
1. `firebase login` (terminal) → then `firebase deploy --only firestore` finishes Step 2
2. Firebase console → Authentication → enable **Email/Password** provider
3. `node src/dev/provisionTesters.js --count 20` → real tester accounts (finishes Step 3)
4. Step 4: log in/link EAS, build the configured development APK, and verify the upgraded Maps module on a phone.

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
- [x] Step 2 — production backend wiring: `.firebaserc` → us-v1-ff6b3; friendRequests index
      fixed to `(status ASC, createdAt DESC)` + NEW chats `(type ASC, memberIds CONTAINS)`
      composite (getOrCreateGroupChat needs it in prod — emulator never enforces indexes);
      `EXPO_PUBLIC_USE_EMULATORS=false` override in `src/config/firebase.ts`. Verified: tsc
      clean, full verify suite green, browser boot + map render clean.
      **ONE ITEM OPEN: `firebase deploy --only firestore`** — run `firebase login` in a
      terminal first, then the deploy (any session can finish this in 2 minutes).
- [ ] Step 3 — **re-scoped: 20 fixed tester accounts** (user decision — no self-registration;
      testers get Account ID + password, can change display name in Settings; handles fixed).
      BUILT & browser-verified: `src/dev/provisionTesters.js` (REST-only, idempotent,
      rules-compliant — emulator run = prod-rules proof; CSV gitignored) + `app/(auth)/signin.tsx`
      (bare ID → `@us.test`, first-login → permissions → spots → map) + phone/OTP demoted to a
      dev-only link + `ensureDevUser` persistence-race fix. Empty-state audit DONE (chats
      friendless state now shows an explicit "Add Friend" CTA into the by-handle modal; map +
      spots empty states fine). Distribution runbook: `docs/tester-distribution.md`.
      REMAINING: prod provisioning run (needs the Step 2 deploy + Email/Password provider
      enabled in console).
- [ ] Step 4 — development pipeline PREPARED: Expo 58 + Maps 1.29.11, `expo-dev-client`,
      Maps/splash config plugins and `eas.json` internal Android development profile.
      `expo prebuild --platform android --no-install` passes. User deferred EAS login/build;
      run `eas init` after login, create/install APK, then validate native markers/location.
      Maps key restriction, background-task/OTA work and Settings version remain separate milestones.
- [ ] Step 5 — background location implementation + field test (needs the dev build)
- [ ] Step 6 — field readiness (Sentry, tester runbook, success criteria, privacy one-liner, CI)

## Open Items (non-blocking for Steps 1–3)

1. **Native Maps migration needs device validation** — 1.29.11 is installed, but a new
   development APK must be built and tested before declaring the old clipping bug resolved.
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
9. **Dependency audit remains open** — 8 affected entries (5 high, 3 moderate), covering
   three underlying advisories in Expo signing/Zod and Firebase CLI telemetry. Scoped
   security overrides and limitations are documented in `docs/dependency-audit.md`.
10. **Privacy regressions reproduced** — unauthorized self-granted friendship/location access,
    chat creator rewriting and gathering creator rewriting are known failing test TODOs.
    Those rules were not changed in the selected maintenance scope.

## Testing Methods

- **Browser (Expo web) is first-class for everything INCLUDING the map**: emulators + seed +
  `npx expo start` → `http://localhost:8081`. Real map screens run via `src/dev/fakeMaps.tsx`.
  Covers data/logic/UI — NOT react-native-maps native rendering.
- **Development client on the Pixel 7** for native UX — APK and device validation pending.
- `npm test` — 14 tests against the production map functions.
- `npm run check:emulators` — disposable seeded emulator run, actual projection/group pins,
  17 existing rule checks, Firebase SDK sign-in/read/listener and new negative rules checks.
  Three known privacy TODO failures are visible and do not block development CI.
- **Device-free verification harness** (run after seeding): `npm run verify` —
  `verifyProjection.js` (clustering read path) + `verifyGroupPins.js` (proximity-wins + resting
  pin) + `verifyRules.js` (17 security-rules guarantees as real users).

## How to Run

1. `npm run emulators` — Firebase emulators, **must be `--project demo-us-app`** (auth-user
   creation targets the emulator's default project)
2. `npm run seed` — Node-only seed via admin REST `:commit` (5 personas, chats, broadcasts)
3. `npm run web` for browser; `npm run start:dev` for the rebuilt development client.
4. `npm run typecheck` — must pass before committing
5. In-app: Settings → Developer → "Seed Test Data" / account switcher
6. **Tester accounts**: `node src/dev/provisionTesters.js --emulator --count 3` (or `--count 20`
   against prod once deployed) → credentials land in `testers-credentials.csv` (gitignored);
   sign in at the app's sign-in screen with the bare Account ID (e.g. `tester01`)

## Key Files

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root `<Stack>` (keeps `(tabs)` mounted under pushed routes) + dev auto-sign-in |
| `app/(tabs)/map.native.tsx` | Map screen — markers, clusters, group pins, broadcasts, cards, place-on-map flow |
| `app/(tabs)/chats.tsx` | Chats tab — chat list, Messenger-style composer, friend requests |
| `app/chat/[chatId].tsx` | Chat detail — messages, View-Map pill, DM presence |
| `app/(auth)/signin.tsx` | Tester sign-in (Account ID + password; phone/OTP behind its dev-only link) |
| `app/(auth)/…` | Onboarding carousel + phone/otp/profile/permissions/spots steps |
| `src/dev/provisionTesters.js` | Fixed tester-account provisioning (REST, idempotent, emulator/prod) |
| `app/settings/…` | Full-screen settings detail routes (account, privacy, developer) |
| `src/lib/firestore.ts` | All Firestore helpers (every `onSnapshot` has an error callback) |
| `src/config/firebase.ts` | Firebase config + emulator connection (`getEmulatorHost()` + web proxy helpers) |
| `src/features/map/groupPins.ts` | `buildGroupPins` — named-group pin reconciliation (proximity wins) |
| `src/features/broadcasts/…` | Broadcast/Gathering feature (useBroadcasts, marker, card, composer) |
| `src/features/spots/spotSchedule.ts` | Spot schedule logic (single source of truth; mirrored in `runSeed.js`) |
| `src/features/spots/searchPlace.ts` | Forward geocoding (native: expo-location; web: Nominatim) for the spots editor |
| `docs/tester-distribution.md` | Runbook: build + share the APK, hand out tester accounts |
| `src/dev/fakeMaps.tsx` | Web map shim — real map screens run in the browser |
| `src/dev/fixtures.json` | Seed fixtures (5 personas, chats, broadcasts, schedules) |
| `src/dev/runSeed.js` | Node-only emulator seed (admin REST `:commit`) |
| `src/dev/verify{Projection,GroupPins,Rules}.js` | Device-free verification harness |
| `firestore.rules` / `firestore.indexes.json` | Security rules (17 verified guarantees) + indexes |
| `firebase.json` | Emulators: auth 9099, firestore **8088**, UI 4000 |
