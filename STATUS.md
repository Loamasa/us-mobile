# us-mobile — Status

> Current state only. Plan: [PLAN.md](PLAN.md). Commands: [README](README.md#commands).
> History: [docs/CHANGELOG.md](docs/CHANGELOG.md). Gotchas: [.context/memory.md](.context/memory.md).

## Last Updated
2026-10-31 — Docs reset. New [PLAN.md](PLAN.md): Milestone 1 = friends chat via APK link.
New `npm run apk` (preview APK, real backend). Old phase plans → [docs/archive/](docs/archive/README.md).

## Now
Working on **Milestone 1 — Friends chat**. Next step: deploy rules, then `npm run apk`.

## Stack
Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript 6 · Maps 1.29.11 ·
NativeWind 4.2.7 + Tailwind 3 · Firebase JS SDK 12. Android only.

## What is done
- Prod live since 2026-06-14: rules + indexes, Email/Password auth, 20 tester accounts
  (`tester01`…`tester20`, creds in gitignored `testers-credentials.csv`).
- EAS linked: `@lomasas-team/us-mobile`. `eas.json` profiles: development / preview / production. OTA channels set.
- Every flow worked on device in June (Expo Go + emulators): map, chats, composer, friend accept, gatherings.
- Chat: DM, group, info sheet, leave group, remove friend. Signal setter. Stale markers dimmed.
- Sentry wired (needs DSN). GDPR notice in app.

## Open — user actions
1. `npx firebase deploy --only firestore` — group-leave rule only on emulator. Leave Group FAILS in prod without it. **(M1)**
2. `npm run apk` → test → share link. **(M1)**
3. Enable Firestore TTL policy on `locations.expireAt` (console). Later.
4. Sentry project → set `EXPO_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`) as EAS env vars. Later.
5. Review `docs/privacy-notice.md` + confirm `SUPPORT_EMAIL` in `src/config/constants.ts`.

## Open — code items (not M1)
1. Native map on SDK 58 not phone-tested. Old marker clipping bug maybe fixed by Maps 1.29 — check in M2.
2. Google Maps Android key in `app.json` unrestricted → restrict to `com.us.mobile` + SHA-1.
3. Privacy holes (3 failing TODO tests): fake friendship → read location; chat/gathering members can rewrite creator.
4. `allowFriendRequests` only checked client-side. Rules need `get()`.
5. Background location not built (`FEATURE_FLAGS.BACKGROUND_LOCATION` false).
6. expo-camera / image-picker / qrcode-svg installed but no QR UI → CAMERA permission declared for nothing.
7. Minor: `profile.tsx` writes `avatarUrl: ''` (type `string | null`); dev fixture passwords in JS bundle; inline styles in `app/(tabs)/chats.tsx`.
8. Onboarding slides 2–3 pitch Cultures + Events, but Communities tab is "Coming soon".
9. Tutorial overlays — backlog.
10. Dep advisories: 3 high, 3 moderate, 5 low (dev/CLI tooling) — [audit](docs/dependency-audit.md).

## Key files
| File | What |
|---|---|
| `app/(tabs)/chats.tsx` | Chat list, composer, friend requests |
| `app/chat/[chatId].tsx` | Chat detail |
| `src/features/chat/ChatInfoSheet.tsx` | Members, leave group, remove friend |
| `app/(auth)/signin.tsx` | Tester sign-in (Account ID + password) |
| `app/(tabs)/map.native.tsx` | Map screen |
| `src/features/map/mapProjection.ts` | Clustering (shared with tests) |
| `src/lib/firestore.ts` | All Firestore helpers |
| `src/config/firebase.ts` | Firebase config + emulator switch |
| `src/dev/provisionTesters.js` | Make tester accounts |
| `firestore.rules` / `firestore.indexes.json` | Rules + indexes |
| `eas.json` / `app.json` | Build profiles / native config |
