# us-mobile — Status

> Current state only. Plan: [PLAN.md](PLAN.md). Commands: [README](README.md#commands).
> History: [docs/CHANGELOG.md](docs/CHANGELOG.md). Gotchas: [.context/memory.md](.context/memory.md).

## Last Updated
2026-11-14 — **GitHub branch clean-up.** Folded `prel/hopeful-goodall-bbm8io` (Maps key runbook) into this line: [docs/maps-key-hardening.md](docs/maps-key-hardening.md) (adapted to the `tester` profile and the `lomasas-team` keystore) + `npm run check:maps-key` (one Geocoding probe, key never printed; today → BILLING OFF, exit 2). Item 3 below now follows the runbook's order. CI was red again from Expo SDK 58 patch drift only (functional checks all green): 13 patch bumps applied (`expo` 58.0.25), `expo install --check` + `expo-doctor` pass. Branches `feat/group-chat`, `cl/dreamy-dirac-ju2j20` (both already in `main`) and `prel/great-faraday-hscinl` (= `fel/phase1`) are to be deleted.

2026-11-09 — **Back on the original backend + Expo account**: the app, scripts and tests now use Firebase `us-v1-ff6b3` and Expo `lomasas-team` (`b9ed9b69-…`) again instead of Felix's test project `us-felix-test-20261030` / Expo `fsopelsa`. Encryption and all M1 code are unchanged. The original Maps key is back in `app.json` (the key briefly put there was the test project's Firebase web key). Verified on emulators: typecheck, `npm test` 53/53, `check:emulators` (rules 24/24), browser sign-in/map/chats. **Not done yet (needs your logins): deploying the current rules + indexes to `us-v1-ff6b3`** (item 1).

2026-11-08 — Merged `fel/phase1` into `prel/great-faraday-hscinl` (this line now = `fel/phase1` + that branch's work; `fel/phase1` can fast-forward to it). Brought in: **CI green again** (Expo SDK 58 patch bumps + SDK-drift checks moved last — they had failed every run since 11-02 and hid the exports + emulator suite), **Google Maps diagnosis** (key valid, its Cloud project has no billing → item 3 below), **browser map shows real streets** (OSM tiles, taps land where you tap), **one-tap tester invites** (`src/dev/testerInvites.js`) and [invites & distribution options](docs/invites-and-distribution.md).

2026-11-06 — Merged `main` into `fel/phase1`: rules hardening (friend-request validation, field-limited chat/gathering updates, replay-proof friend accept) now sits on top of the encrypted-envelope rules. Rules changes are emulator-tested only, **not deployed**: deploy rules together with the next app build (older builds can't accept friend requests under the new rules).

2026-10-31 — End-to-end encryption shipped in code: messages, group names, locations, spots, signals, gatherings ([details](docs/encryption.md)). Backend set up on `us-felix-test-20261030`, 20 accounts made. One backend only: old project gone from code. Unused packages + phone sign-in removed.

## Now
**Milestone 1 — Friends chat.** Next: deploy rules + indexes to `us-v1-ff6b3`, Maps billing, build + test the APK on a phone, close sign-up.

## Stack
Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript 6 · Maps 1.29.11 ·
NativeWind 4.2.7 + Tailwind 3 · Firebase JS SDK 12. Android only.

## What is done
- Firebase project `us-v1-ff6b3` (since June): Email/Password on, `tester01`…`tester20` exist (creds in gitignored CSV — the June file is `testers-credentials.csv`; `provisionTesters.js` reads it and saves `testers-credentials-us-v1-ff6b3.csv`). Its rules + indexes are the **June** versions — the encrypted-data rules are not deployed there yet (item 1).
- Chat flow checked two ways: two accounts in the browser app on emulators; friend → DM → group → leave → remove on Felix's old test backend (`us-felix-test-20261030`, no longer used by the app). All encrypted, server holds no text.
- EAS project: owner `lomasas-team` (`b9ed9b69-…`). Profiles: development / tester / production. No APK built under this account yet → its first build creates a new signing keystore.
- Every flow worked on device in June (Expo Go + emulators). Encryption is newer and not phone-tested.
- Chat: DM, group, info sheet, safety code, leave group, remove friend, unread dot. Signal setter. Stale markers dimmed.

## Open — needs you
1. **Deploy to `us-v1-ff6b3`** (`.firebaserc` default again): `npx firebase login` with the account that owns it, then `npx firebase deploy --only auth,firestore` (rules + indexes + Email/Password setting). The app needs these rules — it writes encrypted envelopes and friend-request proofs the June rules don't know. Then `node src/dev/provisionTesters.js --count 20` (reads the June CSV, checks every account, saves the project-named CSV). Database region: check Firestore → Settings in the console; `firebase.json`'s `location: eur3` only applies when a database is first created, so it doesn't touch the existing one.
2. **Close sign-up:** Firebase console → Authentication → Settings → User actions → untick sign-up. Needed once accounts are final. To add accounts later, tick it again first.
3. **Make Google Maps work** — the Maps key in `app.json` (`AIzaSyDbe2K0…`) is valid, but Google says `You must enable Billing on the Google Cloud Project`; it most likely lives in `us-v1-ff6b3`'s Cloud project (free Spark plan = no billing). Step by step (Console + Cloud Shell commands): [docs/maps-key-hardening.md](docs/maps-key-hardening.md). In console.cloud.google.com, in ONE sitting and in this order, so the key is never unrestricted *and* billable: (a) APIs & Services → Credentials — find the key's project; (b) restrict the key: API restrictions → only Maps SDK for Android; Android apps → `com.us.mobile` + the **EAS keystore SHA-1** of `lomasas-team` (expo.dev → us-mobile → Credentials → Android, after the first build). Until that SHA-1 is in, keep Application restrictions = None (wrong SHA-1 = grey map); (c) enable **Maps SDK for Android**, disable other Maps APIs (the app uses none); (d) link a billing account (Maps SDK for Android is free, but Maps needs billing; for the Firebase project this = Blaze, same free quotas, also unlocks TTL in item 6) + a $5 budget alert.
   ⚠ `AIzaSyBzq…` is the **Firebase web key of `us-felix-test-20261030`**, not a Maps key — never add Android-app restrictions to a Firebase web key (the JS SDK sends no Android headers → sign-in breaks).
   Check any time: `npm run check:maps-key` → `BILLING OFF` (exit 2) = (d) missing; `RESTRICTED` (exit 0) = done; `UNRESTRICTED` (exit 1) = redo (b); `INCONCLUSIVE` (exit 2) = Geocoding is off, check the key's settings (runbook step 7).
4. **Ship the first APK** (PLAN M1 steps 5–7): after item 1, `npx eas-cli@25.3.0 login` with an Expo account in `lomasas-team`, `npm run apk` (first build: let EAS create the keystore), smoke-test on your phone with `tester19`/`tester20`, then `node src/dev/testerInvites.js --link <link> --handle <you> --skip tester19,tester20`. Other ways to hand it out (Firebase App Distribution, Play internal testing): [docs/invites-and-distribution.md](docs/invites-and-distribution.md).
5. Review `docs/privacy-notice.md` + confirm who is named as responsible and `SUPPORT_EMAIL`.
6. Later: Sentry project → `EXPO_PUBLIC_SENTRY_DSN` as EAS env var. Paid plan → server-side expiry (TTL) on `locations.expireAt`, `broadcasts.expiresAt`.

## Open — code items (not M1)
1. Native map on SDK 58 not phone-tested. Old marker clipping bug maybe fixed by Maps 1.29 — check in M2.
2. Background location not built.
3. Push notifications not built: unread dot only shows with app open.
4. Minor: `provisionTesters.js` writes `avatarUrl: ''` (type `string | null`); dev fixture passwords in JS bundle; inline styles in chat screens.
5. Onboarding slides 2–3 pitch Cultures + Events, but Communities tab is "Coming soon".
6. Tutorial overlays — backlog.
7. Dep advisories (dev/CLI tooling) — [audit](docs/dependency-audit.md).

## Key files
| File | What |
|---|---|
| `app/(tabs)/chats.tsx` | Chat list, composer, friend requests |
| `app/chat/[chatId].tsx` | Chat detail |
| `src/features/chat/ChatInfoSheet.tsx` | Members, leave group, remove friend |
| `app/(auth)/signin.tsx` | Tester sign-in (Account ID + password) |
| `app/(tabs)/map.native.tsx` | Map screen |
| `src/features/map/mapProjection.ts` | Clustering (shared with tests) |
| `src/lib/firestore.ts` | All Firestore helpers, encrypt/decrypt at the boundary |
| `src/features/e2ee/` | Encryption core, key storage, key trust |
| `src/config/firebase.ts` | Firebase config + emulator switch |
| `src/dev/provisionTesters.js` | Make tester accounts |
| `src/dev/testerInvites.js` | Tester CSV + APK link → one-tap SMS / email / WhatsApp invites (gitignored output) |
| `src/dev/fakeMaps.tsx` / `src/dev/webMercator.ts` | Browser map shim on OSM tiles / its tested projection math |
| `firestore.rules` / `firestore.indexes.json` | Rules + indexes |
| `eas.json` / `app.json` | Build profiles / native config |
