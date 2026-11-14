# us-mobile — Project Memory
> Only committed gotchas file. Read at session start. Add gotcha when found. Short.
> Plan: [PLAN.md](../PLAN.md) · Commands: [README](../README.md#commands)

## People
- Pål — owner, Malmö. Nonprofit, open-source minded. Studies at Hyper Island.
- Felix (`FSopelsa`) — lead developer. His branches win conflicts (`felix/dev-setup` merged 2026-10-29).

## Firebase
- Only backend: `us-v1-ff6b3` (back from Felix's `us-felix-test-20261030` on 2026-11-09), hardcoded in `src/config/firebase.ts` + `.firebaserc` + the dev scripts/tests (`EMULATOR_PROJECT_ID`/`FIRESTORE_PROJECT` — the emulator stores Firestore data under the app's projectId, so all must match). Env-driven config broke OTA (`eas update` doesn't read build profile env). Package `com.us.mobile`. Spark (free) plan: TTL policies need billing. Expo project: `lomasas-team` (`b9ed9b69-…`); `fsopelsa`'s project (`d74d2bb5-…`) is no longer used — OTA updates only reach APKs built by the same Expo project.
- **Firebase web API keys are not Maps keys**: `AIzaSyCQE2t2…` (us-v1-ff6b3) and `AIzaSyBzq…` (us-felix-test) are Firebase client keys. Never add Android-app restrictions to them — the JS SDK sends no Android package/SHA-1 headers, so sign-in would break. The Maps key is the separate one in `app.json`.
- Friends rule needs `requestId` on friend docs + pending request. Chat update = `lastMessage*` or self-leave only. New chat/gathering field write → update rules too.
- Auth: Email/Password (testers). Phone/OTP screens removed (git history); public release → `@react-native-firebase/auth`.
- **`firebase deploy --dry-run` is not dry**: it enabled the Firestore API and created `us-felix-test`'s database in `nam5`. `firebase.json` `firestore.location: eur3` is only used when deploy has to CREATE a database (firebase-tools `prepare.js`, on 404) — it never moves or checks an existing one.
- Emulators: Auth 9099, Firestore 8088, UI 4000.

## Collections
- `users/{uid}` — profile, settings, `currentSignal`
- `users/{uid}/friends/{friendId}` · `users/{uid}/friendRequests/{id}` · `users/{uid}/spots/{spotId}` (owner-only read)
- `locations/{uid}` — `envelope` (sealed position + spot), friends-only read, `expireAt` +24h
- `publicKeys/{uid}` — encryption public key, get-only, owner writes
- `handles/{handle}` — unique handle lookup
- `chats/{chatId}` (+ `/messages/{id}`) · `broadcasts/{id}` (gatherings)

## Build / deps
- Expo 58 / RN 0.88 / React 19.3 / TS 6 / Maps 1.29.11. Native pkgs via `npx expo install` (SDK matrix). Plain `npm ci`, no `--legacy-peer-deps`.
- Never downgrade Firebase/NativeWind or swap Expo/Router majors alone to quiet `npm audit`. Overrides + advisories: `docs/dependency-audit.md`.
- npm 10 keeps stale nested versions after incremental install → check `npm ls --all` + lockfile.
- NativeWind 4.2.7 + react-native-css-interop 0.2.7 need Tailwind **v3** (not v4). Tailwind needs `darkMode: 'class'` for web.
- babel.config.js: nativewind/babel preset + reanimated plugin.
- TS paths relative to project root, no `baseUrl`.
- `npm test` / verify scripts run COMPILED production code (`npm run build:checks`, Node16 output) → modules they import need RELATIVE imports, not `@/` (type-only `@/types` ok).
- Firebase CLI 15 needs Java 21. Windows: `Dev-Terminal.cmd`.
- **Expo SDK patch releases turn CI red with no code change** (`expo install --check` / `expo-doctor` find drift) → `npx expo install --fix` (patch bumps only). CI runs these two drift checks LAST so they can't hide the real checks (they did, 2026-11-02 → 11-08).
- **Metro warning "expo-router contains an invalid package.json … router-store.js does not exist" = Sentry, harmless**: `@sentry/react-native` 8.28 `require`s an expo-router internal removed in SDK 58 (inside try/catch → just no route names in Sentry). Fixed in Sentry 8.34; let `expo install --fix` pick it up when Expo's SDK pin moves.
- Expo Go can NOT run the app (SDK 58 + Maps 1.29). Use dev client (`npm run android:cloud`) or browser.

## EAS / release
- `eas.json`: development (dev client APK, emulators) · tester (APK — M1) · production (AAB). `appVersionSource: local` (app.json owns versionCode).
- app.json `runtimeVersion: { policy: "fingerprint" }` → any native change = new runtime, OTA won't reach old APKs → rebuild.
- `google-services.json` gitignored, NOT needed (JS SDK, no `googleServicesFile`).
- **Google Maps = billing, not code** (2026-11-08): key in app.json (`AIzaSyDbe2K0…`, not a Firebase key — probably in `us-v1-ff6b3`'s Cloud project) is valid, but its Cloud project has NO billing → every Maps API answers `403 … You must enable Billing` → phone shows grey grid + Google logo (logcat "Authorization failure"). Probe: `curl "https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=2x2&key=<KEY>"` — "invalid" = bad key, "enable Billing" = no billing, "not authorized" = restricted/API off. Maps SDK for Android is free but needs billing linked; link billing + enable API + restrict key (Maps SDK for Android only; `com.us.mobile` + each signing SHA-1) in ONE sitting — key is committed and extractable from any APK anyway. Steps: STATUS "Open — needs you".
- EAS login/build run under user's Expo account. Can't script from here.

## Testing
- **Browser runs whole app incl. map**: `metro.config.js` swaps `react-native-maps` → `src/dev/fakeMaps.tsx` on web and proxies emulator traffic same-origin (`/identitytoolkit*`→9099, `/google.firestore.v1.Firestore` + `/v1/projects`→8088). Not a test of native markers or Google Maps.
- **Web map shim = real streets** (2026-11-08): Web Mercator (`src/dev/webMercator.ts`, unit-tested) over darkened OpenStreetMap tiles. Drag pans, wheel/± zooms, taps report the TAPPED coordinate (before: always map center). Inside a scrolling form a plain wheel scrolls, Ctrl+wheel/pinch zooms. `EXPO_PUBLIC_DEV_MAP_TILES=off` = old grid (offline), or a `{z}/{x}/{y}` template.
- **Web `502 … Emulator proxy error (port 9099): ECONNREFUSED` / `auth/network-request-failed` = emulators not running**, not an app bug. `🔥 Firebase emulators connected` only means the client is configured. Start `npm run emulators` (Java 21), `npm run seed`, reload.
- **`CI=1 npx expo start` serves STALE code**: CI mode turns off Metro's file watcher. In cloud sessions start Metro with `NODE_ENV=development npx expo start --web < /dev/null`; `CI=1` only for one-shot `expo export`.
- **Blocking prod in Playwright: match the hostname** (`/(^|\.)googleapis\.com$/.test(url.hostname)`), not the URL — emulator traffic goes through `localhost:8081/identitytoolkit.googleapis.com/...`.
- **Metro proxy**: after upstream headers sent, a later error must close the response, not write a 2nd 502 header (`tests/metro-proxy.test.cjs`).
- **Map bugs checkable without device**: emulators → `npm run seed` → `npm run verify`. Reads live data through app's real path.
- **Privacy rules**: fake friendship + creator rewrite blocked, tested on emulator only, not deployed, no full audit.
- Two phones on dev build: both auto-sign-in as `dev-user` → phone B: Settings → Developer → Switch Account.
- Seed timestamps go stale after 5 min → `npm run freshen`.

## Encryption
- User content only exists as envelopes in Firestore; `src/lib/firestore.ts` decodes, screens see plain values. Rules refuse plain text, so new stored text must go through `sealValue`/`openValue`.
- Seeded personas use fixed keys (`devKeyPair`) so `npm run seed` can encrypt fixtures. `seed` runs `build:checks` first. Verify scripts decode via `src/dev/devDecode.js`.
- Rules tests: `createdAt`/`lastMessageAt`/`updatedAt` must equal `request.time`, so REST writes need `updateTransforms` (see `commit` in `tests/security.rules.test.cjs`).
- `friendRequests` create checks the recipient's `settings.allowFriendRequests` via `acceptsFriendRequests()`: a missing profile or setting counts as allowed (default).
- **Cloud env sets `NODE_ENV=production`**: plain `npm ci` skips devDependencies (`firebase-tools`, so no emulators). Use `npm ci --include=dev`. For the web app run `NODE_ENV=development npx expo start --web`: under production `__DEV__` is false and the app would use the PRODUCTION backend.

## Firebase gotchas
- **Auth emulator uses its DEFAULT project** for key-based calls → auth users live in `demo-us-app`, Firestore data under `us-v1-ff6b3`. Emulators MUST start with `--project demo-us-app`. Mix-up = `auth/user-not-found`.
- **Emulator enforces rules on client SDK.** Cross-user seed/admin writes → REST `:commit` with `Authorization: Bearer owner`. Rule tests must use real user tokens (`Bearer owner` bypasses rules).
- **Multi-user batches**: rules must allow EVERY write as caller. Friends rule = `auth.uid == userId || auth.uid == friendId`.
- **Emulator rules hot-reload lies (Windows)**: says "Rules updated" but keeps old compile. Restart emulator + reseed after editing rules. Tell: error line numbers don't match file.
- **Prod index ≠ emulator**: emulator never enforces composite indexes. `==` + `array-contains` (chats) needs one in prod.
- **Prod sign-in errors**: prod returns `INVALID_LOGIN_CREDENTIALS` for missing user AND wrong password (emulator says `USER_NOT_FOUND`). `provisionTesters.js` handles all three.
- **Auth persistence restores ASYNC**: never read `auth.currentUser` sync at boot. `ensureDevUser` waits for first `onAuthStateChanged`.
- **RN auth persistence import**: `getReactNativePersistence` only in `@firebase/auth` react-native entry → `@ts-expect-error` in `src/config/firebase.ts`. Not from `firebase/auth`. `initializeAuth` throws on 2nd call (Fast Refresh) → try/catch fallback to `getAuth`.
- `getDoc()` ok for button actions / post-login checks. "Always onSnapshot" = reactive UI reads.

## Accounts
- Dev personas (`dev-user`, alice, bob, charlie, dana, eve @ `@test.dev`) = `__DEV__` + emulator only.
- Prod testers (`testerNN` @ `@us.test`) = only via `provisionTesters.js`. Creds in gitignored `testers-credentials-<project>.csv` (us-v1-ff6b3's June run wrote plain `testers-credentials.csv`; the script falls back to it when the project file is missing). `.test` mail can't receive reset mail → reset in console.
- Keep them apart: NEVER put tester ids/emails in `src/dev/fixtures.json` or `DEV_ACCOUNTS`. Never point dev tooling at prod.

## React / UI gotchas
- `as const` arrays + useState = narrow literal types → `useState<string>()`.
- Platform splits: Metro picks `.native.tsx`, tsc doesn't → keep plain `.tsx` re-export barrel. `app/` routes get pulled into web bundle anyway (hence maps resolver).
- `MapView` in `.native.tsx`: `import type MapView`.
- **Fan-out subscriptions need a stable string key**: `Array.from(set).sort().join('|')` as dep, not a fresh array (else N listeners rebuilt every snapshot). See `profileIdKey` in `app/(tabs)/chats.tsx`.
- DMs: `ChatSummary.name` is `null`, client resolves peer name. Map group names need `c.name !== null` predicate.
- Tabs: no NativeWind `className` for tab bar → inline styles with COLORS ok. `tabBarInactiveTintColor` takes rgba string.
- **expo-router 58: `href: null` makes route UNREACHABLE** (rewritten to `hidden: true`). Hide tab with `tabBarButton: () => null` + `tabBarItemStyle: { display: 'none' }`.
- Floating glass tab bar (~80px, absolute): scroll screens `pb-24`, bottom controls `bottom ≥ 96`. Don't import `useBottomTabBarHeight`.
- Settings = tab list + full-screen routes in `app/settings/*` (outside `(tabs)`). No `settings/index.tsx`.
- RN-web: `Modal animationType="slide"` never closes → `'none'` on web. `Alert.alert` is no-op on web → `window.confirm` fallback for destructive actions. Close modals BEFORE `router.push`.

## Map / presence
- Named group pins (`src/features/map/groupPins.ts`): members together → decorate live cluster; apart → pin at `fixedLocation`. Proximity wins. Fixed pins don't absorb visible members.
- Chat presence + map share ONE cluster universe: feed full friend list, sorted by id. Never a chat's member subset.
- Spot tier "2 at Home" needs same name+emoji AND overlapping zones. `LocationPresence.spot` snapshot is the only way to see a friend's spot — don't relax spots rule.
- Old marker clipping (Maps 1.20.1 + New Arch, rnm #5877/#5655) = library bug, no JS fix. Maps 1.29 maybe fixes — check on dev build. Keep marker rules: no `tracksViewChanges`, `collapsable={false}` fixed-size root, no looping Animated.

## Prototype reference
- Web prototype in `.context/prototype/src/` (done, won't change). Index: `.context/prototype/prototype-map.md`. Skill: `prototype-reference`. Read map first → fetch 1–2 files → adapt to RN.
