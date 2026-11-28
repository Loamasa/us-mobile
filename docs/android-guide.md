# Android with working map and login — step by step

> What to do, in order, to get a tester APK where sign-in and the map both work.
> Details live in the linked runbooks; this page only sets the order.

Already done: rules + indexes deployed to `us-v1-ff6b3` (2026-11-25), tester accounts
recreated (2026-11-27), tester APK `c15413c4-…` with the OpenStreetMap map and guest sign-in
built under Expo `fsopelsa` (2026-11-28) and checked on the emulator.

## A. Login (about 15 min)

1. **Tester passwords** are in the gitignored `testers-credentials-us-v1-ff6b3.csv`.
   Re-check any time: `node src/dev/provisionTesters.js --count 20`.
   Lost the file? Firebase console → `us-v1-ff6b3` → Authentication → Users → reset the
   password of `tester19` and `tester20` (your own test accounts).
2. **Sign-up stays open**: "Continue as guest" needs it (guests allowed since 2026-11-27).
   Closing it (Authentication → Settings → User actions) would block guests too.

The app has no sign-up screen. People sign in with a tester account or as a guest.

## B. Map (about 5 min, no Google account needed)

Android uses the same OpenStreetMap map as the browser (`src/dev/fakeMaps.tsx`, picked in
`metro.config.js`). No Maps key, no billing. Drag to pan, pinch or +/- to zoom.

3. **Nothing to do**: the map is built into tester APK `c15413c4-…` (2026-11-28).
   Later map fixes that are JS-only can go out as an OTA update to that APK.

Limit: OSM's free tiles are for light use (fine for ~20 testers). A public release needs
another tile source. The Google key steps in [maps-key-hardening.md](maps-key-hardening.md)
are no longer needed for Android.

## C. Test on a phone

4. On the Android phone, open the APK link (expo.dev → `fsopelsa` → us-mobile → Builds →
   the build's `.apk` download), allow "install unknown apps", install.
5. Sign in as `tester19`. Allow location. Dark street map = B worked.
6. On a second phone (or a friend's) sign in as `tester20`. Add each other by `@handle`,
   DM, group, leave group, close and reopen the app (still signed in).
7. Then hand out the rest: [tester-distribution.md](tester-distribution.md#message-for-testers).

JS-only fix after this → OTA update, no reinstall. Native change → new `npm run apk`
(commands: [README](../README.md#ship-to-testers)).
