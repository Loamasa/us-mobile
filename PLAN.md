# us — Plan

> One goal now. Small steps. Rest stay loose until chat work.
> Commands: [README](README.md#commands) · State today: [STATUS](STATUS.md)

---

## 🎯 Now: Milestone 1 — Friends chat

**Goal:** friends get APK link → install on Android → sign in → chat with each other.

**Done when**
- [ ] APK link open and install on friend phone
- [ ] 3+ friends signed in (tester account or guest)
- [ ] Add friend by `@handle` works
- [ ] DM + group chat + leave group work on real backend
- [ ] Close app, open again → still signed in
- [ ] One week normal use, no crash that stop chat

**Backend:** Firebase `us-v1-ff6b3`, the only project the app knows (back from Felix's test project on 2026-11-09). Expo: `fsopelsa`. Chats and other private data are [end-to-end encrypted](docs/encryption.md).

**Steps**
1. [x] Push current rules + indexes to `us-v1-ff6b3` (`npx firebase deploy --only auth,firestore`). Deployed 2026-11-25
2. [x] Accounts exist (recreated 2026-11-27, creds in `testers-credentials-us-v1-ff6b3.csv`). Re-check: `node src/dev/provisionTesters.js --count 20`. Keep `tester19` + `tester20` for your own smoke tests
3. [x] **Check database region**: `europe-north2` (Stockholm), checked 2026-11-25
4. [ ] ~~Stop strangers: turn off sign-up~~ Parked 2026-11-27: guests are allowed for now, and closing sign-up would block them too
5. [x] Build APK: `npm run apk` → EAS gives link ([how](docs/tester-distribution.md)). Current: build `c15413c4-…` (2026-11-28, Expo 58.1, guest sign-in), checked on the emulator
6. [ ] Smoke test: own phone + one friend. Sign in, add, DM, group, leave group, remove friend, reopen app
7. [ ] Send each friend: link + one row from `testers-credentials-us-v1-ff6b3.csv` — `node src/dev/testerInvites.js` ([message to copy](docs/tester-distribution.md#message-for-testers))
8. [ ] Fix only bugs that break chat. JS fix → OTA update. Native change → new APK

**Not in M1** — no work here until M1 done
- Background location · map polish · native marker check (map only must not crash)
- Push notifications · Sentry · iOS · Play Store

**Known risk:** encryption + rules tested in browser and on the real backend, not on a phone yet, and no outside audit. Trusted friends only.

---

## 🧭 Later (rough — will change after M1)

Pick next based on what M1 teach us. Order not fixed.

| # | Milestone | Idea |
|---|-----------|------|
| Next | In-app invites (first after M1) | Invite button (share sheet), invite codes + self-registration, `us://add/<handle>` deep link. Details: [in-app invites](docs/invites-and-distribution.md#in-app-invites--what-a-real-feature-would-be-after-m1) |
| M2 | Map on phone | Real native map instead of the OSM shim: MapLibre + OpenFreeMap (ready on `main`, free, no key) or Google Maps (restrict key + billing first). Markers + foreground location on a real device |
| M3 | Ambient presence | Background location (add back `expo-task-manager` + permission), push notifications, battery check |
| M4 | Safe enough to share wider | Outside security review, forward secrecy, Sentry, server-side expiry (needs paid plan) |
| M5 | Public path | Phone auth (native SDK), App Check, Play Store location review |

Feature ideas beyond prototype: [FEATURES.md](FEATURES.md).

---

## 🔗 Links

**This repo**
- [README](README.md) — what app is + every command
- [STATUS](STATUS.md) — current state, open items
- [Android guide](docs/android-guide.md) — your steps to a working map + login, in order
- [Tester distribution](docs/tester-distribution.md) — build, share, manage accounts
- [Development setup](docs/development-setup.md) — toolchain, emulators, dev client
- [Encryption](docs/encryption.md) — what is private, how, limits
- [Dependency audit](docs/dependency-audit.md) — open advisories
- [Privacy notice](docs/privacy-notice.md) — legal draft
- [Changelog](docs/CHANGELOG.md) — what happened when
- [Archive](docs/archive/README.md) — old plans, done or replaced
- Skills: [firebase](.claude/skills/firebase/SKILL.md) · [realtime-data](.claude/skills/realtime-data/SKILL.md) · [geolocation-maps](.claude/skills/geolocation-maps/SKILL.md) · [expo-devops](.claude/skills/expo-devops/SKILL.md) · [react-native-expo](.claude/skills/react-native-expo/SKILL.md)

**Outside**
- [EAS internal distribution](https://docs.expo.dev/build/internal-distribution/) — APK link
- [EAS Update](https://docs.expo.dev/eas-update/introduction/) — OTA JS fixes
- [Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Expo SDK 58 docs](https://docs.expo.dev/)
