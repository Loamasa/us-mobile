# us-mobile — Status

> Current state only. Plan: [PLAN.md](PLAN.md). Commands: [README](README.md#commands).
> History: [docs/CHANGELOG.md](docs/CHANGELOG.md). Gotchas: [.context/memory.md](.context/memory.md).

## Last Updated
2026-11-08 — Merged `fel/phase1` into `prel/great-faraday-hscinl` (this line now = `fel/phase1` + that branch's work; `fel/phase1` can fast-forward to it). Brought in: **CI green again** (Expo SDK 58 patch bumps + SDK-drift checks moved last — they had failed every run since 11-02 and hid the exports + emulator suite), **Google Maps diagnosis** (key valid, its Cloud project has no billing → item 3 below), **browser map shows real streets** (OSM tiles, taps land where you tap), **one-tap tester invites** (`src/dev/testerInvites.js`) and [invites & distribution options](docs/invites-and-distribution.md).

2026-11-06 — Merged `main` into `fel/phase1`: rules hardening (friend-request validation, field-limited chat/gathering updates, replay-proof friend accept) now sits on top of the encrypted-envelope rules. Rules changes are emulator-tested only, **not deployed**: deploy rules together with the next app build (older builds can't accept friend requests under the new rules).

2026-10-31 — End-to-end encryption shipped in code: messages, group names, locations, spots, signals, gatherings ([details](docs/encryption.md)). Backend set up on `us-felix-test-20261030`, 20 accounts made. One backend only: old project gone from code. Unused packages + phone sign-in removed.

## Now
**Milestone 1 — Friends chat.** Next: choose database region, close sign-up, test APK on a phone.

## Stack
Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript 6 · Maps 1.29.11 ·
NativeWind 4.2.7 + Tailwind 3 · Firebase JS SDK 12. Android only.

## What is done
- Test project `us-felix-test-20261030`: Email/Password on, rules + indexes live, `tester01`…`tester20` exist (creds in gitignored CSV).
- Chat flow checked two ways: two accounts in the browser app on emulators; friend → DM → group → leave → remove on the real backend. All encrypted, server holds no text.
- EAS project: owner `fsopelsa` (`d74d2bb5-…`). Profiles: development / tester / production.
- Every flow worked on device in June (Expo Go + emulators). Encryption is newer and not phone-tested.
- Chat: DM, group, info sheet, safety code, leave group, remove friend, unread dot. Signal setter. Stale markers dimmed.

## Open — needs you
1. **Database region.** A deploy created it in US (`nam5`). EU = `npx firebase firestore:databases:delete "(default)"`, wait a few minutes, `npx firebase deploy --only auth,firestore`, re-run `node src/dev/provisionTesters.js --count 20` (safe, keeps passwords). Only fake test data there now. `firebase.json` already says `eur3` for the new one.
2. **Close sign-up:** Firebase console → Authentication → Settings → User actions → untick sign-up. Needed once accounts are final. To add accounts later, tick it again first.
3. **Make Google Maps work** — without this every phone shows a grey map. The key in `app.json` (`AIzaSyDbe2K0…`) is valid but Google says `You must enable Billing on the Google Cloud Project`. In console.cloud.google.com, in ONE sitting (the key is committed; no billing = no cost today):
   (a) find the key's project — if `current_key` in a local `google-services.json` matches, it's the Firebase project's auto-created Android key; else project picker → APIs & Services → Credentials, or `gcloud services api-keys lookup <KEY>`;
   (b) link a billing account (Maps SDK for Android is free, but Maps needs billing; on the Firebase project this = Blaze, which also unlocks TTL in item 5) + a budget alert;
   (c) enable **Maps SDK for Android**;
   (d) restrict the key: API restrictions → only Maps SDK for Android; Android apps → `com.us.mobile` + SHA-1 of each signing key (`npx eas-cli@25.3.0 credentials`; Play app-signing key if Play is used).
   Check: `curl.exe "https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=2x2&key=<KEY>"` → "not authorized" = done; "enable Billing" = (b) missing.
4. **Ship the first APK** (PLAN M1 steps 5–7): `npm run apk` under Expo `fsopelsa`, deploy the rules with it (`npx firebase deploy --only firestore`), smoke-test on your phone, then `node src/dev/testerInvites.js --link <link> --handle <you> --skip tester19,tester20`. Other ways to hand it out (Firebase App Distribution, Play internal testing): [docs/invites-and-distribution.md](docs/invites-and-distribution.md).
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
