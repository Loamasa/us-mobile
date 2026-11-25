# Android with working map and login — step by step

> What to do, in order, to get a tester APK where sign-in and the Google map both work.
> Details live in the linked runbooks; this page only sets the order.

Already done (2026-11-25): rules + indexes deployed to `us-v1-ff6b3`, tester APK built under
Expo `fsopelsa` (build `7809a060-…`), OpenStreetMap map for Android in code (2026-11-26).

## A. Login (about 15 min)

1. **Get tester passwords.** Copy the June `testers-credentials.csv` into the repo root, then run
   `node src/dev/provisionTesters.js --count 20`. It checks every account and saves
   `testers-credentials-us-v1-ff6b3.csv`.
   Lost the file? Firebase console → `us-v1-ff6b3` → Authentication → Users → reset the
   password of `tester19` and `tester20` (your own test accounts).
2. **Close sign-up** once the accounts are final: Authentication → Settings → User actions →
   untick sign-up.

The app has no sign-up screen. Only these accounts can sign in.

## B. Map (about 5 min, no Google account needed)

Android uses the same OpenStreetMap map as the browser (`src/dev/fakeMaps.tsx`, picked in
`metro.config.js`). No Maps key, no billing. Drag to pan, pinch or +/- to zoom.

3. **Get the map into the APK**: it is a JS-only change, so send it as an update:
   `npx eas-cli@25.3.0 update --channel tester --environment preview --message "OSM map on Android"`.
   An APK picks it up on its second start. If the update does not arrive, build a new APK
   with `npm run apk` (the change is then inside it).

Limit: OSM's free tiles are for light use (fine for ~20 testers). A public release needs
another tile source. The Google key steps in [maps-key-hardening.md](maps-key-hardening.md)
are no longer needed for Android.

## C. Test on a phone

4. On the Android phone, open the APK link from the build page
    (expo.dev → `fsopelsa` → us-mobile → Builds), allow "install unknown apps", install.
5. Sign in as `tester19`. Allow location. Close and reopen the app once (loads the update).
   Dark street map = B worked. Grey Google map = the update did not arrive (see step 3).
6. On a second phone (or a friend's) sign in as `tester20`. Add each other by `@handle`,
   DM, group, leave group, close and reopen the app (still signed in).
7. Then hand out the rest: [tester-distribution.md](tester-distribution.md#message-for-testers).

JS-only fix after this → OTA update, no reinstall. Native change → new `npm run apk`
(commands: [README](../README.md#ship-to-testers)).
