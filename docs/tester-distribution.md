# Tester distribution

> Get **us** on friends' phones. Android only. Plan: [PLAN.md](../PLAN.md).

## Short version

1. Build tester APK in EAS cloud → get install link.
2. Send each tester the link + their own row from `testers-credentials-us-felix-test-20261030.csv` (Account ID + password).
3. They install, sign in, set display name, add each other by `@handle`.

Why not Expo Go? Expo Go need your PC running + your emulators. APK talk to real Firebase from anywhere.

## Before first build (one time)

Backend + accounts already done on `us-felix-test-20261030`. To redo or add accounts:

```bash
npx firebase login
npx firebase deploy --only auth,firestore
node src/dev/provisionTesters.js --count 30   # only adds missing ones
npx eas-cli@25.3.0 login
```

Hand out `tester01`–`tester18`. `tester19` + `tester20` were used for testing.

Close sign-up when accounts are final: Firebase console → Authentication → Settings → User actions. Open it again before adding accounts.

## Build + share

```bash
npm run apk
```

- 10–25 min in Expo cloud (free queue). Done → terminal + https://expo.dev show build page with APK link.
- Send link any way (WhatsApp, Signal, mail). Normal HTTPS link.
- JS-only fix → no rebuild:

```bash
npx eas-cli@25.3.0 update --channel tester --environment preview --message "fix chat send"
```

- Native change (new native package, app.json plugin, permission) → `npm run apk` again. Testers install **over** the old app, never uninstall first (uninstall = new key, old messages + spots gone).

## Message for testers

Copy + paste:

> 1. Open the link on your Android phone, download the APK.
> 2. Android warns about unknown apps — allow it for your browser (it's our app, not from the store).
> 3. Open **us**, swipe the intro, sign in with the **Account ID** and **password** I sent you.
> 4. Allow location when asked — friends see you ONLY while you're inside a place you set yourself. Ghost mode hides you anytime.
>    Messages are end-to-end encrypted: if you uninstall the app, old messages can't be recovered.
> 5. Settings → **My Account** → change display name, and change your password so only you know it. There is no email reset, so remember it.
> 6. Chats tab → person-plus icon (or **Add Friend**) → type my handle.
> 7. Try DMs and a group chat. Tell me what breaks (screenshot helps).

## Accounts

- `testers-credentials-us-felix-test-20261030.csv` (repo root, gitignored). Give one row per person. Never post whole file.
- Password reset: fake `@us.test` mail can't get mail. Reset in Firebase console
  (Authentication → Users → ⋮ → Reset password), or delete the user and re-run the provision script.
- Re-run is safe: existing accounts + chosen names untouched. A tester who changed their password shows as ❌ "password unknown": normal, nothing changed.
- Wipe a test round: manual in Firebase console for now.

## Tell testers

- App closed = friends don't see you move (no background location yet).
- Crashes not auto-reported yet → screenshot + tell.
- Admin can't read messages, location or spots ([encrypted](encryption.md)), but can see name, handle, bio, who is friends and when. Admin also holds your starting password until you change it: with it, admin could sign in as you and read new messages. Your friends would get a key warning.
- App closed = you get no alert. Check Chats tab for the unread dot.
