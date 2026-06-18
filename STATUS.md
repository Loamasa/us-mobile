# us-mobile — Status

> Current state only. Dated session history lives in `docs/CHANGELOG.md`; project gotchas in
> `.context/memory.md`; the Phase 3 plan in `docs/plans/2026-06-11-phase3-readiness-plan.md`.
> **Active finish plan (Steps 4–6 → multi-user test): `docs/plans/2026-06-18-phase3-finish-plan.md`.**

## Last Updated
2026-06-14 (Steps 2 & 3 DONE + Step 4 code-side done) — **Production is live**: `firebase
deploy --only firestore` shipped the rules + indexes (Step 2 ✅), Email/Password provider
enabled in the console (Step 3), and **20 tester accounts provisioned in prod**
(`tester01`…`tester20`, creds in gitignored `testers-credentials.csv`) — Step 3 ✅. En
route, fixed `provisionTesters.js` to treat prod's `INVALID_LOGIN_CREDENTIALS` as
recreate-needed (emulator returns `USER_NOT_FOUND`; prod returns the generic error), which
had stranded tester01–03 on a first attempt. Audited (5-agent workflow): tester accounts
are fully disjoint from the debug/dev system (dev = `@test.dev` emulator-only personas;
testers = `@us.test` prod) — no debug routine can clobber or sign in as a tester.
Step 4 code-side still done: react-native-maps **1.27.2** (pinned + `expo.install.exclude`),
`eas.json`, `expo-dev-client`/`expo-updates`/`expo-task-manager`, app.json
`runtimeVersion: fingerprint` + `updates`, `.npmrc`. **Marker fix still UNCONFIRMED**
([#5877](https://github.com/react-native-maps/react-native-maps/issues/5877) open) — validate on the dev build.

**EAS project linked (2026-06-14)**: `eas login` ✅ (as lomasa) + `eas init` ✅ → project
**`@lomasas-team/us-mobile`** (id `b9ed9b69-64fc-4c03-89b8-e14a3ee44e9d`); app.json now has
`owner`, `extra.eas.projectId`, and `updates.url`. **Android permissions hardened**: `eas
init`'s config sync had injected duplicate `android.permission.*` entries + `RECORD_AUDIO`
(microphone); removed the dups and disabled the mic at BOTH contributing plugins —
expo-camera (`recordAudioAndroid:false`) and expo-image-picker (`microphonePermission:false`,
which also manifest-blocks RECORD_AUDIO). Verified via `expo config --type introspect`:
resolved perms = FINE/COARSE/BACKGROUND_LOCATION + CAMERA, no RECORD_AUDIO. (No
`google-services.json` needed — app uses the Firebase JS SDK, not @react-native-firebase.)

**Only remaining gate — the build itself (account-gated)**: `eas build --platform android
--profile development` (~15 min on EAS servers, uses build quota) → side-load the dev-client
APK on the Pixel 7 → **device-validate the markers on 1.27.2** (the actual test of Task A).
Maps-key restriction (Open Item #2) needs the keystore SHA-1 from `eas credentials` after
build #1.

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
      **DONE 2026-06-14: `firebase deploy --only firestore` shipped to prod** (rules compiled +
      released, indexes deployed) — Step 2 complete.
- [x] Step 3 — **re-scoped: 20 fixed tester accounts** (user decision — no self-registration;
      testers get Account ID + password, can change display name in Settings; handles fixed).
      `src/dev/provisionTesters.js` (REST-only, idempotent, rules-compliant; CSV gitignored) +
      `app/(auth)/signin.tsx` (bare ID → `@us.test`, first-login → permissions → spots → map) +
      phone/OTP demoted to a dev-only link + `ensureDevUser` persistence-race fix. Empty-state
      audit DONE. Runbook: `docs/tester-distribution.md`. **DONE 2026-06-14: Email/Password
      enabled in console + 20 testers provisioned in prod** (`tester01`…`tester20`; creds in
      gitignored `testers-credentials.csv`). Provisioner fixed to handle prod's
      `INVALID_LOGIN_CREDENTIALS`. Tester namespace audited as disjoint from the dev/debug
      account system — no debug routine can touch it.
- [~] Step 4 — EAS pipeline. **Code-side DONE (2026-06-14)**: react-native-maps 1.20.1 →
      **1.27.2** (pinned + `expo.install.exclude` guard); NEW `eas.json`
      (development/preview/production); `expo-dev-client` + `expo-updates` + `expo-task-manager`
      installed; app.json `runtimeVersion: { policy: fingerprint }` + `updates`; NEW `.npmrc`
      (`legacy-peer-deps=true`). tsc clean, expo-doctor 17/18 (rnm excluded; lone failure is
      pre-existing patch drift). **The marker fix is a CANDIDATE, not confirmed** ([#5877](https://github.com/react-native-maps/react-native-maps/issues/5877)
      still open) — must be device-validated on the dev build; fallbacks noted in CHANGELOG.
      REMAINING (account-gated): `eas login`/`eas init`/`eas update:configure`/`eas build` →
      device-validate markers; `google-services.json` as an EAS file secret; Maps key
      restriction via keystore SHA-1; version-in-Settings.
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
7. Minor: `profile.tsx` writes `avatarUrl: ''` (type says `string | null`); dev fixture
   passwords ship in the JS bundle; inline-style drift in `app/(tabs)/chats.tsx` (compose
   modal + header icons should be NativeWind classes).
8. **Tutorial overlay chain** — deferred to post-user-testing backlog (4 of 8 prototype
   tutorials target MVP features; ~1 session if built).
9. **(2026-06-12 readiness review) Onboarding slides 2–3 oversell** — carousel pitches
   Cultures and Events but the Communities tab is a "Coming soon" placeholder. User chose
   to keep the slides for now; set expectations via the runbook's copy-paste message.

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
| `eas.json` | EAS Build profiles: development (dev-client APK), preview (internal APK), production (AAB) |
| `.npmrc` | `legacy-peer-deps=true` — encodes the React-19 install rule for EAS Build + CI |
| `app.json` | Native config — now also `runtimeVersion: { policy: fingerprint }` + `updates` (OTA); `eas init` adds `extra.eas.projectId` |
