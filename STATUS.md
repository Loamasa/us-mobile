# us-mobile — Status

## Last Updated
2026-04-18 — Group chat data model + chat detail screen + Möllevången Crew seeded; "Open Group Chat" now navigates to a live chat room

## Default Testing Method
**Expo Go on physical Android phone** (phone & PC on same Wi-Fi).
Web preview is fallback only — NativeWind styling and react-native-maps don't work on web.

## What Was Done This Session

### Group Chat Data Model + Chat Detail Screen (2026-04-18)
- **Goal**: Wire the "Open Group Chat" CTA end-to-end — a tap on a cluster's CTA should open a real chat room with the crew. Named crews (e.g. "Möllevången Crew") should also be recognized on the map.
- **Types** (`src/types/index.ts`): added `ChatType`, `MapVisibility`, `ChatSummary`, `Message`. Extended `MapEntity` with optional `groupChat: { id, name }` so clusters decorated with a matching named chat can surface the name.
- **Security rules** (`firestore.rules`): added `chats/{chatId}` + `chats/{chatId}/messages/{messageId}` blocks. Summary is readable/writable only by members; messages are writable only by members and require `senderId == auth.uid`. Nested message rules use `get(...)` to fetch the parent chat's `memberIds`.
- **Firestore helpers** (`src/lib/firestore.ts`): `onChats` (array-contains with client-side sort to avoid a composite index), `onChatSummary`, `onMessages` (desc + limit 100), `sendMessage` (adds message doc + updates `lastMessage` + `lastMessageAt` on the chat), `getOrCreateGroupChat` (deterministic by sorted memberIds + type).
- **Chat detail screen** (`app/chat/[chatId].tsx`): header with back button + name + member count; inverted `FlatList` of messages; my bubbles signal-blue right-aligned, peers' bubbles glass left-aligned with avatar + name (for GROUP); multiline `TextInput` + disabled-when-empty Send button; `KeyboardAvoidingView` for iOS; loading / "Chat not found" / empty states; per-member profile subscriptions for name resolution.
- **Map wiring** (`app/(tabs)/map.native.tsx`):
  - Subscribes to `onChats(userId)` and decorates each CLUSTER entity with `groupChat` when a chat with `mapVisibility = 'ALWAYS'` has exactly matching `memberIds` (viewer + cluster friends, sorted).
  - `handleOpenGroupChat`: named cluster → `router.push('/chat/' + entity.groupChat.id)`; unnamed cluster → `getOrCreateGroupChat` with `{ memberIds: [...friends, viewer], name: "Alice, Bob + crew" }` → `router.push`.
- **Cluster card** (`src/components/map/ClusterCard.tsx`): title uses `entity.groupChat.name` when present; badge flips to "GROUP"; description switches copy for named groups.
- **Seed** (`src/dev/fixtures.json` + `src/dev/seedDevData.ts`): seeded `chats/chat_mollevangen` → "Möllevången Crew", members `[dev-user, alice, bob]`, `mapVisibility: 'ALWAYS'`, `fixedLocation` at Möllevångstorget. When alice+bob cluster (they're already at the same coords in fixtures), the card shows "Möllevången Crew" + GROUP badge, and tapping opens the seeded chat.
- `npx tsc --noEmit` passes; runtime test pending physical-device verification.

### Cluster Card UI + Absorbed Friend Markers (2026-04-18)
- **Goal**: Match the prototype's cluster popup (name + CLUSTER badge + facepile + "Open Group Chat" CTA) and make the cluster the single source of truth when it forms — individual friend pins AND their spot zones disappear into it.
- `src/components/map/ClusterCard.tsx` (new) — floating bottom-anchored glass card: signal-blue title, CLUSTER pill, overlapping avatar facepile (max 5 + overflow badge), friend-count description, solid signal-blue "Open Group Chat" button, X close. Matches the prototype's `getPopupContent` GROUP branch visually.
- `src/components/map/ClusterMarker.native.tsx` — dropped the built-in `<Callout>` (flaky with rich content on Android) in favor of `onPress` that propagates up to the map screen.
- `app/(tabs)/map.native.tsx`:
  - `selectedClusterId` state + `selectedCluster` derived from `mapEntities`.
  - `clusteredUserIds: Set<string>` built once per projection — used to filter `friendSpots` so a friend absorbed into a cluster no longer renders their spot circle + label.
  - Tapping a `ClusterMarker` selects; tapping the map or the X closes; the selection auto-clears if the cluster stops existing (friends drift apart, go ghost).
  - "Open Group Chat" stubbed with `Alert` until the chat data model + detail screen land.
- `useMapProjection` already excluded clustered friends from individual `FRIEND` entities, so their avatar pins were already hidden — this pass finishes the job for the mint-tinted spot zones + emoji labels.
- `npx tsc --noEmit` passes; runtime test pending physical-device verification.

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

### Friend Spot Zones on Map (2026-04-17)
- **Problem**: Map showed only the current user's spots. Friend locations appeared as isolated pins with no visual context for *why* they were visible or *where they could move* without disappearing.
- **Approach**: Embed a snapshot of the containing spot (`id`, `name`, `emoji`, `center`, `radius`) directly in the friend's `locations/{uid}` doc. The user's own tracker already computes this to decide whether to publish — just include it in the write.
- **Privacy**: No rules change needed. Spots remain owner-only at `users/{uid}/spots`. The location doc leaks *only the current containing spot* and *only while the friend is already visible*. Ghost mode or leaving the spot removes the doc entirely.
- Extended `LocationPresence` with optional `spot` field (`src/types/index.ts`).
- `useLocationTracking`: `isInsideAnyActiveSpot` → `findContainingSpot`; embeds the matching spot in `updateLocation`.
- `seedDevData`: seeded location docs now include the containing spot (Alice→Home, Bob→Home, Charlie→Hangout). Dana/Eve remain ghost, no location doc.
- `map.native.tsx`: per-friend spot zones render as mint-tinted `Circle` + emoji+`"Alice's Home"`-style label. Sits between own spots and friend markers in the layer stack.
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
- [x] **Cluster markers** — 2+ friends within 100m merge into a single cluster node (pulsing signal-blue disc, count badge)
- [x] **Cluster callout** — tap cluster → floating card with name, CLUSTER badge, facepile, "Open Group Chat" CTA (2026-04-18)
- [x] **Absorb clustered members** — individual pins + spot zones hide while members are in the cluster (2026-04-18)
- [x] **Open Group Chat wiring** — chat data model + `app/chat/[chatId].tsx` detail screen + `getOrCreateGroupChat` + `router.push('/chat/...')` (2026-04-18)
- [x] **Named group clusters — partial** — `ChatSummary` with `mapVisibility: 'ALWAYS'` decorates a matching proximity cluster with the chat's name + GROUP badge (seeded "Möllevången Crew"). (2026-04-18)
- [ ] **Named group pins without proximity** — a named group with `fixedLocation` should render as a cluster on the map even when its members aren't actually clustered (prototype parity: "Möllevången Crew" always visible at Möllevångstorget).

#### Dev Mock Friends (testing infrastructure)
- [x] **Seed 5 mock friends** — profiles, spots, locations, friendships in Firestore emulator
- [x] **2 friends at Rörsjögatan 8** — cluster test (Alice+Bob, both inside their spots → visible)
- [x] **1 friend at own spot in Malmö center** — individual visible pin (Charlie at Möllevången)
- [x] **2 friends not in spots** — hidden/ghost mode (Dana+Eve, location sharing off)

#### Display Seeded Friends (wire up test data)
- [x] **Show seeded friends on map** — `useFriendLocations` + `useMapProjection` + `FriendMarker`/`ClusterMarker`; clustering by 100m Haversine
- [x] **Show seeded friends in friends list** — `onFriends` subscription with per-friend profile fetch; now auth-reactive for account switching
- [x] **Render seeded friends' spots on map** — each visible friend's current containing spot renders as a mint-tinted circle + emoji label; spot snapshot embedded in `locations/{uid}` doc at publish time (2026-04-17)

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
| `app/(tabs)/map.native.tsx` | Map screen (native, uses react-native-maps); wires chats → named cluster decoration + "Open Group Chat" → `/chat/[id]` |
| `app/(tabs)/map.tsx` | Map fallback (web placeholder) |
| `app/chat/[chatId].tsx` | Chat detail screen — inverted FlatList of messages, member-count header, send input |
| `src/components/map/ClusterCard.tsx` | Floating glass card for a selected cluster (prototype parity); renders GROUP badge + named chat title when matched |
| `src/config/mapStyles.ts` | Shared dark map style constant (`DARK_MAP_STYLE`) |
| `src/config/firebase.ts` | Firebase config + emulator connection + `getEmulatorHost()` |
| `src/lib/firestore.ts` | Firestore helpers (profile, handles, friends, location, spots) |
| `firebase.json` | Emulators: auth@9099, firestore@8088, ui@4000 (host 0.0.0.0) |
| `src/dev/fixtures.json` | 5 test personas with Malmö locations, spots, signals |
| `src/dev/seedDevData.ts` | Seeds auth users + Firestore data (profiles, locations, spots, friendships) |
| `src/dev/devAccounts.ts` | Account switcher: DEV_ACCOUNTS list, switchAccount(), getCurrentAccountId() |
