# us-mobile

**us** = location-based social app for meeting friends in person. Share location only where
you choose. Map gatherings. DM + group chat. Built with Expo, React Native, Firebase.
Nonprofit.

**Now working on:** Milestone 1 — friends install APK and chat. See **[PLAN.md](PLAN.md)**.
State today: [STATUS.md](STATUS.md).

## Commands

All commands from repo root. Windows: open `Dev-Terminal.cmd` first (picks Node 22 + Java 21),
use `npm.cmd` / `npx.cmd` in PowerShell. More on toolchain: [development setup](docs/development-setup.md).

### Setup

| Command | Does |
|---|---|
| `npm ci` | Install exact deps from lockfile. No `--legacy-peer-deps` needed |
| `npx firebase login` | One time. Needed for deploy + prod scripts |
| `npx eas-cli@25.3.0 login` | One time. Expo account for APK builds |

### Run local (browser, fake backend)

Two terminals.

| Step | Command | Does |
|---|---|---|
| 1 | `npm run emulators` | Firebase emulators (Auth 9099, Firestore 8088, UI http://localhost:4000) |
| 2 | `npm run seed` | Fill emulators with 5 test people, chats, gatherings |
| 3 | `npm run web` | App in browser → http://localhost:8081, auto sign-in as `dev-user` |
| opt | `npm run freshen` | Keep seeded people "fresh" on map (else they go stale after 5 min) |

Browser map is a fake (`src/dev/fakeMaps.tsx`). Good for data/logic/UI, not native map.

### Run on phone (development client)

| Command | Does |
|---|---|
| `npm run android:cloud` | Build dev-client APK in EAS cloud (talks to your emulators) |
| `npm run start:dev` | Metro for the dev client. Phone + PC on same network |
| `npm run android` | Local native build. Needs full Android SDK + NDK |

Old Expo Go can NOT run this app (SDK 58 + Maps 1.29).

### Check

| Command | Does | Needs emulators? |
|---|---|---|
| `npm run typecheck` | TypeScript. Must pass before commit | no |
| `npm test` | Map projection, group pins, Metro proxy tests | no |
| `npm run check:emulators` | Starts own emulators, seeds, runs everything below, stops | no (stop other emulators first) |
| `npm run verify` | Projection + group pins + rules checks on live data | yes, seeded |
| `npm run verify:sdk` | Real Firebase SDK sign-in + read + listener | yes, seeded |
| `npm run test:rules` | Negative rules tests. 3 known privacy TODOs fail on purpose | yes |
| `npx expo install --check` | Deps match Expo SDK | no |
| `npx --yes expo-doctor@latest` | Expo project health | no |
| `npm audit` | Dep advisories ([known ones](docs/dependency-audit.md)) | no |

### Real backend (prod `us-v1-ff6b3`)

| Command | Does |
|---|---|
| `npx firebase deploy --only firestore` | Push `firestore.rules` + `firestore.indexes.json` |
| `npx firebase deploy --only firestore:rules` | Push rules only |
| `node src/dev/provisionTesters.js --count 20` | Make tester accounts → `testers-credentials.csv` (gitignored, private) |
| `node src/dev/provisionTesters.js --emulator --count 3` | Same, on emulators |

### Ship to testers

| Command | Does |
|---|---|
| `npm run apk` | Build preview APK (real backend) in EAS cloud → install link |
| `npx eas-cli@25.3.0 update --channel preview --message "fix ..."` | Send JS-only fix to installed APKs (no reinstall) |

Native change (new package, app.json plugin, permissions) → new `npm run apk`.
Full runbook: [tester distribution](docs/tester-distribution.md).

### Good to know

- Emulators MUST run with `--project demo-us-app` (script does it). Auth lives there, Firestore data under `us-v1-ff6b3`.
- Firebase CLI needs Java 21.
- After editing `firestore.rules`: restart emulators + reseed (hot reload lies).
- Dev build uses emulators. Set `EXPO_PUBLIC_USE_EMULATORS=false` to hit real backend from dev.

## Current limitations

- APK on SDK 58 not built or phone-tested yet (Milestone 1 step 2–3).
- CI workflow (`.github/workflows/checks.yml`) not yet seen green on GitHub.
- 3 rules tests fail on purpose: known privacy holes, not fixed yet.
- Some dep advisories remain: [dependency audit](docs/dependency-audit.md), `npm audit` for live list.
