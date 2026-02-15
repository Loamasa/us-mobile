# us-mobile — Status

## Last Updated
2026-02-15 — Set up session memory system (CLAUDE.md + MEMORY.md + STATUS.md)

## What Works
- Expo dev server starts, serves to Expo Go via QR
- Firebase emulators (Auth + Firestore) connect locally
- Phone auth screen renders + accepts input (mock reCAPTCHA for emulator)
- TypeScript compiles with 0 errors
- All core source files exist: auth flow (5 screens), map, friends, settings, signals
- Firebase project `us-v1-ff6b3` configured with phone auth + Firestore

## Current Blocker
**NativeWind styles not rendering** — className props are ignored, content appears unstyled.

Tried:
- babel nativewind/babel preset + jsxImportSource ✅
- react-native-reanimated/plugin in babel ✅
- global.css imported in _layout.tsx ✅
- Metro withNativeWind config ✅
- Tailwind downgraded v4→v3 ✅
- react-native-css-interop pinned to 0.2.1 ✅
- Cache cleared with `npx expo start --clear`

Next to try:
1. Verify reanimated plugin picked up after full cache clear
2. Try `nativewind@next` + `react-native-css-interop@next` (canary with Expo 54 support)
3. Fallback: replace NativeWind with StyleSheet.create()

## Recently Changed Files
- `CLAUDE.md` — slimmed to ~30 lines (static conventions only)
- `STATUS.md` — created (replaces HANDOFF.md)
- `MEMORY.md` — refocused with Firebase details + gotchas

## Next Steps
1. Fix NativeWind styling (the blocker above)
2. Test full auth flow on device (phone → OTP → profile → spots → map)
3. Build APK with EAS: `eas build --platform android --profile preview`
