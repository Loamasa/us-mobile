# us — Plan

> One goal now. Small steps. Rest stay loose until chat work.
> Commands: [README](README.md#commands) · State today: [STATUS](STATUS.md)

---

## 🎯 Now: Milestone 1 — Friends chat

**Goal:** friends get APK link → install on Android → sign in → chat with each other.

**Done when**
- [ ] APK link open and install on friend phone
- [ ] 3+ friends signed in with tester accounts
- [ ] Add friend by `@handle` works
- [ ] DM + group chat + leave group work on real backend
- [ ] Close app, open again → still signed in
- [ ] One week normal use, no crash that stop chat

**Backend:** test project `us-felix-test-20261030`, the only project the app knows. Chats and other private data are [end-to-end encrypted](docs/encryption.md).

**Steps**
1. [x] Enable Email/Password, push rules + indexes (`npx firebase deploy --only auth,firestore`)
2. [x] Make accounts (`node src/dev/provisionTesters.js --count 20`). `tester19` + `tester20` used for testing, don't hand out
3. [ ] **Choose database region** (one-time). Now US (`nam5`). For EU: see [STATUS](STATUS.md#open--needs-you)
4. [ ] Stop strangers: Firebase console → Authentication → Settings → turn off sign-up
5. [ ] Build APK: `npm run apk` → EAS gives link ([how](docs/tester-distribution.md))
6. [ ] Smoke test: own phone + one friend. Sign in, add, DM, group, leave group, remove friend, reopen app
7. [ ] Send each friend: link + one row from `testers-credentials-us-felix-test-20261030.csv` ([message to copy](docs/tester-distribution.md#message-for-testers))
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
| M2 | Map on phone | Markers + foreground location on real device. Restrict Maps key to package + SHA-1 |
| M3 | Ambient presence | Background location (add back `expo-task-manager` + permission), push notifications, battery check |
| M4 | Safe enough to share wider | Outside security review, forward secrecy, Sentry, server-side expiry (needs paid plan) |
| M5 | Public path | Phone auth (native SDK), App Check, Play Store location review |

Feature ideas beyond prototype: [FEATURES.md](FEATURES.md).

---

## 🔗 Links

**This repo**
- [README](README.md) — what app is + every command
- [STATUS](STATUS.md) — current state, open items
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
