---
name: expo-devops
description: Development builds, Firebase emulators, CI and dependency maintenance for this Expo project.
---

# Expo development operations

Use `docs/development-setup.md` and the committed `package.json`, `eas.json` and
`.github/workflows/checks.yml` as the current configuration. Fetch current Expo
documentation before changing SDK or build settings.

## Local tools and startup

On Windows, open `Dev-Terminal.cmd` for the project’s Node 22 and Java 21 tools.
Use `npm ci` with normal peer dependency checks. Do not add `--legacy-peer-deps`.

```bash
npm run emulators
npm run seed
npm run web                 # browser map shim
npm run start:dev           # installed native development client
```

Emulators use `--project demo-us-app`: Auth 9099, Firestore 8088, UI 4000.
Use the existing connection helpers in `src/config/firebase.ts`; do not duplicate them.
Only stop processes started for your task, by their recorded PID or terminal.
Never kill all Node or Java processes to restart this project.

## Android development build

The project uses Expo SDK 58 and a custom development client. Rebuild the client
when native packages or config plugins change. Old SDK 54 Expo Go cannot run it.

```bash
npx eas-cli@25.3.0 login
npm run android:cloud       # internal development APK; requires EAS project linking
npm run start:dev
```

`npm run android` builds locally with `expo run:android`; a full Android SDK,
build tools and NDK are required in addition to adb. Windows cannot build iOS locally.
No automatic publishing, store submission, Firebase deployment or OTA update is configured.

## Environment

`EXPO_PUBLIC_USE_EMULATORS=true` selects local Firebase in development.
`false` selects the real backend. The development EAS profile uses `true`.
`FIREBASE_ENV` is not consumed by this app. Public Expo variables are included in
the client bundle and must never contain server credentials.

## Checks

```bash
npm run typecheck
npm test
npx expo install --check
npx expo-doctor@latest
npm run check:emulators
npm audit
```

`check:emulators` starts temporary emulators, seeds fixtures, runs the real map
functions and rules checks, then stops its own instance. Existing instances must
be stopped in their own terminal first. Three security regressions are known
failing TODOs; CI warns about them. Passing development checks does not establish
release readiness. Fixes are tracked in the workspace security audit.

The CI workflow runs checks only. See [CI notes](references/ci-cd.md) and
[testing notes](references/testing.md).
