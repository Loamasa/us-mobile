# Local development

> Commands: [README](../README.md#commands). This page = toolchain + how pieces fit.

Expo SDK 58, React Native 0.88, React 19.3, NativeWind 4, Tailwind 3. Native packages follow
Expo's SDK matrix → add/upgrade with `npx expo install`, keep the lockfile.
Never `npm audit fix --force` (breaks framework versions).

## Windows tools

`Dev-Terminal.cmd` sets these for that terminal only (no system change):

| Tool | Version / location |
| --- | --- |
| Node.js / npm | 22.23.4 / 10.9.9 — `%LOCALAPPDATA%\us-mobile-toolchain\node-v22.23.4-win-x64` |
| Java JDK | Temurin 21.0.12.1 — `%LOCALAPPDATA%\us-mobile-toolchain\jdk-21.0.12.1+1` |
| Firebase CLI | 15.34.1, dev dependency (`npx firebase`) |
| adb | 37.0.1 — `%LOCALAPPDATA%\Android\Sdk\platform-tools` |

`.nvmrc` + `.java-version` hold versions. New Windows box: get the ZIPs from
[Node.js](https://nodejs.org/dist/v22.23.4/) and [Adoptium](https://adoptium.net/temurin/releases/?version=21),
check SHA-256, unzip to paths above. macOS/Linux: normal version manager.

PowerShell instead of the `.cmd`:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\scripts\Use-ProjectToolchain.ps1
```

## Emulators

- Auth = project `demo-us-app`, Firestore data = `us-v1-ff6b3`. Keep `--project demo-us-app`.
- Ports: Auth 9099, Firestore 8088, UI 4000.
- Seed + verify write local fixtures. Restart → stop only that terminal, never kill all Node/Java.
- Emulator export: use same `TEMP`/`TMP` as the terminal that started it.

## Browser

Real map screens run on a fake map (`src/dev/fakeMaps.tsx`). Metro proxies emulator traffic
same-origin. Does NOT test native markers or location permissions.

## Phone builds

| Profile | Command | Backend | Use |
|---|---|---|---|
| `development` | `npm run android:cloud` | your emulators | daily dev with `npm run start:dev` |
| `preview` | `npm run apk` | real Firebase | testers (Milestone 1) |
| `production` | — | real Firebase | Play Store AAB, later |

- Dev client finds emulators via Metro host. Phone + PC same network; open firewall ports if needed.
- Dev profile sets `EXPO_PUBLIC_USE_EMULATORS=true`. `false` → real backend. Public vars are not secrets.
- `npm run android` = local compile. Needs Android SDK platforms, build tools, NDK (not on this machine — only adb).
- iOS: not built. Windows can't anyway.

## CI

`.github/workflows/checks.yml`: install, typecheck, tests, Expo checks, Android/web Metro export,
emulator checks on push + PR. Warns about advisories + the 3 privacy TODOs. No APK, no deploy.

## Security

Dep advisories + privacy holes: [dependency-audit.md](dependency-audit.md).
Ready for development, not for public release.
