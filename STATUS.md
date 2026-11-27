# us-mobile — Status

> Current state only. Plan: [PLAN.md](PLAN.md). Commands: [README](README.md#commands).
> History: [docs/CHANGELOG.md](docs/CHANGELOG.md). Gotchas: [.context/memory.md](.context/memory.md).

## Last Updated
2026-11-27 — Docs tidy: dated history moved to the [changelog](docs/CHANGELOG.md), Google Maps steps parked until we switch to it.

## Now
**Milestone 1 — Friends chat.** Next: ship guest sign-in to the APK, test it on an Android phone.

## Stack
Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript 6 · Maps 1.29.11 ·
NativeWind 4.2.7 + Tailwind 3 · Firebase JS SDK 12. Android only.

## What is done
- Firebase project `us-v1-ff6b3` (since June): Email/Password on, Anonymous (guest) on, `tester01`…`tester20` exist (recreated 2026-11-27, creds in gitignored `testers-credentials-us-v1-ff6b3.csv`). Current rules + indexes deployed 2026-11-25. Database region `europe-north2`.
- Chat flow checked two ways: two accounts in the browser app on emulators; friend → DM → group → leave → remove on Felix's old test backend (`us-felix-test-20261030`, no longer used by the app). All encrypted, server holds no text.
- EAS project: owner `fsopelsa` (`d74d2bb5-…`). Profiles: development / tester / production. Its signing keystore already exists on EAS.
- Every flow worked on device in June (Expo Go + emulators). Encryption is newer and not phone-tested.
- Chat: DM, group, info sheet, safety code, leave group, remove friend, unread dot. Signal setter. Stale markers dimmed.

## Open — needs you
1. **Tester accounts ready**: `tester01`…`tester20` were deleted and recreated on `us-v1-ff6b3` on 2026-11-27 (the June passwords were lost). New passwords are in the gitignored `testers-credentials-us-v1-ff6b3.csv`. Re-check any time: `node src/dev/provisionTesters.js --count 20`.
2. **Sign-up stays open for now:** guests are allowed (decision 2026-11-27). Sign-up was found closed and turned back on 2026-11-27; guest sign-in checked against the real backend. Closing sign-up (Firebase console → Authentication → Settings → User actions) would also block guests, so leave it on until guests are no longer wanted.
3. **Delete old Firebase test projects** `us-felix-test-20261030` + `test-fsop` in the Firebase console (the CLI can't). Google Maps is not used yet: Android uses OpenStreetMap for now. Before switching to Google Maps, follow [docs/maps-key-hardening.md](docs/maps-key-hardening.md).
4. **Hand out the APK** (PLAN M1 steps 6–7): tester APK `47ce2427-…` is built (link on expo.dev → us-mobile → Builds), before guest sign-in; guest sign-in reaches it as OTA update `75d6b881-…` (channel `tester`, runtime `7e4fe518…`, sent 2026-11-27). The app loads an update on its next start, so open it twice. Anonymous auth is on for `us-v1-ff6b3` (deployed 2026-11-27). After item 1, install it, smoke-test on your phone with `tester19`/`tester20`, then `node src/dev/testerInvites.js --link <link> --handle <you> --skip tester19,tester20`. Other ways to hand it out (Firebase App Distribution, Play internal testing): [docs/invites-and-distribution.md](docs/invites-and-distribution.md).
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
