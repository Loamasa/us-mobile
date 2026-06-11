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

## Step 1 — Cleanup pass (~1 short session)

- [ ] Remove Antigravity: `cmd /c rmdir .antigravity\skills` (junction — do NOT recursive-delete,
      it points INTO `.claude/skills`), then delete `.antigravity/` + `.agents/`, drop the
      junction line from `.gitignore`, drop Antigravity references from CLAUDE.md / memory docs
- [ ] Port `ready-to-test` workflow into a Claude skill (or fold into expo-devops) before deleting `.agents/`
- [ ] Collapse memory mirror: `.context/memory.md` becomes the single committed gotchas file;
      drop the "update both" rule from CLAUDE.md; fix its stale browser-testing entry
- [ ] STATUS.md diet: keep current state + open items + How to Run + Key Files (~100 lines);
      move dated history to `docs/CHANGELOG.md`
- [ ] Skill fixes: expo-devops emulator port 8080 → **8088**; git-workflow rewritten to match
      the real flow (direct commits to `main`; feature branch for multi-session work);
      delete local `skill-creator` copy (plugin supersedes it)
- [ ] Add npm scripts: `typecheck`, `seed`, `verify` (chains the three verify scripts), `emulators`

## Step 2 — Production backend wiring (~1 session)

- [ ] `.firebaserc` → `us-v1-ff6b3`
- [ ] Fix `firestore.indexes.json` friendRequests composite index → `(status ASC, createdAt DESC)`
      collection scope (current shape is stale — STATUS Phase-3 item 2)
- [ ] `firebase deploy --only firestore` (rules + indexes)
- [ ] Replace `USE_EMULATORS = __DEV__` in `src/config/firebase.ts` with
      `__DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS !== 'false'` — lets us dry-run the
      production backend from dev before cutting a build
- [ ] Confirm Firebase billing plan supports chosen auth + expected Firestore usage

Exit: app on dev machine talks to real Firestore with deployed rules; `verifyRules.js`
rerun against prod-equivalent rules in the emulator still 10/10.

## Step 3 — Interim auth + prod tooling (~1 session)

- [ ] Email/password sign-in + registration screens on the existing `AuthLayout` visual language
      (reuses profile/handle/permissions/spots steps unchanged — rules key off `auth.uid`)
- [ ] Phone/OTP screens behind a dev flag (kept for the future native-SDK migration)
- [ ] **Prod admin script**: service-account version of the seed/wipe tooling (the emulator's
      `Bearer owner` trick doesn't work in production). Needed for resetting test rounds and
      inspecting live data. Keep the service-account key OUT of the repo (`*.key`/`.env` ignored)
- [ ] Empty-state audit as a fresh user (no seed data in prod): map/chats/spots all make sense
      with zero friends; "add by handle" is discoverable

Exit: two fresh accounts on the real backend can register, befriend each other by handle, DM,
and see each other on the map (foreground).

## Step 4 — EAS pipeline (~1 session)

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
(restricted key), OTA update channel verified with a trivial JS change.

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

- **GitHub token**: scrubbed from `.claude/settings.local.json` + file untracked (2026-06-11),
  but the token tested VALID — user must still revoke it on GitHub (Settings → Applications →
  Authorized OAuth Apps)
- **FEATURES.md / Group Broadcast**: CONFIRMED + committed (`7d2cfeb`, 2026-06-11) — schedule it
  against the Phase 3 steps when ready (it builds on `buildGroupPins` + the friend-request flow)
