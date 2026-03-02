# us-mobile — Status

## Last Updated
2026-03-02 — Prototype reference system setup

## Default Testing Method
**Expo Go on physical Android phone** (phone & PC on same Wi-Fi).
Web preview is fallback only — NativeWind styling and react-native-maps don't work on web.

## What Was Done This Session

### Prototype Reference System (2026-03-02)
- Copied prototype `src/` (82 files) into `.context/prototype/`
- Generated `.context/prototype/prototype-map.md` — file-level index of all screens, components, hooks, mock data
- Created `prototype-reference` skill for Claude Code (`.claude/skills/prototype-reference/`)
- Created matching skill for Antigravity (`.agents/skills/prototype-reference/`)
- One source of truth: both tools read from the same `.context/prototype/` directory
- Updated both MEMORY.md files with the new setup

### On-Device Testing (2026-03-01)
- Updated `.context/memory.md` with testing setup (Expo Go already installed on Pixel 7)
- Tested full onboarding flow on device: phone → OTP → profile → permissions → spots → map
- Found: map not visible on device, spots can't be placed on map
- Found: returning users forced through full onboarding again (emulator data wiped on restart)

### Fixed Auth Guard Redirect Loop (COMPLETED ✅)

(previous session notes below)

## Current State
- Expo server running (`npx expo start --clear`) — **no errors**
- Firebase emulators running (`firebase emulators:start --project demo-us-app`)
- Onboarding flow completes but map + spots have issues on device
Root layout now uses `onSnapshot` listener on the user's profile document instead of one-time `getUserProfile()`.
`hasProfile` updates in real-time when the profile is created during onboarding.
Auth guard distinguishes onboarding screens (permissions/spots) from pre-onboarding (phone/profile/otp) — only redirects to map from the latter.

**Files changed:** `app/_layout.tsx`

### Fixed Handle Uniqueness (COMPLETED ✅)
`isHandleAvailable()` now accepts an optional `currentUserId` — allows re-using your own handle from a previous emulator session.

**Files changed:** `src/lib/firestore.ts`, `app/(auth)/profile.tsx`

### Fixed Expo Router Platform Resolution (COMPLETED ✅)
Expo Router requires a base fallback file (no platform suffix) for `.native.tsx` routes.
- Renamed `spots.web.tsx` → `spots.tsx` (fallback), kept `spots.native.tsx` (native override)
- Renamed `map.web.tsx` → `map.tsx` (fallback), renamed original `map.tsx` → `map.native.tsx`

### Installed @expo/ngrok (COMPLETED ✅)
Added `@expo/ngrok` as devDependency for tunnel mode (use `npx expo start --tunnel` if LAN doesn't work).

### Earlier: Centralized getEmulatorHost (COMPLETED ✅)
`src/config/firebase.ts` → `getEmulatorHost()`: `127.0.0.1` on web, LAN IP on native.

### Earlier: Firebase Emulators Verified (COMPLETED ✅)
Auth Emulator on port 9099 confirmed working (HTTP 200).

### Codebase Audit + Cleanup (COMPLETED ✅)
Full top-down audit of all config, routing, components, hooks, and types. Then 3 parallel fix agents:

**Agent 1 — TS errors + platform resolution + design tokens:**
- Created barrel re-exports (`FriendMarker.tsx`, `ClusterMarker.tsx`) to fix 2 TS module resolution errors
- Extracted duplicated `darkMapStyle` → `src/config/mapStyles.ts` as `DARK_MAP_STYLE`
- Replaced hardcoded colors (`#666`, `text-gray-600/400`) with design tokens (`fog/50`, `fog/30`)

**Agent 2 — Convention violations:**
- Removed dead `getEmulatorHost()` duplicate + unused `Constants` import from `otp.tsx` and `phone.tsx`
- Replaced `globalThis` session hack with typed route params (`sessionInfo` passed via `router.push`)
- Replaced hardcoded `'#0F1115'` in auth layout with `COLORS.void`

**Agent 3 — Type safety + cleanup:**
- Fixed `updateLocation` signature: `Omit<LocationPresence, 'userId' | 'updatedAt'>` (removed `as any`)
- Typed `mapRef` properly with `MapView` import (removed `useRef<any>`)
- Removed `(spot: any)` annotations (type inferred from `UserSpot[]`)
- Added null safety on `profile.currentSignal?.expiresAt`
- Added try/catch in friend profile fetches for resilience
- Deleted unused `src/features/auth/useAuth.ts`

**Result:** `npx tsc --noEmit` passes with zero errors.

## Current State
- Expo server running (`npx expo start --clear`) — **no errors**
- Firebase emulators should be running (`firebase emulators:start --project demo-us-app`)
- Phone auth flow has been tested: phone → OTP works
- Profile creation → permissions → spots → map flow **has bug fixes applied but needs on-device verification**

## Known Issues / Warnings
- `react-native-svg@15.15.3` version mismatch warning (expected 15.12.1) — non-blocking
- `SafeAreaView` deprecation warning — cosmetic, non-blocking
- Firestore emulator has stale data from previous sessions (handles, profiles)
- **Map not showing** on device — map screen appears but the map itself is not visible
- **Can't place spots on map** — spot creation on map doesn't work on device

## Next Steps
1. **Dev-mode skip** — add a flag to bypass phone auth + onboarding and go straight to the map (auto-sign-in with test user, skip profile/permissions/spots if profile already exists)
2. **Verify full onboarding on device** — phone → OTP → profile → permissions → spots → map
3. Build APK with EAS: `eas build --platform android --profile preview`
4. Set up Firebase App Distribution for testers

## How to Run
1. Terminal 1: `firebase emulators:start --project demo-us-app`
2. Terminal 2: `npx expo start --clear`
3. Open **Expo Go** on phone → scan QR code from terminal
4. If LAN fails: `npx expo start --tunnel`

## Key Files
| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout with auth guard + real-time profile listener |
| `app/(auth)/phone.tsx` | Phone auth via emulator REST API |
| `app/(auth)/otp.tsx` | OTP verification with auto-fill |
| `app/(auth)/profile.tsx` | Profile creation with handle uniqueness check |
| `app/(auth)/permissions.tsx` | Location permission request |
| `app/(auth)/spots.native.tsx` | Spots setup (native, uses react-native-maps) |
| `app/(auth)/spots.tsx` | Spots fallback (web placeholder) |
| `app/(tabs)/map.native.tsx` | Map screen (native, uses react-native-maps) |
| `app/(tabs)/map.tsx` | Map fallback (web placeholder) |
| `src/config/mapStyles.ts` | Shared dark map style constant (`DARK_MAP_STYLE`) |
| `src/config/firebase.ts` | Firebase config + emulator connection + `getEmulatorHost()` |
| `src/lib/firestore.ts` | Firestore helpers (profile, handles, friends, location, spots) |
| `firebase.json` | Emulators: auth@9099, firestore@8088, ui@4000 (host 0.0.0.0) |
