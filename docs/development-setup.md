# Local development

This project uses Expo SDK 58, React Native 0.88, React 19.3, NativeWind 4 and
Tailwind CSS 3. Native package versions follow Expo's SDK matrix. Use
`expo install`, and keep the committed lockfile. Do not use `npm audit fix --force`.
The upgrade followed [Expo's migration guidance](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

## Windows tools

Open `Dev-Terminal.cmd` in the project. It selects side-by-side tools for that
terminal without changing system-wide settings:

| Tool | Installed version / location |
| --- | --- |
| Node.js / npm | 22.23.4 / 10.9.9; `%LOCALAPPDATA%\us-mobile-toolchain\node-v22.23.4-win-x64` |
| Java JDK | Temurin 21.0.12.1; `%LOCALAPPDATA%\us-mobile-toolchain\jdk-21.0.12.1+1` |
| Firebase CLI | 15.34.1, project dev dependency |
| Android platform tools | adb 37.0.1; `%LOCALAPPDATA%\Android\Sdk\platform-tools` |

The Node/Java archives were verified against vendor SHA-256 checksums; adb against
Google's repository checksum. `.nvmrc` and `.java-version` record the runtime versions.
On another Windows machine, install the matching ZIP distributions from
[Node.js](https://nodejs.org/dist/v22.23.4/) and
[Adoptium](https://adoptium.net/temurin/releases/?version=21), verify checksums and
extract to those paths. macOS/Linux can use their normal runtime version manager.

Alternatively, activate the tools in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\scripts\Use-ProjectToolchain.ps1
npm.cmd ci
```

Use `npm.cmd` / `npx.cmd` in PowerShell. Normal peer validation works; no
`--legacy-peer-deps` is needed. The launcher uses a process-only execution-policy
bypass because Windows blocks unsigned `.ps1` files by default.

## Start the browser app

Open two project terminals. In the first:

```powershell
npm.cmd run emulators
```

After emulators are ready, in the second:

```powershell
npm.cmd run seed
npm.cmd run web
```

Open the displayed Metro URL, normally `http://localhost:8081`.
The browser renders the real map screen through `src/dev/fakeMaps.tsx`; this does
not validate native marker rendering or location permissions.

Auth uses emulator project `demo-us-app`; Firestore uses `us-v1-ff6b3`.
Keep `--project demo-us-app` on the emulator command. Ports: Auth 9099,
Firestore 8088, UI 4000. Seeds/verification modify local fixture records.
Stop only the relevant terminal/PID when restarting; never kill all Node/Java processes.
For emulator exports, use the same `TEMP`/`TMP` as the instance's starting terminal
so Firebase CLI can find its hub locator.

## Android development client

The upgraded Maps module requires a newly built client. The old SDK 54 Expo Go
binary cannot run this project. `expo-dev-client`, the Maps config plugin and an
internal Android APK profile are configured in `eas.json`.

When ready to use your Expo account:

```powershell
npx.cmd eas-cli@25.3.0 login
npx.cmd eas-cli@25.3.0 init
npm.cmd run android:cloud
```

`eas init` links or creates the account's EAS project and writes its real project
ID; choose the intended account/project interactively. No project ID has been
invented or provisioned. Cloud building was deferred at the user's request;
no APK has been produced or tested on a phone in this maintenance pass.

Install the resulting APK on the phone, then run:

```powershell
npm.cmd run emulators
# In another development terminal, after seeding:
npm.cmd run start:dev
```

Keep the phone and computer on the same reachable network. The client derives
the emulator host from Metro's host URI. Allow the emulator ports through the
local firewall for that network if necessary. Check sign-in, foreground location
permission/updates, friend/group markers and chat navigation on the phone.
NativeWind 4.2.7 explicitly documents SDK 57 support; SDK 58's exports and browser
path passed here, while native behavior remains to be checked in the new client.

The development profile uses `EXPO_PUBLIC_USE_EMULATORS=true`. Setting it to
`false` selects the real backend in development; public Expo variables are not
secret storage. Restrict the existing Google Maps key to the Android package
and the chosen signing certificate SHA-1 before distribution.

`npm.cmd run android` uses `expo run:android` for local compilation. Only adb is
installed on this machine: local compilation additionally needs Android SDK
platforms/build tools/NDK. Native source generation with `expo prebuild` was checked;
that is not a native compile. Windows cannot build iOS locally. No deployment,
store submission or OTA publishing is part of this setup.

## Checks and CI

```powershell
npm.cmd run typecheck
npm.cmd test
npx.cmd expo install --check
npx.cmd --yes expo-doctor@latest
npm.cmd run check:emulators
npm.cmd audit
```

`npm test` runs 17 regression tests: 14 against the production projection/group-pin
functions and three against the Metro proxy using Node's built-in runner and TypeScript. Generated files remain
ignored under `.expo/test-build`. `npm run verify` also imports those functions
against existing, freshly seeded emulators and exercises the original 17 rule checks. `npm run verify:sdk` validates real Firebase
SDK sign-in, a seeded profile read and a server-backed listener.

`check:emulators` starts temporary emulators, seeds fixtures, runs verification and
the new negative rules tests, then stops its own instance. First stop any other
instance occupying those ports. The new rules tests create disposable fixtures.
Two denial tests pass; **three privacy regressions currently fail as explicit TODOs**.
Those TODOs run and are printed as failures, but do not fail the development CI job.
They must become normal passing tests when the privacy fixes are implemented.

`.github/workflows/checks.yml` runs install/typecheck/tests, Expo validation,
Android/web Metro exports and emulator checks on pushes and pull requests.
It reports dependency advisories and open privacy regressions. It does not build
native APKs or deploy. Its commands were exercised locally; a hosted Actions run
requires committing/pushing the workflow, which has not been done.

## Dependency security

The latest audit reported **11 affected package entries: 3 high, 3 moderate, 5 low**.
See [the audit and override assessment](dependency-audit.md) for exact paths,
advisories, compatibility evidence and upstream limitations. The remaining
advisories are in development/signing/CLI dependencies. The separate application
privacy findings are still open; this project is ready for continued development,
not cleared for a public release.
