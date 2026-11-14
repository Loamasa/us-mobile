# Google Maps key hardening (Android)

The Maps key in `app.json` (`react-native-maps` plugin → `androidGoogleMapsApiKey`) ships
inside every APK, so it can't be hidden. Anyone can unzip an APK and read it, and it has
been committed to git since 2026-04-17. The protection is to **restrict** it so a copied
key is useless, and to put a **budget alert** on the project as a backstop.

What each restriction does:

- **API restriction → Maps SDK for Android only.** The key can draw the map and nothing
  else. Metered APIs (Geocoding, Places, Directions, …) refuse it even if someone copies
  it. Map loads through the Android SDK are free and unlimited.
- **Application restriction → Android app `com.us.mobile` + signing SHA-1.** Google only
  accepts the key from an app with that package name signed by our certificate (the
  keystore EAS signs our builds with; SHA-1 is its fingerprint).
- **Budget alert ($5/month).** Expected Maps spend is $0, so any real charge sends an
  email. A budget only **notifies**; it doesn't stop charges. The restrictions above are
  what block spending.

Honest limit: the package + SHA-1 check relies on headers the Android SDK sends. The
SHA-1 is public in any APK, so a determined person could fake them. That's why the API
restriction matters most: even then, the key unlocks only free map loads.

Not affected: **Expo Go** uses Expo's own Maps key, and **web** uses the `fakeMaps`
shim. Only our EAS-built APKs use this key.

## Status at 2026-11-14

`npm run check:maps-key` → **BILLING OFF** (same as on 2026-11-08): the key's Cloud
project has no billing account, so nothing can be charged today. But Google requires
billing for the Maps SDK for Android, so the map will not render in the first EAS APK
until billing is linked. The key is the original `AIzaSyDbe2K0…` (the 2026-11-09 swap to
`AIzaSyBzq…` was reverted: that one is a Firebase web key, see `.context/memory.md`).
**Do the steps in this order** so the key is never unrestricted *and* billable at the
same time: restrict (3) → trim APIs (4) → link billing (5) → budget (6) → verify (7).
No APK has been built under `lomasas-team` yet, so there is no signing SHA-1: do the
**API** restriction in step 3 now and add the Android-app restriction after the first
build.

## Where to run things

- **EAS commands**: your Windows `Dev-Terminal.cmd`, in the repo (same pinned CLI as
  `npm run android:cloud`).
- **gcloud commands**: [Cloud Shell](https://shell.cloud.google.com), signed in as an
  owner of the key's project (gcloud is preinstalled and signed in there). Each step also
  lists the Console click path if you'd rather click.

## 1. Find the project that owns the key

Copy the `androidGoogleMapsApiKey` value from `app.json`, then in Cloud Shell:

```bash
KEY_NAME=$(gcloud services api-keys lookup "PASTE_THE_KEY_HERE" --format='value(name)')
PROJECT_NUMBER=$(echo "$KEY_NAME" | cut -d/ -f2)
PROJECT_ID=$(gcloud projects describe "$PROJECT_NUMBER" --format='value(projectId)')
echo "$KEY_NAME  ($PROJECT_ID)"
```

If `PROJECT_ID` is the Firebase project `us-v1-ff6b3`, read the note in step 5 before
linking billing.

## 2. Get the signing certificate SHA-1

```bash
npx eas-cli@25.3.0 login
npx eas-cli@25.3.0 credentials -p android
```

Pick a build profile (start with `tester`, the one `npm run apk` builds), then copy the
keystore's **SHA1 Fingerprint** (`AA:BB:…`, 20 pairs). If it says no keystore is
configured, run the first `npm run apk` and let EAS generate one (STATUS "Open — needs
you" 4). The same SHA-1 is also shown at expo.dev → `lomasas-team` → us-mobile →
Credentials → Android → `com.us.mobile`.

Repeat for `development` and `production`. They normally share one keystore; if any shows
a different SHA-1, add it too in step 3.

## 3. Restrict the key

Console: APIs & Services → Credentials (in `PROJECT_ID`) → the key →
**Application restrictions: Android apps** → Add → package `com.us.mobile` + the SHA-1 →
**API restrictions: Restrict key** → tick only **Maps SDK for Android** → Save.

Or in Cloud Shell (replace the SHA-1; repeat `--allowed-application` per extra SHA-1):

```bash
gcloud services api-keys update "$KEY_NAME" \
  --api-target=service=maps-android-backend.googleapis.com \
  --allowed-application=sha1_fingerprint=AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD,package_name=com.us.mobile
```

`--allowed-application` replaces the whole list, so include every SHA-1 each time.
Changes can take a few minutes to apply.

**No SHA-1 yet (no APK built):** set only the API restriction now: Console → Application
restrictions: None, API restrictions: Maps SDK for Android; or the command above without
`--allowed-application`. Add the Android-app restriction once step 2 gives a SHA-1. A
wrong SHA-1 shows a grey map.

## 4. Turn off metered Maps APIs the app doesn't use

The app uses only the Maps SDK for Android (place search uses the device geocoder via
`expo-location` on native, Nominatim on web). List Maps Platform APIs enabled on the
project:

```bash
gcloud services list --enabled --project="$PROJECT_ID" --format='value(config.name)' \
  | grep -E 'maps|places|geocoding|directions|distance|routes|roads|elevation|timezone|geolocation|street|tile|addressvalidation|aerial'
```

Keep `maps-android-backend.googleapis.com`; if it isn't listed, enable it
(`gcloud services enable maps-android-backend.googleapis.com --project="$PROJECT_ID"`).
Disable each other line it prints:

```bash
gcloud services disable SERVICE_NAME --project="$PROJECT_ID"
```

Console: APIs & Services → Enabled APIs & services → each Maps API other than Maps SDK
for Android → Disable API. The app has no Street View, so if Maps SDK for Android → Quotas
lists a Street View limit, you can also set it to 0.

## 5. Link billing (needed for the map to render)

Console: Billing → Link a billing account (project `PROJECT_ID`). Or:

```bash
gcloud billing accounts list
gcloud billing projects link "$PROJECT_ID" --billing-account=XXXXXX-XXXXXX-XXXXXX
```

**If `PROJECT_ID` is `us-v1-ff6b3`:** linking billing moves Firebase from the free Spark
plan to pay-as-you-go Blaze. Firestore/Auth stay free within their quotas, and the step 6
budget covers them too. If you'd rather keep Firebase on Spark (where nothing can be
charged), create the Maps key in a separate Cloud project instead, restrict it as in
step 3, link billing there, and replace the value in `app.json`.

## 6. Create the $5 budget alert

Console: Billing → Budgets & alerts → Create budget → Scope: project `PROJECT_ID` →
Amount: 5 (specified amount) → alert thresholds 50%, 90%, 100% of actual spend → Finish.
Billing admins get the emails by default.

Or in Cloud Shell (the amount uses the billing account's currency, e.g. 5 EUR):

```bash
gcloud billing budgets create \
  --billing-account=XXXXXX-XXXXXX-XXXXXX \
  --display-name="us-mobile maps guard" \
  --budget-amount=5 \
  --filter-projects="projects/$PROJECT_ID" \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0
```

If gcloud asks to enable `billingbudgets.googleapis.com`, say yes.

## 7. Verify

From the repo (any OS):

```bash
npm run check:maps-key
```

- `✅ RESTRICTED` (exit 0): done.
- `⚠️ BILLING OFF` (exit 2): billing isn't linked yet (step 5); re-run after.
- `⚠️ INCONCLUSIVE` (exit 2): Google refused the probe for a reason other than the key,
  usually because step 4 turned the Geocoding API off. That says nothing about the key, so
  check the key itself: Console → the key → API restrictions must list only Maps SDK for
  Android. Or in Cloud Shell (`KEY_NAME` from step 1):
  `gcloud services api-keys describe "$KEY_NAME" --format='yaml(restrictions)'` →
  `apiTargets` must hold only `maps-android-backend.googleapis.com`.
- `❌ UNRESTRICTED` (exit 1): the key still reaches a metered API; redo step 3.
- `❌ INVALID KEY` (exit 1): `app.json` holds a key Google doesn't know.

Then install the EAS APK on the Pixel 7 and confirm the map renders. A blank or grey map
with the restricted key usually means a SHA-1 mismatch (the APK was signed by a keystore
not listed in step 3) or billing isn't linked.

## Later

- **Google Play:** Play re-signs the app with its own key. Add the **App signing key
  certificate** SHA-1 (Play Console → Test and release → App integrity) to step 3.
- **Local builds** (`npm run android` / `expo run:android`) are signed with the debug
  keystore. Add its SHA-1 if you start building locally:
  `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`.
- **New signing key:** add the new SHA-1 to step 3 before shipping that build.
