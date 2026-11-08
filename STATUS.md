# us-mobile — Status

> Current state only. Dated session history lives in `docs/CHANGELOG.md`; project gotchas in
> `.context/memory.md`; the Phase 3 plan in `docs/plans/2026-06-11-phase3-readiness-plan.md`.
> **Remaining Steps 4–6 are planned in the Phase 3 plan above** (a separate finish-plan file
> was referenced here but never committed).

## Last Updated
2026-11-08 (overnight, branch `prel/great-faraday-hscinl`) — **Google Maps is blocked on the
Google side, not in code**: the Maps key's Cloud project has no billing (USER ACTION 5). Native
config verified via `expo prebuild` (key lands in `AndroidManifest.xml`). **CI green again**:
Expo SDK 58 patch bumps (`expo install --fix`) + drift checks moved last so they can't hide the
real checks (they had blocked every run since 2026-11-02). **Browser map shows real streets**
(Web Mercator over OSM tiles; taps now land where you tap). **Tester invites**: one-tap
SMS/email/WhatsApp messages from the CSV (`src/dev/testerInvites.js`); status + options in
`docs/plans/2026-11-08-invites-and-distribution.md`. Previous entry (2026-11-06 privacy rules,
still NOT deployed — USER ACTION 1) is in `docs/CHANGELOG.md`.

**⚠ Two lines of work.** `fel/phase1` = all of `main` + Felix's Milestone 1 "Friends chat"
(end-to-end encryption, phone screens removed, background location blocked, its own
`PLAN.md`). It points at a **different Firebase project** (`us-felix-test-20261030`) and **Expo
project** (owner `fsopelsa`). Both lines pass typecheck, unit tests and the emulator suite
(checked 2026-11-08); `fel/phase1` additionally needs the same `npx expo install --fix`. `main`
can fast-forward to `fel/phase1` — choosing the line that ships is the open decision
(see the invites doc).

**Stack** (since the 2026-10-29 `felix/dev-setup` merge — Felix is lead developer, his side
preferred on conflicts; merge details in `docs/CHANGELOG.md`): Expo SDK 58, React Native 0.88, React 19.3,
TypeScript 6, Maps 1.29.11 (Expo SDK matrix; the old 1.27.2 pin + `expo.install.exclude` and
`.npmrc` `legacy-peer-deps` are gone — plain `npm ci`), dev-client build profile and CI
workflow. Main-side work carried across: Wave 1 (auth persistence, chat info sheet, Sentry,
GDPR notice, …) + Wave 2 (signal setter, stale-marker honesty — now inside Felix's extracted
`src/features/map/mapProjection.ts`), EAS project link (`extra.eas.projectId` kept),
`preview`/`production` EAS profiles + update channels, mic hardening on the re-added
expo-camera/expo-image-picker plugins. Main-only packages re-added at SDK 58 versions
(Sentry 7 → **8**, expo-updates, expo-task-manager, expo-application, async-storage).
Setup: `docs/development-setup.md`; audit: `docs/dependency-audit.md` (11 entries: 3 high,
3 moderate, 5 low). Native marker/location behavior on SDK 58 is NOT yet device-verified.

**Still-open USER ACTIONS (from Wave 1):**
1. `firebase deploy --only firestore:rules` — the group-leave rule AND the 2026-11-06 privacy
   rules are emulator-only until deployed; Leave Group FAILS in prod without it. **Deploy
   together with the next app build**: builds without the `requestId` change can no longer
   accept friend requests under the new rules (no APK has been distributed yet).
2. Enable the Firestore TTL policy on `locations.expireAt` (console/gcloud).
3. Create a Sentry project → set `EXPO_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG`/`SENTRY_PROJECT`/
   `SENTRY_AUTH_TOKEN` for sourcemaps) as EAS env vars.
4. Review `docs/privacy-notice.md` (legal draft) + confirm `SUPPORT_EMAIL` in
   `src/config/constants.ts`.
5. **Make Google Maps work (2026-11-08)** — Google Cloud console (console.cloud.google.com).
   Do (b)–(d) **in one sitting**: today the key can't cost anything (no billing); from the
   moment billing is linked until (d), the committed, unrestricted key could be used for paid APIs.
   (a) **Find the key's project.** Quick check: if `api_key[0].current_key` in your local
   `google-services.json` equals `AIzaSyDbe2K0…`, it is Firebase's auto-created Android key in
   `us-v1-ff6b3`. Otherwise: project picker → each project → APIs & Services → Credentials, or
   `gcloud services api-keys lookup <KEY>` (returns the project number). Not in any project you
   can open → create a new key in a project you own and swap it into `app.json` (both lines).
   (b) **Link a billing account** (Billing → Link). Maps SDK for Android usage is unlimited at no
   charge, but Maps Platform needs billing (without it ~1 request/day). If the project is the
   Firebase project, this is the same as upgrading Firebase to Blaze (same free quotas, then
   pay-as-you-go; it also unlocks the Firestore TTL policy, USER ACTION 2). Add a budget alert
   (Billing → Budgets & alerts). Google for Nonprofits offers Maps credits.
   (c) **Enable "Maps SDK for Android"** (APIs & Services → Library).
   (d) **Restrict the key** (Credentials → the key): API restrictions → Restrict key → only
   "Maps SDK for Android". Application restrictions → Android apps → `com.us.mobile` + SHA-1 once
   known: one entry per signing key — EAS keystore (`npx eas-cli@25.3.0 credentials` → Android;
   `main`'s `lomasas-team` and `fel/phase1`'s `fsopelsa` are different keystores) and, if Play is
   used, Play Console → App integrity → app signing key SHA-1. Changes take ~5 min.
   Check (PowerShell: `curl.exe`): `curl "https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=2x2&key=<KEY>"`
   — "enable Billing" = (b) not done; "not authorized" = billing OK and Static Maps blocked
   (expected); "invalid" = wrong key. Final proof: streets on the phone build.

**Production is live** (since 2026-06-14): rules + indexes deployed, Email/Password enabled,
20 tester accounts (`tester01`…`tester20`, creds in gitignored `testers-credentials.csv`).
**EAS project linked**: `@lomasas-team/us-mobile` (id `b9ed9b69-64fc-4c03-89b8-e14a3ee44e9d`).

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
      gitignored `testers-credentials.csv`). Tester namespace audited as disjoint from the
      dev/debug account system — no debug routine can touch it.
- [~] Step 4 — development pipeline PREPARED (Felix, SDK 58): Expo 58 + Maps 1.29.11,
      `expo-dev-client`, Maps/splash config plugins, `eas.json` development/preview/production
      profiles. `expo prebuild --platform android --no-install` passes. EAS already linked
      (`eas init` done 2026-06-14 — do NOT re-run it). REMAINING: `npm run android:cloud` →
      install APK → validate native markers/location; Maps key restriction via keystore
      SHA-1; background-task/OTA work remain separate milestones.
- [ ] Step 5 — background location implementation + field test (needs the dev build)
- [ ] Step 6 — field readiness (Sentry, tester runbook, success criteria, privacy one-liner, CI)

## Open Items (non-blocking for Steps 1–3)

1. **Native Maps migration needs device validation** — 1.29.11 is installed, but a new
   development APK must be built and tested before declaring the old clipping bug resolved.
2. **Google Maps is NOT set up on the Google side (found 2026-11-08)** — the key in `app.json`
   (`AIzaSyDbe2K0…`, NOT the Firebase key) is valid, but Google answers every Maps request with
   `403 — You must enable Billing on the Google Cloud Project`. A dev build would show a grey
   grid with only the Google logo. **USER ACTION 5** below. The key is also unrestricted —
   restrict to package + SHA-1 in Step 4 (needs the EAS keystore). Same key on `fel/phase1`.
3. ~~`currentSignal` has no setter UI~~ — **resolved 2026-07-07** (⚡ SignalModal on the map, Wave 2).
4. ~~`allowFriendRequests` enforced client-side ONLY~~ — **resolved 2026-11-06**: the
   friend-request create rule reads the recipient's `settings.allowFriendRequests` (pending deploy).
5. **Location TTL half-done (2026-07-04)** — `locations.expireAt` (+24h) is written by app
   + seeds, and chat surfaces treat >5-min-old docs as offline (`isLocationFresh`), but the
   Firestore **console TTL policy is NOT enabled yet** (user action). Map markers handle
   staleness since Wave 2 (stale friends never cluster; dimmed at last position).
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
10. **Dependency audit remains open** — 11 affected entries (3 high, 3 moderate, 5 low) after
    the merge; scoped security overrides and limitations in `docs/dependency-audit.md`.
11. ~~Privacy regressions reproduced~~ — **resolved 2026-11-06** in `firestore.rules`
    (self-granted friendship, chat creator rewrite, gathering creator rewrite; plus forged/replayed
    requests and members adding strangers). The former TODO tests now pass; pending deploy.
12. **expo-camera / expo-image-picker / qrcode-svg are back** (Felix's branch) though no QR UI
    exists (`QR_CODE_ADD_FRIEND: false`) — CAMERA permission is declared again; drop them or
    ship the scan-to-add flow before wider distribution.

## Testing Methods

- **Browser (Expo web) is first-class for everything INCLUDING the map**: emulators + seed +
  `npx expo start` → `http://localhost:8081`. Real map screens run via `src/dev/fakeMaps.tsx`
  over real OpenStreetMap streets (since 2026-11-08; `EXPO_PUBLIC_DEV_MAP_TILES=off` = grid).
  Covers data/logic/UI — NOT react-native-maps native rendering.
- **Development client on the Pixel 7** for native UX — APK and device validation pending.
- `npm test` — 36 tests: production map functions (14), Metro proxy (3), web-map Mercator
  math (11), tester invite generator (8).
- `npm run check:emulators` — disposable seeded emulator run, actual projection/group pins,
  22 seeded rule checks, Firebase SDK sign-in/read/listener and the 22 authorization tests in
  `tests/security.rules.test.cjs` (a failing rules test fails CI). In a cloud session with
  `NODE_ENV=production`, install with `npm ci --include=dev` first (firebase-tools is a devDependency).
- **Device-free verification harness** (run after seeding): `npm run verify` —
  `verifyProjection.js` (clustering read path) + `verifyGroupPins.js` (proximity-wins + resting
  pin) + `verifyRules.js` (22 security-rules checks as real users).

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
| `src/features/presence/presence.ts` | Chat-surface presence: cluster peers (sorted anchors, friend-wide universe), freshness cutoff, group cluster>spot>visible hierarchy |
| `src/features/chat/ChatInfoSheet.tsx` | Tap-the-header sheet: group member list, member/peer profiles, Leave Group, Remove Friend, Message |
| `src/components/ErrorBoundary.tsx` | Root crash screen (recoverable) + Sentry capture when a DSN is configured |
| `app/settings/privacy-notice.tsx` | In-app GDPR notice (hostable copy: `docs/privacy-notice.md`) |
| `src/features/broadcasts/…` | Broadcast/Gathering feature (useBroadcasts, marker, card, composer) |
| `src/features/spots/spotSchedule.ts` | Spot schedule logic (single source of truth; mirrored in `runSeed.js`) |
| `src/features/spots/searchPlace.ts` | Forward geocoding (native: expo-location; web: Nominatim) for the spots editor |
| `docs/tester-distribution.md` | Runbook: build + share the APK, hand out tester accounts |
| `src/dev/fakeMaps.tsx` | Web map shim — real map screens run in the browser on OSM tiles (math: `src/dev/webMercator.ts`) |
| `src/dev/fixtures.json` | Seed fixtures (5 personas, chats, broadcasts, schedules) |
| `src/dev/runSeed.js` | Node-only emulator seed (admin REST `:commit`) |
| `src/dev/verify{Projection,GroupPins,Rules}.js` | Device-free verification harness |
| `firestore.rules` / `firestore.indexes.json` | Security rules (friendship consent proof, field-limited chat/gathering updates) + indexes |
| `tests/security.rules.test.cjs` | 22 emulator authorization tests (disposable users; part of `check:emulators`) |
| `firebase.json` | Emulators: auth 9099, firestore **8088**, UI 4000 |
| `eas.json` | EAS Build profiles: development (dev-client APK), preview (internal APK), production (AAB) |
| `src/features/map/mapProjection.ts` | Map projection (fresh-only clustering, stale flags) — shared by `useMapProjection` and `npm test`/verify |
| `docs/development-setup.md` | Felix's SDK 58 setup: toolchain, checks, CI, dev-client build |
| `app.json` | Native config — now also `runtimeVersion: { policy: fingerprint }` + `updates` (OTA); `eas init` adds `extra.eas.projectId` |
