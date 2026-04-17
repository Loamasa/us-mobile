# us-mobile — Status

## Last Updated
2026-04-17 — Seed Test Data rules bypass via admin REST, privacy gated on spots, settings now reachable from Chats gear, map/chats visual polish

## Default Testing Method
**Expo Go on physical Android phone** (phone & PC on same Wi-Fi).
Web preview is fallback only — NativeWind styling and react-native-maps don't work on web.

## What Was Done This Session

### Tab Layout Fixed (2026-03-02)
- Renamed `app/(tabs)/friends.tsx` → `chats.tsx`; function renamed `ChatsScreen`
- Tab order now matches prototype: **Chats / Map / Communities** (Map center)
- Settings removed as a tab — now a bottom sheet modal opened via gear icon in Chats header
- Created `app/(tabs)/communities.tsx` placeholder
- Added `MessageSquareIcon` to `src/components/ui/icons.tsx`

### Auth Bypass & Dev Auto-Sign-In (2026-03-02)
- Removed auth guard from `app/_layout.tsx` — no more redirect to phone auth on startup
- Added `ensureDevUser()` — silently signs in anonymously on Firebase emulator, creates a "Dev User" profile in Firestore (with 5s timeout if emulators are down)
- Created `app/index.tsx` — forces app to start on `(tabs)/map` instead of alphabetically-first `(auth)` group
- Added "Test Onboarding" button in Settings screen (`app/(tabs)/settings.tsx`) under new Developer section
- Profile-dependent UI in Settings now gracefully handles null auth state
- Reorganized STATUS.md Next Steps into Phase 1 (Core MVP) / Phase 2 (Onboarding) / Phase 3 (Build)

### My Spots System (2026-03-03)
- Created `src/features/spots/MySpotsModal.tsx` — full-screen modal with 3 modes:
  - **LIST** — spot cards with emoji, name, radius, eye toggle (active/inactive), edit button; empty state with hint
  - **CREATE** — name input, 15-emoji icon grid, radius chip picker (50–1000m), draggable map marker
  - **EDIT** — same form pre-filled + "Remove Place" (confirm alert)
- Added to `firestore.ts`: `updateUserSpot`, `deleteUserSpot`, `toggleUserSpot`
- Added to `constants.ts`: `SPOT_ICONS` array, `SPOT_RADIUS_RANGE`
- Added "My Places" row in Settings Privacy section with live spot count badge → opens `MySpotsModal`

### Auth-Reactive Subscriptions (2026-04-17)
- `useFriendLocations`, `useLocationTracking`, Chats screen, and Map screen now all subscribe to `onAuthStateChanged` and re-wire Firestore listeners when the signed-in uid changes.
- Previously captured `auth.currentUser?.uid` at render time with empty-dep `useEffect`, so switching dev accounts (Settings → tap persona) left stale subscriptions keyed to the old uid — explained why seeded friends didn't appear after switching to a persona.
- Fresh-start flow (app boot as `dev-user` → Seed Test Data → return to Chats/Map) already worked since the MVP scaffold. No new queries were needed — the bug was a subscription-lifecycle issue.

### Seed Test Data PERMISSION_DENIED Fix (2026-04-17)
- **Bug**: Tapping "Seed Test Data" threw `FirebaseError: PERMISSION_DENIED: false for 'create' @ L8, false for 'update' @ L9` — rules only allow `users/{uid}` writes when `request.auth.uid == uid`, but the client-SDK batch ran as `dev-user` while writing profiles/handles/locations/spots for `alice`, `bob`, etc.
- **Fix**: `src/dev/seedDevData.ts` now commits via the Firestore emulator REST endpoint `/v1/.../documents:commit` with `Authorization: Bearer owner` — the same admin-bypass pattern already used for auth-user creation. Rules get bypassed at the emulator level, so seeding works from any signed-in account.
- Added small `toFirestoreValue` converter (strings, bools, ints/doubles, `Date`, `Timestamp`, `GeoPoint`, arrays, nested maps).
- `npx tsc --noEmit` passes; runtime test pending physical-device verification.

### Privacy Gating + UX Polish (2026-04-17)
- **Privacy**: `useLocationTracking` now writes the user's location doc **only when inside one of their own active spots**, and deletes it otherwise. `useFriendLocations` drops per-friend spot reads (blocked by rules anyway — spots are owner-only) and relies on location-doc presence as the visibility signal. Ghost mode still short-circuits tracking entirely.
- **Settings reachability**: Chats gear icon now routes to `/(tabs)/settings`. The inline bottom-sheet modal (duplicated a stale subset of settings and was missing Seed Test Data / Dev Accounts / My Spots) is deleted.
- **Map polish**: `FriendMarker` avatar border turns rose when a signal is active. `ClusterMarker` pulses with an animated ring and uses the real `UsersIcon` SVG instead of 👥.
- **Chats polish**: per-friend `onLocation` subscription — presence dot is mint when visible (location doc exists), muted grey otherwise. Matches map semantics.
- **Types**: `UserProfile.avatarUrl` and `FriendOnMap.avatarUrl` are now `string | null` to match fixtures/bootstrap code that writes `null` before an avatar is set.

## Known Issues / Warnings

### Bugs — Found During Testing
- [x] **Ghost mode toggle unresponsive:** Fixed — top-right controls zIndex raised above the full-width HUD container that was blocking touches.
- [x] **Signal Broadcast failure:** Fixed — added error alert on failure, location warning when GPS unavailable, dimmed button when disabled.

### Warnings (Non-blocking)
- `react-native-svg@15.15.3` version mismatch warning (expected 15.12.1)
- `SafeAreaView` deprecation warning — cosmetic
- Firestore emulator has stale data from previous sessions (handles, profiles)
- ~~**Seeded friends don't appear on map or friends list**~~ — fixed 2026-04-17: subscriptions now react to `onAuthStateChanged` so switching accounts re-wires listeners.
- ~~**`Seed Test Data` → `PERMISSION_DENIED`**~~ — fixed 2026-04-17: seed now writes via admin REST `:commit` with `Bearer owner`, bypassing rules.

## Next Steps

### Development Approach
- **Auth bypass on startup** — app opens directly to the map tab, no login required
- **"Test Onboarding" button in Settings** — full auth/onboarding flow accessible for testing
- **MVP core features first**, onboarding/auth polish later

---

### Phase 1 — Core MVP Features

> Get these working and polished first. Auth is bypassed during this phase.

#### Map Screen
- [x] **Fix map visibility on device** — map screen appears but map itself not visible
- [x] **Clock widget** — top-center HUD: `bg-black/40 backdrop-blur`, time + short date, rounded-2xl
- [x] **Visibility HUD** — Lucide Eye/Ghost icons, `backdrop-blur` pill, signal-blue when visible
- [x] **Ghost mode toggle** — proper SVG ghost/eye icons, `backdrop-blur-md`, signal-blue fill
- [x] **Signal broadcast button** — Radio icon, pink/rose tint, hidden when ghost mode active
- [x] **Signal HUD** — floating pill with emoji + text + countdown timer + X to clear

#### My Spots (manage personal visibility zones)
- [x] **My Spots system** — `MySpotsModal` with LIST/CREATE/EDIT; emoji grid, radius picker, draggable map marker; accessed from Settings → My Spots

#### Settings Screen (redesign to match prototype)
- [ ] **Nav list layout** — prototype-style nav list with 4 sections: My Account, Privacy & Safety, My Spots, Developer/Debug
  - Tap item → navigate to detail view (full-screen)
- [x] **Gear icon routes to full settings** — Chats gear now opens `/(tabs)/settings` instead of the stale inline modal (2026-04-17)

#### Friend Clusters (GROUP type on map)
- [ ] **Cluster markers** — 2+ friends within 100m merge into a single cluster node
- [ ] **Cluster callout** — tap cluster to see member list + count

#### Dev Mock Friends (testing infrastructure)
- [x] **Seed 5 mock friends** — profiles, spots, locations, friendships in Firestore emulator
- [x] **2 friends at Rörsjögatan 8** — cluster test (Alice+Bob, both inside their spots → visible)
- [x] **1 friend at own spot in Malmö center** — individual visible pin (Charlie at Möllevången)
- [x] **2 friends not in spots** — hidden/ghost mode (Dana+Eve, location sharing off)

#### Display Seeded Friends (wire up test data)
- [x] **Show seeded friends on map** — `useFriendLocations` + `useMapProjection` + `FriendMarker`/`ClusterMarker`; clustering by 100m Haversine
- [x] **Show seeded friends in friends list** — `onFriends` subscription with per-friend profile fetch; now auth-reactive for account switching
- [ ] **Render seeded friends' spots on map** — currently only current-user spots render; friend spot circles would show where they're visible from

#### Friends Screen
- [x] **Avatar component** — `UserAvatar` with size variants + status dot in use on Chats screen
- [x] **Presence indicators** — mint dot when friend is inside an active spot (location doc exists), muted grey otherwise (2026-04-17)

#### Settings Screen
- [ ] **Profile card** — proper avatar with edit button
- [ ] **"Test Onboarding" button** — in Developer section, navigates to `/(auth)/phone`

#### Tab Navigation
- [ ] **Tab icons** — replace emoji with Lucide SVG icons
- [ ] **Active tab indicator** — scale + signal-blue glow
- [ ] **Tab bar styling** — `backdrop-blur-xl` + `bg-void/80` glass effect

---

### Phase 2 — Onboarding & Auth Polish

> After MVP core is solid. Access via Settings → "Test Onboarding".

#### Onboarding Carousel (NEW)
- [ ] **5-slide carousel** before auth flow (prototype: `Onboarding.tsx`)
  - Slides: anti-ads, culture, events, map, control — color-coded accents
  - Step dots, CTA buttons, final "Enter the Void" → transitions to auth

#### Auth Screens (phone → OTP → profile → permissions)
- [ ] **Shared AuthLayout wrapper** — gradient blob, "us" logo, full-width CTA button
- [ ] **Phone screen** — "Enter the Void" layout with proper icons
- [ ] **OTP screen** — larger code boxes, "Wrong number? Retarget." link
- [ ] **Profile screen** — "Identity." layout with dashed avatar border
- [ ] **Permissions screen** — "Synchronize." with radial glow and privacy pill

#### My Spots (Onboarding & Management)
- [ ] **Add your starting spots** — integrated into the onboarding flow after permissions

---

### Phase 3 — Build & Distribution

1. Build APK with EAS: `eas build --platform android --profile preview`
2. Set up Firebase App Distribution for testers

## How to Run
1. Terminal 1: `firebase emulators:start --project us-v1-ff6b3`
2. Terminal 2: `npx expo start --clear`
3. Open **Expo Go** on phone → scan QR code from terminal
4. If LAN fails: `npx expo start --tunnel`
5. **Seed test data:** Settings → Developer → "Seed Test Data" (creates 5 dummy friends)
6. **Switch accounts:** Settings → Developer → tap any account to sign in as that persona

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
| `app/(tabs)/chats.tsx` | Chats tab — friends list + gear icon opens settings modal |
| `app/(tabs)/communities.tsx` | Communities tab — placeholder |
| `app/(tabs)/map.native.tsx` | Map screen (native, uses react-native-maps) |
| `app/(tabs)/map.tsx` | Map fallback (web placeholder) |
| `src/config/mapStyles.ts` | Shared dark map style constant (`DARK_MAP_STYLE`) |
| `src/config/firebase.ts` | Firebase config + emulator connection + `getEmulatorHost()` |
| `src/lib/firestore.ts` | Firestore helpers (profile, handles, friends, location, spots) |
| `firebase.json` | Emulators: auth@9099, firestore@8088, ui@4000 (host 0.0.0.0) |
| `src/dev/fixtures.json` | 5 test personas with Malmö locations, spots, signals |
| `src/dev/seedDevData.ts` | Seeds auth users + Firestore data (profiles, locations, spots, friendships) |
| `src/dev/devAccounts.ts` | Account switcher: DEV_ACCOUNTS list, switchAccount(), getCurrentAccountId() |
