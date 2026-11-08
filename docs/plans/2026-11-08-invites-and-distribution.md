# Inviting testers + getting the app onto their phones — status and options

> Written 2026-11-08 (overnight session). Covers both lines: `main` and `fel/phase1`
> (Milestone 1 "Friends chat"). Nothing here is decided — the three decisions at the end
> are yours.

## Where it stands

**There is no in-app invite feature on either line.** Searched both: the only outgoing
message the app can create is Settings → "Report a Bug" (`mailto:`). Gathering "invites"
are friend-to-friend invites to a map event, not invites to the app.

**Distribution is a manual, documented process** (`docs/tester-distribution.md` on both lines):

1. Build an Android APK with EAS internal distribution → Expo gives a shareable HTTPS
   install link.
   - `main`: `eas build --platform android --profile preview` (no npm script;
     `npm run android:cloud` builds the *development client*, which is for us, not testers).
     Expo account `lomasas-team`.
   - `fel/phase1`: `npm run apk` (`tester` profile). Expo account `fsopelsa`.
2. Send each tester the link + their own row (Account ID + password) from the gitignored
   credentials CSV, by hand — SMS, WhatsApp, email, anything.
3. They install (allow "unknown apps" for the browser), sign in, set a name, add friends
   by `@handle`.

**Accounts are fixed** — 20 pre-made tester accounts, no self-registration (Phase 3 /
M1 decision). They exist on two different backends: `main` → `us-v1-ff6b3`,
`fel/phase1` → `us-felix-test-20261030`.

**No usable tester APK exists yet.** STATUS on `main` records no APK distributed; the
`fel/phase1` rundown mentions an Oct 30 build (`9baeca1c`) that no longer works with its
encrypted-data rules.

**New tonight:** `src/dev/testerInvites.js` turns the credentials CSV + the install link
into one ready-to-send message per tester, as a local page with **SMS / Email / WhatsApp /
Copy** buttons and a "sent to" note per card (works with either line's CSV name):

```bash
node src/dev/testerInvites.js --link <EAS install link> --handle <your handle> --skip tester19,tester20
```

It never sends or uploads anything; the page (`testers-invites.html`) is gitignored because
it contains the passwords. `--print` gives plain text instead; `--template` takes your own
wording (`{link} {accountId} {password} {inviterHandle}`).

## What blocks "invite by SMS/email" today

1. **No install link** — someone has to run the EAS build under the right Expo account.
2. **Which line ships** — the two lines use different Firebase projects and Expo projects;
   an APK from one cannot sign in to the other's tester accounts.
3. **Rules deploy** — both lines have undeployed Firestore rules that must go out with the
   first build.

## Getting the APK to testers — three channels

| | EAS internal link (today) | Firebase App Distribution | Google Play internal testing |
|---|---|---|---|
| How you invite | Any message with the link | Email from console/CLI, or one shareable **invite link** testers sign up through | Email list in Play Console + opt-in link |
| Tester needs | Android; allow "unknown apps" | Android + a Google account to accept | Android + Google account; installs from Play Store |
| Updates | JS: OTA (`eas update`). Native: new link | Email/app alert per new build | Automatic via Play |
| Cost / setup | Free; nothing to set up | Free; register the Android app in the Firebase project, upload each EAS APK with the CLI | One-time Play developer fee + account verification, AAB upload, store basics |
| Limits | Link changes per build | — | 100 internal testers; opt-in link only once the release is published |

Docs: [EAS internal distribution](https://docs.expo.dev/tutorial/eas/internal-distribution-builds/) ·
[App Distribution tester setup](https://firebase.google.com/docs/app-distribution/get-set-up-as-a-tester) ·
[App Distribution invite links](https://firebase.google.com/docs/app-distribution/create-invite-links) ·
[Play test tracks](https://support.google.com/googleplay/android-developer/answer/9845334) ·
[Play testing rules for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)

**Recommendation for M1:** keep the EAS link + `testerInvites.js` — zero setup, and it is
exactly the "send a link by SMS/email" flow. Switch to **Firebase App Distribution** if you
want testers to get an email for every new build (it lives in the same Firebase project you
already use). Play internal testing is the right home once you leave sideloading behind.

## How to try each channel

All three only get the app **installed**. Testers still sign in with a fixed Account ID +
password, so they still get their row (e.g. via `src/dev/testerInvites.js`). Commands below
are for `main` (Firebase `us-v1-ff6b3`, Expo `lomasas-team`); on `fel/phase1` use
`npm run apk`, its own Firebase project and the `fsopelsa` Expo account. Before the first
tester build on either line: deploy the current rules with it (STATUS USER ACTION 1), and
fix Maps billing (USER ACTION 5) or testers see a grey map.

### 1. EAS internal link — ready now (≈30 min + build queue)

1. `npx eas-cli@25.3.0 login` as the account that owns the project; check with `npx eas-cli@25.3.0 whoami`.
2. `npx eas-cli@25.3.0 build --platform android --profile preview`. First run: let EAS
   **generate the Android keystore** (it keeps it; every later APK must use the same one so
   updates install over the old app). The free plan queues builds (often 10–25 min) and has a
   monthly build allowance.
3. The terminal and expo.dev print the build page. Open it on **your** Android phone → Install →
   allow installs from the browser → Play Protect may say "unrecognised app" → install anyway.
4. Smoke test with a spare account (sign in, add a friend, DM, group, reopen the app).
5. `node src/dev/testerInvites.js --link <build page URL> --handle <you>` → send.
6. Later fixes: JS-only → `eas update` (OTA, same channel); native change → new build + new link.

### 2. Firebase App Distribution — email invites (≈30 min on top of an EAS build)

1. Firebase console → project → Project settings → **Your apps**: an Android app with package
   `com.us.mobile` must exist (`main` has `google-services.json`, so it most likely does;
   `fel/phase1`'s project may need "Add app → Android"). Copy its **App ID** (`1:…:android:…`).
2. Firebase console → **App Distribution** → Get started.
3. Build the APK as in channel 1 and download the `.apk` from the EAS build page.
4. Upload by dragging it into the console, or:
   `npx firebase login` then
   `npx firebase appdistribution:distribute us.apk --app <App ID> --testers "a@gmail.com,b@gmail.com" --release-notes "First test build"`
5. Testers get an email → **Get started** → sign in with a Google account → accept (invites
   expire after 30 days) → download and install. Android still asks to allow the install.
6. Optional: App Distribution → Testers & Groups → **invite link** — one link you can text to
   anyone; they enter their email themselves.
7. Every new upload emails the testers. Free.

### 3. Google Play internal testing — store install, auto-updates (days, mostly waiting)

1. Create a Google Play developer account (one-time fee, identity verification — can take days;
   an organisation account needs a D-U-N-S number).
2. Play Console → **Create app** (name, language, App, Free, declarations).
3. `npx eas-cli@25.3.0 build --platform android --profile production` (AAB).
4. Upload: Play Console → Testing → **Internal testing** → Create release → accept Google's
   app signing key → upload the `.aab` → roll out. Or automate with `eas submit` (needs a Google
   service-account key; current Expo docs say it can create the first internal release).
5. **Testers** tab → email list (their Google accounts, up to 100) → save → copy the opt-in link.
6. Testers open the link → Become a tester → install from the Play Store. Updates arrive like
   any store app; no "unknown apps" prompt.
7. Add Play's **app signing key SHA-1** (App integrity) to the Maps key restriction.
8. Expect Play to ask about sensitive permissions: the `main` build declares background
   location and camera (`fel/phase1` already blocks them).

**Suggested order:** channel 1 to your own phone first (it proves the build, the backend and
the map), then decide whether testers get it via the same link (1), by email (2) or the store (3).

Docs: [App Distribution CLI](https://firebase.google.com/docs/app-distribution/android/distribute-cli) ·
[Expo Submit for Android](https://docs.expo.dev/submit/android/) ·
[Maps key restrictions](https://developers.google.com/maps/documentation/android-sdk/get-api-key)

## In-app invites — what a real feature would be (after M1)

- **A. "Invite a friend" button** — React Native's built-in `Share.share()` opens the phone's
  share sheet (SMS, email, WhatsApp…) with the download link + your `@handle`. No new native
  module, so it can ship over the air. Needs a *stable* download URL (EAS links change per
  build → a tiny redirect page, or an App Distribution invite link) and, today, an account
  handed out by you.
- **B. Invite codes + self-registration** — the invitee installs, enters a code, creates their
  own account (their own password — this also removes the "admin knows your starting
  password" caveat of the encrypted line) and becomes friends with the inviter. Data model:
  `invites/{code}` `{ inviterId, expiresAt, usesLeft }`; Firestore rules allow creating a
  profile only together with consuming a valid code (same `getAfter` pattern as the
  friend-request proof). Works without Cloud Functions, but Auth sign-up must stay open —
  the opposite of M1 step 4 ("close sign-up"); strangers could create empty Auth accounts
  that the rules keep away from all data. Roughly 1–2 sessions incl. rules tests.
- **C. Deep link** — the app already has the `us://` scheme; `us://add/<handle>` in a message
  could open the add-friend sheet when the app is installed. Plain https links need Android
  App Links (`assetlinks.json` on a domain you control).

A+B+C together is the "invite people by SMS or email and they're in" experience.

## Decisions for you

1. **Which line ships first** — `main` (`us-v1-ff6b3`, Expo `lomasas-team`) or `fel/phase1`
   (`us-felix-test-20261030`, Expo `fsopelsa`, end-to-end encrypted). Everything else
   follows from this.
2. **Fixed accounts or invite codes** — keep the 20 fixed accounts for M1 (no code needed),
   or build B before inviting anyone.
3. **Channel** — EAS link (ready now), Firebase App Distribution, or Play internal testing.
