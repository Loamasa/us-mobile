# us-mobile — Status

## Last Updated
2026-03-02 — Tab layout fixed: Chats / Map / Communities (prototype-aligned)

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

## Known Issues / Warnings

### Bugs — Found During Testing
- [ ] **Ghost mode toggle unresponsive:** Nothing happens when pressing the Ghost icon on the Map.
- [ ] **Signal Broadcast failure:** Pressing the Broadcast button inside the signal modal does not start a broadcast like the prototype.

### Warnings (Non-blocking)
- `react-native-svg@15.15.3` version mismatch warning (expected 15.12.1)
- `SafeAreaView` deprecation warning — cosmetic
- Firestore emulator has stale data from previous sessions (handles, profiles)

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
- [ ] **My Spots screen** — list/create/edit/delete spots, emoji icon, radius, toggle active

#### Friend Clusters (GROUP type on map)
- [ ] **Cluster markers** — 2+ friends within 100m merge into a single cluster node
- [ ] **Cluster callout** — tap cluster to see member list + count

#### My Spots (manage personal visibility zones)
- [ ] **My Spots management** — accessed from Settings, matching the prototype `ManagePlacesModal`. List/create/edit/delete spots with emoji icon, radius, toggle active.
- [ ] **Fix spot placement on map** — ensure spot creation works on device with an interactive center-pin map view.

#### Dev Mock Friends (testing infrastructure)
- [ ] **Seed 5 mock friends** — profiles, spots, locations, friendships in Firestore emulator
- [ ] **2 friends at Rörsjögatan 8** — cluster test (both inside their spots → visible)
- [ ] **1 friend at own spot in Malmö center** — individual visible pin
- [ ] **2 friends not in spots** — hidden/in transit (should NOT appear on map)


#### Friends Screen
- [ ] **Avatar component** — replace 👤 emoji with `UserAvatar` (size variants, online status dot)
- [ ] **Presence indicators** — online/away/offline status dots (green/amber/gray)

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
| `app/(tabs)/chats.tsx` | Chats tab — friends list + gear icon opens settings modal |
| `app/(tabs)/communities.tsx` | Communities tab — placeholder |
| `app/(tabs)/map.native.tsx` | Map screen (native, uses react-native-maps) |
| `app/(tabs)/map.tsx` | Map fallback (web placeholder) |
| `src/config/mapStyles.ts` | Shared dark map style constant (`DARK_MAP_STYLE`) |
| `src/config/firebase.ts` | Firebase config + emulator connection + `getEmulatorHost()` |
| `src/lib/firestore.ts` | Firestore helpers (profile, handles, friends, location, spots) |
| `firebase.json` | Emulators: auth@9099, firestore@8088, ui@4000 (host 0.0.0.0) |
