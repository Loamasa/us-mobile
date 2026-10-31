# Phase 3 Readiness Plan — Trusted-Tester Release (Android)

> Decisions locked 2026-06-11. Trusted testers only: security posture = "safe enough now,
> structured so the secure version is an upgrade, not a rewrite."

## Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Auth for testers | **Interim email/password** (JS SDK). Phone/OTP screens stay behind a flag; native phone auth (`@react-native-firebase/auth`) deferred to public release. |
| D2 | Platforms | **Android only.** No Apple account / TestFlight work. |
| D3 | Distribution | **EAS internal distribution** (shareable install link). Firebase App Distribution not needed at this cohort size. |
| D4 | Background location | **IN scope — it's the product** (Bump-like ambient presence). See revised analysis below. |

### D4 revised analysis (was: "remove the permission")
The earlier recommendation to drop `ACCESS_BACKGROUND_LOCATION` assumed the permission was
dead weight. With always-on presence as the product intent, the opposite holds:

- **Foreground-only can't test the product hypothesis.** Clusters forming while phones sit
  in pockets is the core promise; a tester with the app closed is the *real* usage pattern.
- **Play policy is not a blocker for Phase 3.** The background-location review (prominent
  disclosure, demo video) applies to Play Store publishing only. Sideloaded EAS internal
  builds skip it entirely. It becomes a launch-phase work item.
- **But it is genuinely unimplemented**: `FEATURE_FLAGS.BACKGROUND_LOCATION` is false, no
  background task exists, and `expo-task-manager` is not in package.json.
- **Build-ordering constraint**: `expo-task-manager` is a native module. It MUST be in the
  first EAS build (even if the feature logic ships later via OTA update). Background
  location also does not work in Expo Go — developing/testing it requires the EAS
  development build. Hence it is scheduled AFTER the EAS pipeline step.
- Keep the manifest permission + onboarding `requestBackgroundPermissionsAsync()` as-is.

## Step 0 — Full device pass in debug mode (BEFORE any Phase 3 work)

Everything verified this month was browser/emulator-side. One full pass on the Pixel 7
(Expo Go + emulators + seed) to confirm parity on real hardware:

- [ ] Onboarding carousel → phone → OTP → profile → permissions → spots ("ANCHOR.") flow
- [ ] Map: Alice+Bob cluster, Charlie pin, FriendCard ("At 🛹 Hangout"), ClusterCard
- [ ] Named group pins: Möllevången Crew (proximity branch + resting `fixedLocation` branch)
- [ ] Ghost mode toggle (pill, signal button hides, location doc deleted)
- [ ] Signal broadcast without GPS gate + ActiveSignalHUD countdown + clear
- [ ] Chats: Messenger-style composer (1 → DM, 2+ → group, dedup to Study Crew), send/receive
- [ ] Back-from-chat lands on the originating tab (root `<Stack>` fix — device confirmation)
- [ ] Spot scheduling: Always/Scheduled form, day chips, "Outside hours" tag, map circle honors window
- [ ] Friend request add → accept between two personas (the newly fixed rules path) —
      use two phones or Settings → Developer → Switch Account (phone B as alice)
- [ ] Settings detail routes, My Spots editor (native map version)

Exit: every box checked on device, or failures triaged into the bug list.

> **Step 0 outcome (2026-06-11, 5 device rounds):** every flow functionally confirmed on
> device. The one open item — clipped marker bitmaps — was root-caused after round 5 as a
> **library-level bug**: custom View markers are broken in react-native-maps 1.20.1 on
> Android + New Architecture (rnm [#5877](https://github.com/react-native-maps/react-native-maps/issues/5877),
> [#5655](https://github.com/react-native-maps/react-native-maps/issues/5655)); every
> workaround in those threads was already tried and disproved in rounds 1–4. No JS-side fix
> exists; the fix (react-native-maps 1.27.x, Fabric-native) crashes Expo Go
> (`RNMapsAirModule` not in the Go binary, which bundles 1.20.1) and `newArchEnabled:false`
> can't be tested in Expo Go either (new-arch-only since SDK 53; legacy dies in SDK 55).
> **Decision: marker fix is the FIRST item of Step 4** — closes Step 0's last box on the
> dev build. Until then Expo Go markers stay clipped-but-functional.

## Step 1 — Cleanup pass (~1 short session) — ✅ DONE 2026-06-11

- [x] Remove Antigravity: junction unlinked with `rmdir` (target `.claude/skills` intact),
      `.antigravity/` + `.agents/` deleted, junction line dropped from `.gitignore`,
      references dropped from memory docs
- [x] `ready-to-test` workflow folded into the expo-devops skill (before deleting `.agents/`)
- [x] Memory mirror collapsed: `.context/memory.md` is the single committed gotchas file
      (CLAUDE.md rule updated; stale browser-testing entry rewritten; marker gotcha added)
- [x] STATUS.md diet: current state + open items + How to Run + Key Files; history moved
      to `docs/CHANGELOG.md`
- [x] Skill fixes: emulator port **8088** in expo-devops AND firebase skills; git-workflow
      rewritten to the real flow (direct commits to `main`); local `skill-creator` deleted
- [x] npm scripts added: `typecheck`, `seed`, `verify` (chains the three verify scripts), `emulators`

## Step 2 — Production backend wiring (~1 session) — ✅ DONE 2026-06-11 except deploy

- [x] `.firebaserc` → `us-v1-ff6b3`
- [x] Fix `firestore.indexes.json` friendRequests composite index → `(status ASC, createdAt DESC)`
      collection scope. ALSO added chats `(type ASC, memberIds CONTAINS)` — `getOrCreateGroupChat`
      combines `==` with `array-contains`, which needs a composite in production (the emulator
      never enforces indexes, so it couldn't catch this)
- [ ] `firebase deploy --only firestore` (rules + indexes) — **pending a one-time
      `firebase login` in an interactive terminal** (CLI refuses non-interactive login);
      everything else is committed and ready
- [x] Replace `USE_EMULATORS = __DEV__` in `src/config/firebase.ts` with
      `__DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS !== 'false'` — verified emulators
      still connect by default (browser boot + map render clean)
- [x] Confirm Firebase billing plan: **Spark (free) for Phase 3** (user decision 2026-06-11) —
      email/password auth is free, deploys are free, Firestore free quota covers the tester
      cohort. Blaze becomes necessary only for phone-auth SMS at public release; main Spark
      risk is a chatty-listener bug eating the 50K daily reads (stable-key patterns guard it).

Exit: rerun against the emulator green (projection PASS, group pins 8/8, **rules 17/17**);
real-Firestore dry-run (`EXPO_PUBLIC_USE_EMULATORS=false`) happens right after the deploy.

## Step 3 — Interim auth + prod tooling (~1 session) — RE-SCOPED 2026-06-11, in progress

> User decision: **NO self-registration.** 20 fixed pre-provisioned accounts are handed to
> testers (Account ID + password, distributed out-of-band via the gitignored CSV). Display
> name is editable in-app (Settings → My Account, already shipped); handles stay fixed —
> that's how testers add each other.

- [x] **Provisioning script** `src/dev/provisionTesters.js` (REST-only, no admin SDK / no
      service-account key): creates testerNN auth users via public `signUp`, then each
      account writes ITS OWN profile + handle (rules-compliant — a successful emulator run
      doubles as proof the production rules permit the flow). Idempotent:
      `testers-credentials.csv` is output AND state; existing profiles never overwritten
      (a tester's edited name survives re-runs). `--emulator` / prod modes.
- [x] **Sign-in screen** `app/(auth)/signin.tsx`: Account ID + password (bare IDs map to
      `@us.test` — `TESTER_EMAIL_DOMAIN` in constants.ts), AuthLayout visual language,
      friendly error mapping; first-login routes by location-permission check →
      permissions → spots → map. Onboarding "Enter the Void" CTA → signin.
- [x] Phone/OTP behind a dev flag: signin's `__DEV__`-only "Dev: phone sign-in" secondary
      link (phone.tsx was already prod-blocked)
- [x] **Dev auto-sign-in persistence race FIXED** (`app/_layout.tsx`): `ensureDevUser` now
      waits for the first `onAuthStateChanged` emission — auth persistence restores
      asynchronously, so the old synchronous `auth.currentUser` check stomped a persisted
      tester/persona session back to dev-user on EVERY dev reload
- [x] Browser-verified end-to-end against enforced emulator rules: provision 3 →
      signin as tester01 → permissions → spots → map → Settings shows "Tester 01
      @tester01" after a full reload → display name edited + persisted → reset. Zero
      console errors; tsc clean.
- [ ] **PROD provisioning run**: (1) enable Email/Password provider in the Firebase console,
      (2) `firebase deploy --only firestore` (Step 2 leftover), then
      `node src/dev/provisionTesters.js --count 20`
- [x] Empty-state audit as a fresh tester (zero friends), in-browser as tester01: spots
      empty state good; map renders fine empty (no friend-nudge — optional polish, not
      blocking); chats friendless state FIXED — copy now says "Add your first friend by
      their @handle" with an explicit **Add Friend** CTA opening the by-handle modal
      (was: "Start a conversation with a friend" with NO action for friendless users)
- ~~Registration screens~~ — dropped (fixed accounts); native phone auth remains the
  public-release plan. A service-account admin script (wipe/inspect prod) is deferred until
  actually needed — provisioning no longer requires it.

Exit: two tester accounts on the real backend can sign in with handed-out credentials,
befriend each other by handle, DM, and see each other on the map (foreground).
Note: tester emails use the reserved `.test` TLD — password-RESET emails can't be
delivered; reset via the Firebase console instead.

## Step 4 — EAS pipeline (~1 session)

- [ ] **Upgrade react-native-maps 1.20.1 → 1.27.x FIRST** (fixes Step 0's clipped markers —
      library-level Fabric bug, see Step 0 outcome note). Swap `android.config.googleMaps.apiKey`
      for the `react-native-maps` config plugin (`androidGoogleMapsApiKey`, supported 1.22+);
      verify the key lands in AndroidManifest after prebuild (a misconfigured plugin silently
      drops it — rnm#5655 comments). From this point device testing moves to the dev client;
      Expo Go can no longer run the map (native module mismatch).
- [ ] `eas init` (project id into app config) + `eas.json`: `development` (dev client) +
      `preview` (internal distribution) profiles, `autoIncrement` versionCode
- [ ] Add `expo-updates` (OTA channel — ship JS fixes to testers without reinstall) and
      `expo-task-manager` (for Step 5) BEFORE the first build — neither can be retrofitted via OTA
- [ ] `google-services.json` into the build: commit it (Firebase documents it as safe for
      Android) or EAS file env var — decide once
- [ ] Build `development` + `preview`, install both on the Pixel 7
- [ ] Pull keystore SHA-1 from `eas credentials` → restrict the Google Maps key in Cloud
      Console (package `com.us.mobile` + SHA-1, Maps SDK for Android only)
- [ ] Show app version + build number in Settings (testers report "build N")

Exit: preview APK installs from the EAS link, signs in against real Firebase, map renders
(restricted key) **with clean un-clipped markers (closes Step 0's last box)**, OTA update
channel verified with a trivial JS change.

## Step 5 — Background location (~1–2 sessions, needs the dev build)

- [ ] `Location.startLocationUpdatesAsync` via `expo-task-manager` + Android foreground-service
      notification; reuse the spots-gated + schedule-aware publish logic from `useLocationTracking`
- [ ] Battery strategy (see geolocation-maps skill): balanced accuracy, `distanceInterval`
      ~25–50m, deferred updates; flip `FEATURE_FLAGS.BACKGROUND_LOCATION` on
- [ ] Field test: app killed/backgrounded inside a spot → friend's map updates; leaving the
      spot → pin disappears (extends the cold-start cleanup fix)
- [ ] Overnight battery sanity check on the Pixel 7

Exit: ambient presence works phone-to-phone with both apps backgrounded.

## Step 6 — Field readiness (~1 session)

- [ ] **Sentry** (`@sentry/react-native` config plugin) — without it, tester crashes are invisible
- [ ] Tester runbook (1 page): install link, registration, "add each other by handle", what to
      test, where to report (group chat is fine)
- [ ] Define what Phase 3 should learn (success criteria) — otherwise the phase never ends
- [ ] Privacy one-liner at onboarding (location shared with friends only while inside your
      spots; ghost mode exists) — ethical hygiene + dry run for the real policy
- [ ] CI: GitHub Actions running `npx tsc --noEmit` on push (template in expo-devops
      `references/ci-cd.md`); emulator verify scripts as a later upgrade

## Deferred — "ready for a more secure system" ledger

Not Phase 3 blockers; ALL block public release. Tracked here so they're priced in:

- Server-side enforcement of `allowFriendRequests` (rules `get()` on recipient settings)
- Location-doc TTL (Firestore TTL policy or freshness check on `updatedAt`)
- Native phone auth migration (`@react-native-firebase/auth`) replacing interim email/password
- Firebase App Check
- Dev fixture passwords out of the JS bundle
- Play Store background-location review package (disclosure UI + demo video)
- Profile `avatarUrl: ''` vs `string | null` consistency; auth spots step swallows save errors

## Open threads

- **GitHub token**: CLOSED 2026-06-11 — scrubbed from `.claude/settings.local.json`, file
  untracked + gitignored, and the issuing OAuth app (Git Credential Manager) revoked on GitHub.
  Next HTTPS `git push` will re-prompt a one-time browser sign-in.
- **FEATURES.md / Group Broadcast**: CONFIRMED + committed (`7d2cfeb`, 2026-06-11) — schedule it
  against the Phase 3 steps when ready (it builds on `buildGroupPins` + the friend-request flow)
