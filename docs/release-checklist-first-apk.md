# Release checklist — first tester APK

> One ordered run-through for shipping the first Android APK to the 20 tester accounts.
> Written 2026-11-21. Background and commands in detail: [tester-distribution.md](tester-distribution.md),
> [STATUS.md](../STATUS.md#open--needs-you).
> Tick boxes in your own copy (or in the PR) as you go.

**Why the order matters**

- The app on `main` writes encrypted envelopes and friend-request proofs (`requestId`).
  Production `us-v1-ff6b3` still runs the **June** rules, which reject those writes. So the new
  rules must go live **at the same time as the first APK**: deploy them right after the build
  finishes and before anyone signs in. No older APK is in testers' hands, so nothing breaks.
- Sign-up must stay **open** until the accounts are final, because `provisionTesters.js` creates
  accounts through the public sign-up API. Close it straight after, because the APK carries the
  Firebase web API key and anyone with the APK could otherwise register.

## 0. Prerequisites (once)

- [ ] Build from `main` (PRs #4 encryption + rules and #6 MapLibre are merged there). CI on the
      `main` head is green.
- [ ] `npm ci` on a clean checkout of `main`, then `npm run typecheck` and `npm test` pass.
- [ ] Expo login with an account in **lomasas-team**: `npx eas-cli@25.3.0 login`, then
      `npx eas-cli@25.3.0 whoami` shows it. `app.json` owner is `lomasas-team`, project
      `b9ed9b69-64fc-4c03-89b8-e14a3ee44e9d`.
- [ ] Firebase login with the Google account that owns `us-v1-ff6b3`: `npx firebase login`,
      then `npx firebase projects:list` lists it (`.firebaserc` default is `us-v1-ff6b3`).

## 1. Build the APK (EAS, profile `tester`)

- [ ] `npm run apk` (= `eas build --platform android --profile tester`: internal distribution,
      `.apk`, update channel `tester`, Sentry upload off).
- [ ] First build under lomasas-team: answer **yes** when EAS offers to generate a new Android
      keystore. Let EAS keep it (expo.dev → us-mobile → Credentials → Android). Never lose it:
      a different key means testers must uninstall, which wipes their encryption keys.
- [ ] Wait for the build (10–25 min on the free queue). Copy the **build page link** it prints.

## 2. Deploy the rules — same sitting as the build

Do this as soon as the build is green, before installing anything.

- [ ] Dry check: `npx firebase deploy --only firestore --dry-run` compiles the rules without errors.
- [ ] `npx firebase deploy --only auth,firestore` (rules + indexes + Email/Password setting).
- [ ] Console → Firestore → Rules shows today's publish time. Firestore → Indexes: all built
      (index builds can take a few minutes; queries fail until they finish).
- [ ] Console → Firestore → Settings: note the database region (PLAN M1 step 3).

## 3. Finalise the 20 tester accounts (sign-up still open)

- [ ] `node src/dev/provisionTesters.js --count 20` — reads the June `testers-credentials.csv`,
      checks each account, creates any missing one, writes `testers-credentials-us-v1-ff6b3.csv`
      (gitignored).
- [ ] Every row is ✅ (an ❌ "password unknown" only means a tester changed it, that's fine).
- [ ] Console → Authentication → Users shows `tester01@us.test` … `tester20@us.test` and **no
      other accounts** you don't recognise. Delete any strangers.

## 4. Close sign-up

- [ ] Console → Authentication → Settings → **User actions** → untick **Enable create (sign-up)**
      → Save. (If that option isn't shown, the console first offers the Identity Platform upgrade;
      it has a free tier that covers 20 users.)
- [ ] Check it's closed: running `node src/dev/provisionTesters.js --count 21` should now report
      `❌ signUp failed: ADMIN_ONLY_OPERATION` for `tester21` (and create nothing).
- [ ] From now on deploy with `npx firebase deploy --only firestore` (no `auth`), so a later deploy
      can't touch auth settings. To add accounts later: tick sign-up on, provision, untick.

## 5. Map (first time on a phone)

The map is MapLibre + OpenFreeMap since PR #6: no Google key, no billing. It has only been
checked in the browser, so this APK is its first phone run. Check it in the smoke test below.
If it misbehaves, chat still works: ship chat-first and fix the map in a new APK (native change).

## 6. Smoke test on your own phone (`tester19` / `tester20`)

- [ ] Install from the build link (allow "unknown apps" for the browser).
- [ ] Sign in as `tester19` on your phone and `tester20` in a second device or the browser preview
      against production.
- [ ] Add friend by `@handle` → accept on the other side (this exercises the new `requestId` rule).
- [ ] DM both ways, group chat, leave group, remove friend.
- [ ] Kill the app, reopen → still signed in, messages still readable.
- [ ] Map tab: street tiles load in the dark style, your blue dot shows, friend markers and spot
      circles draw, tap / long-press work, pinch-zoom is smooth.
- [ ] Settings → Ghost mode on/off works.

If anything in this step is denied by rules: fix, redeploy rules with
`npx firebase deploy --only firestore`, and retest before inviting anyone.

## 7. Send invites

- [ ] `node src/dev/testerInvites.js --csv testers-credentials-us-v1-ff6b3.csv --link <build link> --handle <your handle> --skip tester19,tester20`
      (`--csv` is needed while the June `testers-credentials.csv` still sits next to it) → opens `testers-invites.html` (gitignored, holds passwords). Send one row per person.
- [ ] Delete `testers-invites.html` when done. Never post the whole CSV anywhere.
- [ ] Remind testers: install **over** the old app on updates, never uninstall first.

## 8. After release

- [ ] JS-only fix: `npx eas-cli@25.3.0 update --channel tester --environment preview --message "…"`.
      (OTA only reaches builds with the same native fingerprint.)
- [ ] Native change (new native package, plugin, permission): `npm run apk` again.
- [ ] Optional clean-up: disable the old Google Maps key (STATUS item 3).
- [ ] Update `STATUS.md` (USER ACTIONS 1, 2 and 4 done) and log the release in `docs/CHANGELOG.md`.
