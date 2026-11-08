# Distributing the App to Testers

> How to get **us** onto other people's phones with the fixed tester accounts.
> Android only (Phase 3 decision D2). Written 2026-06-11, checklist updated 2026-11-08.
> Options beyond this manual flow: `docs/plans/2026-11-08-invites-and-distribution.md`.

## The short version

1. You build a **preview APK** once with EAS — Expo's cloud build service. It gives you a
   **shareable install link** (no Play Store, no review, no developer account fees).
2. You send each tester the link + one line from `testers-credentials.csv`
   (their Account ID + password).
3. They install the APK, open the app, sign in, change their display name, and add each
   other by `@handle`. Done.

**Why not Expo Go?** Expo Go only runs the app while YOUR dev machine serves it (same
network or a tunnel), against YOUR local emulators — useless for someone across town.
A standalone APK talks to the real Firebase backend from anywhere. (Expo Go also has the
broken-marker bug; the APK ships the fixed maps library.)

## Prerequisites checklist

Status as of 2026-11-08 (this `main` line, backend `us-v1-ff6b3`):

- [x] Fixed tester accounts system (`src/dev/provisionTesters.js` + sign-in screen)
- [x] Production Firestore config (`.firebaserc`, rules, indexes) — first deploy 2026-06-14
- [x] Email/Password sign-in enabled in the Firebase console (2026-06-14)
- [x] 20 accounts provisioned (`tester01`…`tester20`, `testers-credentials.csv`, gitignored)
- [x] EAS project linked (`@lomasas-team/us-mobile`, 2026-06-14) — **don't run `eas init` again**;
      `eas.json` has development / preview / production profiles
- [x] react-native-maps 1.29.11 (the clipped-marker fix) is installed
- [ ] **Deploy the current rules with the build**: `firebase deploy --only firestore:rules` —
      the group-leave and 2026-11-06 privacy rules are emulator-only so far
- [ ] **Google Maps billing** on the Maps key's Cloud project (STATUS, USER ACTION 5) —
      without it every tester sees a grey map
- [ ] Build the preview APK (below) and smoke-test it on your own phone first

`distribution: "internal"` in the `preview` profile is the key — it produces an installable
APK with a shareable URL instead of a store submission. Log in once with the Expo account
that owns the project: `npx eas-cli@25.3.0 login`.

## Building and sharing

```powershell
npx eas-cli@25.3.0 build --platform android --profile preview
```

(`npm run android:cloud` is the *development client* for you, not the tester APK.)

- Takes ~10–25 min in Expo's cloud (free tier queue). When it finishes, the terminal and
  https://expo.dev print a **build page link** ending in an APK download.
- Send testers that link (WhatsApp/Signal/email — anything). It's a normal HTTPS URL.
- Rebuilds are only needed for native changes; JS-only fixes ship instantly to installed
  apps via `eas update` (OTA, configured in Step 4).

## What each tester does (copy-paste this to them)

Faster: generate one ready-made message per tester (link + their own Account ID and
password) with one-tap SMS / Email / WhatsApp / Copy buttons — nothing is sent for you:

```powershell
node src/dev/testerInvites.js --link <APK install link> --handle <your handle>
```

It writes `testers-invites.html` (gitignored — it holds the passwords; delete it when done).
`--only` / `--skip` pick accounts, `--print` prints plain text, `--template <file>` uses your
own wording. Background and options: `docs/plans/2026-11-08-invites-and-distribution.md`.

> 1. Open the link on your Android phone and download the APK.
> 2. Android will warn about installing unknown apps — allow it for your browser
>    (Settings prompt appears automatically; it's our app, not store-reviewed yet).
> 3. Open **us**, swipe through the intro, and sign in with the **Account ID** and
>    **password** I sent you (e.g. `tester07` / `echo-frost-42`).
> 4. Allow location when asked — the app shows you to friends ONLY while you're inside
>    a place you define yourself (and you can go ghost anytime).
> 5. Settings → **My Account** → change your display name to whatever you like.
> 6. Add me from the Chats tab → person-plus icon (or the **Add Friend** button) →
>    type my handle.
> 7. Optional: Settings → **My Spots** → add a place (search an address like on Google
>    Maps, or tap the map) — that's where friends can see you.

## Managing the accounts

- **Credentials**: `testers-credentials.csv` (repo root, gitignored). One row per account —
  distribute rows individually, never post the whole file in a group chat.
- **Who got which account**: add a `givenTo` note column in your own copy if helpful.
- **Password reset**: the fake `@us.test` emails can't receive reset mail. Reset in the
  Firebase console (Authentication → Users → ⋮ → Reset password) or delete the auth user
  and re-run the provisioning script (it recreates missing accounts and updates the CSV).
- **More accounts**: bump `--count` (e.g. `--count 30`) and re-run — existing accounts are
  untouched (their profiles and chosen names survive; the script only fills gaps).
- **Wiping a test round**: deleting users/data in the production console is manual for
  now; a service-account admin script is in the Phase 3 deferred ledger if rounds get
  frequent.

## Known limitations to tell testers about

- Background presence (app closed) doesn't work yet — Phase 3 Step 5.
- Crashes aren't auto-reported until Sentry lands (Step 6) — ask them to screenshot.
- One account per person; the account is shared infrastructure — anything they put in it
  is visible to you (trusted-tester posture).
