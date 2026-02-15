# us-mobile — Status

## Last Updated
2026-02-15 — NativeWind fixed, phone auth working end-to-end with emulator

## What Was Done This Session

### NativeWind Config Fix (COMPLETED ✅)
Previous session incorrectly migrated to NativeWind v5/Tailwind v4. Reverted to the correct **NativeWind v4.2.1 + Tailwind v3.4.19** stack.

**Files changed:** `metro.config.js`, `babel.config.js`, `global.css`, `tailwind.config.js` (recreated), `nativewind-env.d.ts`, `postcss.config.mjs` (deleted), `package.json`

### Phone Auth via Emulator REST API (COMPLETED ✅)
Firebase web SDK `signInWithPhoneNumber` requires reCAPTCHA → no DOM in React Native → hangs.
Rewrote `phone.tsx` to call emulator REST API directly (`sendVerificationCode`), bypassing reCAPTCHA.
OTP screen auto-fetches the verification code from the emulator and pre-fills it.

**Files changed:** `app/(auth)/phone.tsx`, `app/(auth)/otp.tsx`

### Firebase Emulator Network Fix (COMPLETED ✅)
Emulators defaulted to `127.0.0.1` (unreachable from phone). Set `host: "0.0.0.0"` in `firebase.json`.
Fixed Firestore port conflict (8080 → 8088, websocketPort 9151).

**Files changed:** `firebase.json`, `src/config/firebase.ts`

### Firestore Offline Resilience (COMPLETED ✅)
Made `getUserProfile` handle offline errors gracefully (returns `null` instead of crashing).

**Files changed:** `src/lib/firestore.ts`

## Verified On Device ✅
- NativeWind styles render correctly (dark bg, styled text, blue buttons)
- Phone auth → OTP → profile screen flow works end-to-end

## Next Steps
1. Test full profile creation + map flow
2. Build APK with EAS: `eas build --platform android --profile preview`
3. Set up Firebase App Distribution for testers

## Key Files
| File | Purpose |
|------|---------|
| `babel.config.js` | Expo preset + nativewind/babel + reanimated |
| `metro.config.js` | `withNativeWind(config, { input: './global.css' })` |
| `tailwind.config.js` | TW3 config with `nativewind/preset` + Void Mode colors |
| `global.css` | `@tailwind base/components/utilities` |
| `firebase.json` | Emulators: auth@9099, firestore@8088, ui@4000 (all on 0.0.0.0) |
| `src/config/firebase.ts` | Firebase config + emulator connection |
| `app/(auth)/phone.tsx` | Phone auth via emulator REST API |
| `app/(auth)/otp.tsx` | OTP verification with auto-fill |
