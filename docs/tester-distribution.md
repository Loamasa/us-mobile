# Tester distribution

> Get **us** on friends' phones. Android only. Plan: [PLAN.md](../PLAN.md).

## Short version

1. Build preview APK in EAS cloud → get install link.
2. Send each tester the link + their own row from `testers-credentials.csv` (Account ID + password).
3. They install, sign in, set display name, add each other by `@handle`.

Why not Expo Go? Expo Go need your PC running + your emulators. APK talk to real Firebase from anywhere.

## Before first build (one time)

```bash
npx firebase login
npx firebase deploy --only firestore
npx eas-cli@25.3.0 login
```

Tester accounts already exist in prod (`tester01`…`tester20`). Need more:
`node src/dev/provisionTesters.js --count 30` (only adds missing ones).

## Build + share

```bash
npm run apk
```

- 10–25 min in Expo cloud (free queue). Done → terminal + https://expo.dev show build page with APK link.
- Send link any way (WhatsApp, Signal, mail). Normal HTTPS link.
- JS-only fix → no rebuild:

```bash
npx eas-cli@25.3.0 update --channel preview --message "fix chat send"
```

- Native change (new native package, app.json plugin, permission) → `npm run apk` again, testers reinstall.

## Message for testers

Copy + paste:

> 1. Open the link on your Android phone, download the APK.
> 2. Android warns about unknown apps — allow it for your browser (it's our app, not from the store).
> 3. Open **us**, swipe the intro, sign in with the **Account ID** and **password** I sent you.
> 4. Allow location when asked — friends see you ONLY while you're inside a place you set yourself. Ghost mode hides you anytime.
> 5. Settings → **My Account** → change display name.
> 6. Chats tab → person-plus icon (or **Add Friend**) → type my handle.
> 7. Try DMs and a group chat. Tell me what breaks (screenshot helps).

## Accounts

- `testers-credentials.csv` (repo root, gitignored). Give one row per person. Never post whole file.
- Password reset: fake `@us.test` mail can't get mail. Reset in Firebase console
  (Authentication → Users → ⋮ → Reset password), or delete the user and re-run the provision script.
- Re-run is safe: existing accounts + chosen names untouched.
- Wipe a test round: manual in Firebase console for now.

## Tell testers

- App closed = friends don't see you move (no background location yet).
- Crashes not auto-reported yet → screenshot + tell.
- Trusted-tester setup: what you put in the account is visible to the admin.
