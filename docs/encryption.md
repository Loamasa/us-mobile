# Encryption

> What is end-to-end encrypted, how, and what is not. Code: [`src/features/e2ee/`](../src/features/e2ee/).

## Short version

Text leaves phone encrypted. Server store only scrambled bytes. Only people it was meant for can read.
Google, Firebase, project admins: no key, no read.

## What is encrypted

| Data | Who can read |
|---|---|
| Chat messages + list preview | Chat members at send time |
| Group chat names | Members at creation |
| Location + current spot | Friends at publish time |
| Current signal | Friends at set time |
| Gathering text, place, radius | Invited members, or friends if solo |
| Your spots | Only you |

## What is NOT encrypted

Server need these to work. Anyone with database access can see them:

- Account: display name, handle, bio, sign-in email
- Who is friends with who, who is in which chat
- When things happen: message times, that you are in *a* spot (not which)
- Gathering expiry, visibility, member list
- Rough message size (padded to 256-byte steps)

## How it work

- Each user has one X25519 key pair. Secret key stay on phone, in Android Keystore (`expo-secure-store`). Never uploaded.
- Public key in `publicKeys/{uid}`.
- Each message: new random key, encrypt text (XSalsa20-Poly1305), then box that key to each reader.
- Library: [tweetnacl](https://github.com/dchest/tweetnacl-js) (independently audited). No home-made crypto.
- `firestore.rules` refuse plain text for all of the above. Old client can't store plain text by mistake.
- Android backup off (`allowBackup: false`), so nothing goes to Google Drive.

## Trust

Server hand out public keys, so bad server could hand out its own. Defence:

- First key seen for a person = pinned on your phone.
- Key changes → chat warns and blocks sending until you tap OK.
- Safety code in chat info. Same code on both phones = no one in the middle. Compare in person or on a call.
- Without comparing codes, the very first key is trust-on-first-use.

## Limits (be honest about these)

- **New phone or reinstall = new key.** Old messages and spots stay unreadable, on purpose. No server backup, because admins hold tester passwords and a password-wrapped backup would let them read everything.
- **One active device per account.** Last device opened gets new messages.
- **No forward secrecy.** Stolen secret key opens old messages sent to it. Fix needs a ratchet (Signal protocol): big job, later.
- **Friends added later** can't read your current signal or solo gathering until you set a new one. Location re-seals by itself.
- **Accepted key changes are not re-checked.** If you tap OK without asking, you trust it.
- **Admin holds starting passwords** until a tester changes theirs (Settings → My Account). With one, admin could sign in as that tester and read *new* messages. Their friends get the key warning.
- **Not audited** by anyone outside this project. Don't promise it's safe for high-risk use.
- **Phone itself:** unlocked or rooted phone = readable. Screenshots not blocked.

## Change it safely

- New stored text → use `seal`/`open` in `src/lib/firestore.ts`, add to `firestore.rules`, add to tables above.
- Run `npm test` (crypto) and `npm run check:emulators` (rules).
