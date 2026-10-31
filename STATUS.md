# us-mobile — Status

> Current state only. Plan: [PLAN.md](PLAN.md). Commands: [README](README.md#commands).
> History: [docs/CHANGELOG.md](docs/CHANGELOG.md). Gotchas: [.context/memory.md](.context/memory.md).

## Last Updated
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
3. Restrict Google Maps key in `app.json` to `com.us.mobile` + EAS SHA-1 (Google Cloud console).
4. Review `docs/privacy-notice.md` + confirm who is named as responsible and `SUPPORT_EMAIL`.
5. Later: Sentry project → `EXPO_PUBLIC_SENTRY_DSN` as EAS env var. Paid plan → server-side expiry (TTL) on `locations.expireAt`, `broadcasts.expiresAt`.

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
| `firestore.rules` / `firestore.indexes.json` | Rules + indexes |
| `eas.json` / `app.json` | Build profiles / native config |
