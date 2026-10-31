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

**Steps**
1. [ ] Push rules + indexes to prod: `npx firebase deploy --only firestore` (group-leave rule not live yet)
2. [ ] Build APK: `npm run apk` → EAS gives link ([how](docs/tester-distribution.md))
3. [ ] Smoke test: own phone + one friend. Sign in, add, DM, group, leave group, reopen app
4. [ ] Send each friend: link + one row from `testers-credentials.csv` ([message to copy](docs/tester-distribution.md#message-for-testers))
5. [ ] Fix only bugs that break chat. JS fix → OTA update. Native change → new APK

**Not in M1** — no work here until M1 done
- Background location · map polish · native marker check (map only must not crash)
- Sentry · privacy rule fixes · iOS · Play Store

**Known risk, accepted for M1:** trusted friends only. Rules still let a user fake a
friendship and read location ([details](docs/dependency-audit.md#app-privacy-holes)). Fix before
sharing wider.

---

## 🧭 Later (rough — will change after M1)

Pick next based on what M1 teach us. Order not fixed.

| # | Milestone | Idea |
|---|-----------|------|
| M2 | Map on phone | Markers + foreground location on real device. Restrict Maps key to package + SHA-1 |
| M3 | Ambient presence | Background location (`expo-task-manager`), battery check |
| M4 | Safe enough to share wider | Fix privacy rules, server-side `allowFriendRequests`, Sentry, Firestore TTL |
| M5 | Public path | Phone auth (native SDK), App Check, Play Store location review |

Feature ideas beyond prototype: [FEATURES.md](FEATURES.md).

---

## 🔗 Links

**This repo**
- [README](README.md) — what app is + every command
- [STATUS](STATUS.md) — current state, open items
- [Tester distribution](docs/tester-distribution.md) — build, share, manage accounts
- [Development setup](docs/development-setup.md) — toolchain, emulators, dev client
- [Dependency audit](docs/dependency-audit.md) — open advisories + privacy holes
- [Privacy notice](docs/privacy-notice.md) — legal draft
- [Changelog](docs/CHANGELOG.md) — what happened when
- [Archive](docs/archive/README.md) — old plans, done or replaced
- Skills: [firebase](.claude/skills/firebase/SKILL.md) · [realtime-data](.claude/skills/realtime-data/SKILL.md) · [geolocation-maps](.claude/skills/geolocation-maps/SKILL.md) · [expo-devops](.claude/skills/expo-devops/SKILL.md) · [react-native-expo](.claude/skills/react-native-expo/SKILL.md)

**Outside**
- [EAS internal distribution](https://docs.expo.dev/build/internal-distribution/) — APK link
- [EAS Update](https://docs.expo.dev/eas-update/introduction/) — OTA JS fixes
- [Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Expo SDK 58 docs](https://docs.expo.dev/)
