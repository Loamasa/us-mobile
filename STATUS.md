# us-mobile — Status

## Phase 2 Pre-Flight Review (2026-06-10)

> Full Phase 1 ↔ prototype parity audit done before starting Phase 2. **Verdict: prototype is ready.**

- **Prototype sources are complete**: `.context/prototype/src/features/onboarding/Onboarding.tsx` (5 slides, all copy/accents/layout) + `.context/prototype/src/features/auth/AuthFlow.tsx` (4-step wizard). Nothing missing on the prototype side.
- **Phase 1 parity confirmed**: tab order/floating nav (production exceeds prototype — BlurView vs plain bar), map HUD set, cluster cards, named group pins, chats list/detail, settings nav-list (route-based adaptation of the prototype's 9-tab modal). Intentional divergences on record: friend spot zones reverted (2026-04-23), settings as tab instead of modal.
- **The Phase 2 gap is smaller than the checklist implies**: all four auth screens already exist and work end-to-end (`app/(auth)/{phone,otp,profile,permissions}.tsx` — emulator REST auth, handle uniqueness, location permissions). Phase 2 = visual polish + ONE new screen (onboarding carousel).
- **Adaptation decisions**: keep **6-digit OTP** (Firebase emulator issues 6 digits; prototype's 4× `w-16 h-20` boxes don't fit six across a phone — size down, keep the look). Carousel gets route `app/(auth)/onboarding.tsx`; Settings → Developer → "Test Onboarding" retargets there from `/(auth)/phone`. `app/index.tsx` keeps the dev auth bypass.
- **Checklist correction**: "Add your starting spots" already exists (`app/(auth)/spots.native.tsx`) — needs polish at most, not a build.
- **Unscheduled prototype feature flagged**: tutorial overlay chain (`tutorialData.tsx`, 7 definitions, fires after onboarding) is in NO phase checklist — triage later.

## Last Updated
2026-06-10 (evening) — **Map is now fully testable in the browser (web map shim) + full map feature suite verified live.** New `src/dev/fakeMaps.tsx`: a KISS web stand-in for react-native-maps (dark pane, equirectangular lat/lng→pixel projection, Marker/Circle/animateToRegion, zoom ± buttons, "DEV MAP" watermark). `metro.config.js` now resolves `react-native-maps` → the shim on web (was: empty module), `app/(tabs)/map.tsx` re-exports the real native screen, and the **null web stubs `FriendMarker.web.tsx`/`ClusterMarker.web.tsx` were the hidden reason nothing rendered** — they now re-export the native markers. Verified end-to-end in the preview browser against live emulator data: Alice+Bob cluster + Charlie pin render; cluster tap → "Möllevången Crew" card (GROUP badge, facepile, live copy) → Open Group Chat → message sent + persisted; friend tap → Charlie card ("At 🛹 Hangout", ONLINE) → Message → DM created; ghost toggle (pill ⇄ GHOST MODE, signal btn hides, Firestore write); signal modal (GPS-gated broadcast by design) + injected signal → ActiveSignalHUD with countdown → X clears (live + DB); **resting group pin**: moved Bob away via REST → cluster dissolved live, crew pin synthesized at exact fixedLocation, card shows "This group's spot · 2 members.", open card auto-closed on entity change; restored Bob → proximity-wins re-decoration; own-spot circle + emoji label render live (REST-seeded "HQ" spot on dev-user — left in emulator). Map-tap closes cards. `tsc` clean. Shim gotchas: RNW `onLayout` never fired (shim measures via `getBoundingClientRect`); RN Modal close animation never completes in the headless preview so a closed modal's DOM lingers (state flips correctly — reload clears; not an app bug). **Findings for fix list: seeded `lastMessage` has no message docs behind it; DM empty-state copy says "Say hi to the crew."; back-from-chat landed on Chats tab on web (router.back() — verify on device).**

2026-06-10 (later) — **Browser-based self-testing setup WORKS (Claude can now drive the app without a device).** Expo web + Firebase emulators + the Claude preview browser now run the full app loop: dev auto-sign-in as `dev-user`, chats list with live seeded data, open DM, send message (verified persisted via REST), settings, My Spots editor. Verified end-to-end with a real message round trip + zero console errors + `tsc` clean. Three root causes fixed: (1) **web bundle failed to compile** — expo-router's `require.context` pulls `*.native.tsx` routes into the web bundle, so `react-native-maps` is now resolved to an empty module on web via a custom Metro resolver (`metro.config.js`); (2) **sandboxed preview browsers can only reach the Metro port** — emulator traffic now goes same-origin through a Metro proxy middleware (path-prefix routing to :9099/:8088), with `getAuthEmulatorUrl()`/`getFirestoreEmulatorUrl()` helpers in `src/config/firebase.ts` used by `_layout`/`phone`/`seedDevData`; (3) **auth users were created in the wrong emulator project** — key-based SDK calls (`signInWithPassword`) always resolve to the emulator's default project (`demo-us-app`), but admin REST created users in `us-v1-ff6b3`, so password sign-in could NEVER have worked since the `--project demo-us-app` switch. Auth users now go to `demo-us-app`; Firestore data stays in `us-v1-ff6b3`. Also: `MySpotsModal` map editor renders a web fallback instead of crashing. **Emulators MUST be started with `--project demo-us-app`** (How to Run updated below). `.claude/launch.json` added for preview-managed servers.

2026-06-10 — **Phase 2 onboarding & auth polish BUILT (carousel + all 4 auth screens).** New 5-slide onboarding carousel at `app/(auth)/onboarding.tsx` (anti-ads/culture/events/map/control, per-slide accent + RN Animated orbits/radar/pulses, "Enter the Void" → phone). New shared `src/components/auth/AuthLayout.tsx` (SVG radial-gradient glow blob corner/center, "us" logo chip, step dots, accent/white CTA + secondary link) — phone/otp/profile rebuilt on it with prototype headline treatments ("ENTER THE VOID." / "VERIFY." / "IDENTITY." / "SYNCHRONIZE."), SVG icons replacing emoji (Smartphone/User+Zap/MapPin/Shield), dashed avatar border, mint Shield privacy pill. Kept 6-digit OTP (emulator codes) with bigger boxes + "Wrong number? Retarget." All auth *logic* untouched (emulator REST, handle uniqueness, expo-location). Settings → Developer → Test Onboarding now opens the carousel. Added flat `orange`/`purple` to tailwind + 7 new icons. Verified: `npx tsc --noEmit` clean + full Android Metro export succeeds (1509 modules, 5.35 MB hbc). Device UI sign-off via Expo Go still recommended. **Remaining Phase 2: spots-step polish (optional) + tutorial-chain triage.**

2026-06-03 — **Phase 1 Core MVP map/UI COMPLETE — merged to `main` + pushed.** This session closed the last three open Phase 1 items (named group pins without proximity, settings redesign, tab-nav polish). Each verified device-free: `npx tsc --noEmit` clean, `verifyProjection.js` (regression) + `verifyGroupPins.js` (8/8) PASS, and a full Android Metro bundle succeeds (HTTP 200, ~11 MB, all new modules compiled). Work landed on `feat/phase1-map-ui` then fast-forwarded into `main`. **Next focus: Phase 2 — onboarding & auth polish.** Per-task detail in the three entries below; device UI sign-off still recommended via Expo Go.

2026-06-03 — **Tab navigation polish landed (Phase 1 Tab Navigation: all 3 items).** Floating glass tab bar (`app/(tabs)/_layout.tsx`): `position: absolute` + `tabBarBackground` BlurView under a `bg-void/80` overlay so map/list content blurs through. Active tab scales 1.12 with a signal-blue glow (halo + iOS shadow); icons already SVG. Screens pad to clear the now-floating bar — chats FlatList + settings ScrollView `pb-24`, map controls raised to `bottom: 96`, and the map's my-location button hides while a cluster/friend card is open (cards also sit at `bottom: 96`). `npx tsc --noEmit` clean. **This closes every Phase 1 map/UI item the session set out to do.**

2026-06-03 — **Settings redesign landed (Phase 1 Settings: nav-list + detail views).** Replaced the single-scroll settings with a prototype-style nav list: tappable profile card (→ account editor), grouped `SettingsGroup`/`SettingRow` rows, and full-screen detail routes `app/settings/{account,privacy,developer}.tsx` (own back-header via `SettingsDetailLayout`, no tab bar — same pattern as chat detail). My Account edits name/bio; Privacy holds the sharing/requests/status toggles; Developer holds Seed / account switcher / Test Onboarding (→ `/(auth)/phone`). My Spots reuses `MySpotsModal`. New SVG icons (ChevronRight, ArrowLeft, Terminal, LogOut, Camera, Check, PlayCircle). `npx tsc --noEmit` clean.

2026-06-03 — **Named group pins without proximity landed (Phase 1 Friend-Clusters: last open item).** A named GROUP chat with `mapVisibility:'ALWAYS'` + `fixedLocation` now renders as a persistent cluster pin even when its members aren't physically together. Rule is **proximity wins**: when the members actually cluster, the live cluster is decorated at their real centroid; otherwise a resting pin synthesizes at `fixedLocation`. New `src/features/map/groupPins.ts` (`buildGroupPins`) + `useGroupMemberProfiles.ts` (facepile profiles for ghost/away members, stable-string-key). Verified device-free with new `src/dev/verifyGroupPins.js` (both branches PASS) and the existing `verifyProjection.js` regression still PASSes. `npx tsc --noEmit` clean.

2026-06-02 — **Bug #3 (Alice+Bob not clustering) resolved by device-free verification.** Built a Node harness (`runSeed.js` + `verifyProjection.js`) that seeds the emulator and replays the exact app read path; it produces `CLUSTER(alice+bob) + FRIEND(charlie)` against real seeded data. Root cause was NOT in seed/data/commit/projection — all proven correct. `[map-diag]` logs stripped. All three original map bugs now closed.

## What Was Done This Session

### Bug #3 — Seeded Pair Clustering: Resolved by Device-Free Verification (2026-06-02)
- **Goal**: Diagnose why a previous device run "showed only Charlie — no Alice+Bob cluster" without needing a physical device.
- **Approach**: The prior session left two untracked Node scripts (`src/dev/runSeed.js`, `src/dev/testProjection.js`) — a device-free path. Completed that path:
  - `testProjection.js` (mock coords) → confirms the clustering math: alice↔bob = **12.77m** (≪ 100m threshold) → produces a CLUSTER. Projection logic is correct.
  - Started the emulator (`firebase emulators:start --project us-v1-ff6b3 --only auth,firestore`), ran `node src/dev/runSeed.js` → seeded fresh.
  - Queried `locations` via REST: **all three docs land** — `alice`, `bob`, `charlie` with correct coords + spot; `dana`/`eve` correctly absent (location sharing off). **Hypothesis (a) — missing location doc — refuted.**
  - New `src/dev/verifyProjection.js` — reads LIVE emulator data the way the app does (`users/dev-user/friends` → per-friend `users/{id}` + `locations/{id}`), assembles `friendLocations` exactly as `useFriendLocations.commit` (both profile AND location required), runs the projection. **Result: `CLUSTER(alice+bob), FRIEND(charlie)` ✅ PASS.**
- **Conclusion**: The entire pipeline — seed, friend list, profile/location reads, commit dedup, clustering projection — is verified correct end-to-end against real data. The original "only Charlie" symptom is attributable to **stale emulator data** from a prior session (see Warnings) or the **pre-fix subscription thrash** (fixed 2026-04-18 with string keys) / **stale auth-keyed subscriptions** (fixed 2026-04-17) — both of which predate-or-explain that observation.
- **Cleanup**: Stripped the `[map-diag]` console logs from `useFriendLocations.ts` (commit) and `useMapProjection.ts` (input + output). `npx tsc --noEmit` passes.
- **Remaining uncertainty**: The bug was only ever *observed* on device, and this verification is device-free. A confirmatory device run (seed → open map) is the only thing left to make it 100% — but there is no longer any code/data defect to find.

### Map Bug Cleanup — Friend Popup + Spot-Zone Gut + Cluster Diagnostics (2026-04-23)

### Map Bug Cleanup — Friend Popup + Spot-Zone Gut + Cluster Diagnostics (2026-04-23)
- **Goal**: Close the three map/cluster/friend-tap bugs parked at the end of the 2026-04-18 session so the map→chat loop behaves like the prototype.
- **Bug #2 — Friend marker popup (fixed)**:
  - `FriendOnMap` now carries an optional `spot: { name, emoji } | null` populated by `useMapProjection` so the popup can show "At {spot.name}" without re-reading `friendLocations`.
  - New `src/components/map/FriendCard.tsx` mirrors `ClusterCard` — bottom-anchored glass card, name, optional rose-tinted signal pill, optional `"At 🏠 Home"` spot pill, `ONLINE`/`OFFLINE` status line (mint/grey), full-width signal-blue **Message** CTA, X close.
  - `FriendMarker.native.tsx` dropped its `<Callout>` (same flakiness fix as ClusterMarker) and exposes an `onPress` prop.
  - `app/(tabs)/map.native.tsx` now tracks `selectedFriendId`, derives `selectedFriend`, renders `<FriendCard>`, and wires **Message** → `getOrCreateDmChat({ viewerId, peerId })` → `router.push('/chat/' + chatId)`. Friend and cluster selection are mutex — tapping either clears the other; tapping the map clears both.
- **Bug #1 — Friend spot zones (fixed)**: gutted the `friendSpots` circle+label render block plus the now-dead `clusteredUserIds` set in `map.native.tsx`. `useMapProjection` already excludes clustered friends from individual `FRIEND` entities, so no visibility regression. Viewer's own spot circles + labels still render. Friend's containing spot survives only as `FriendOnMap.spot` for the popup status line.
- **Bug #3 — Seeded pair not clustering (diagnostics, pending device run)**: unable to repro without physical device. Added `[map-diag]` console logs in `useFriendLocations.commit` (per-friend profile/location arrival) and `useMapProjection` (input userIds + projected entities). Next device run will reveal which of (a) missing location doc, (b) distance > 100m threshold, (c) projection dedup is actually firing. Logs are tagged for easy strip.
- `npx tsc --noEmit` passes; runtime test (FriendCard tap, Message CTA → DM, spot-zone removal, cluster diagnostics) pending physical-device verification.

### Chats Tab — DMs + Group Chats (2026-04-18)
- **Goal**: Close the chat loop. Group chat data model landed earlier today, but the Chats tab was still a static friends list — no way to open a seeded chat or start a new one.
- **Types** (`src/types/index.ts`): `ChatSummary.name` now `string | null`. DMs store `null` and the viewer derives the title from the peer's profile (names differ per viewer, so storing one is a foot-gun).
- **Firestore helper** (`src/lib/firestore.ts`): added `getOrCreateDmChat({ viewerId, peerId })` — mirrors `getOrCreateGroupChat` but deterministic on sorted 2-member match with `type: 'DM'`. Name/avatar stored as null.
- **Chats screen** (`app/(tabs)/chats.tsx`): full rewrite.
  - Primary content is now the chat list (`onChats(userId)`), not the friends list. Rows show title, last-message preview or member count, relative timestamp ("5m", "2h", "Yesterday"), GROUP pill on group rows.
  - Dedup subscribes to every member profile and DM-peer location once — DM row title + presence dot are derived from those. Group chats show `chat.name` directly.
  - Header: compose-DM (MessageSquare) + compose-group (Users) + add-friend (UserPlus) + settings (gear) icons.
  - Compose modal: `DM` / `Group` segmented control, group-name input (group only), searchable friend picker. DM mode = single tap → `getOrCreateDmChat` → `router.push('/chat/[id]')`. Group mode = multi-select + name → `getOrCreateGroupChat` → push.
  - Friend requests + add-friend-by-handle modal preserved from the previous screen.
  - Empty state: message + "New Message" CTA when friends exist.
- **Chat detail** (`app/chat/[chatId].tsx`): DM header now resolves peer name from `members[peerId]` and subscribes to `onLocation(peerId)` — shows a mint/grey presence dot + "Online"/"Offline" subtitle. Group chats unchanged (member count).
- **Map decoration guard** (`app/(tabs)/map.native.tsx`): `namedGroups` filter now type-predicates `c.name !== null`, so the `MapEntity.groupChat.name: string` slot still gets a string.
- **Seed** (`src/dev/fixtures.json` + `src/dev/seedDevData.ts`): added `chat_study_crew` (dev-user + charlie + dana, plain group) and `chat_dm_alice` (dev-user ↔ alice DM with `name: null`). `lastMessageAt` now defaults to `now` when a seeded `lastMessage` exists so relative timestamps render.
- **Self-review fix applied** (subscription thrash, Important): first pass built `neededProfileIds` / `presenceIds` as array memos, so every `onSnapshot` fire returned a fresh array identity and the fan-out `useEffect` tore down + re-subscribed N profile + location listeners every time any chat/friend doc changed. Switched to joined-string keys (`profileIdKey` / `presenceIdKey`) memoized to a sorted-pipe-delimited string — strings compare by value under `Object.is`, so dependencies only invalidate when the actual id *set* changes. Saved a gotcha entry in MEMORY.md.
- `npx tsc --noEmit` passes; runtime test pending physical-device verification.

## Known Bugs — Up Next

> All three map bugs are closed. Bug #3 was resolved 2026-06-02 by device-free verification — no code/data defect remains.

1. ~~**Seeded pair not clustering**~~ *(RESOLVED 2026-06-02 — verified, not a code/data bug)*
   - Symptom (historical): a previous device run showed only Charlie — no Alice+Bob cluster.
   - Verified correct end-to-end against real seeded emulator data via `src/dev/runSeed.js` + `src/dev/verifyProjection.js`: all three `locations/*` docs land, the commit dedup includes alice/bob/charlie, and the projection yields `CLUSTER(alice+bob) + FRIEND(charlie)`. alice↔bob distance is 12.77m (≪ 100m).
   - Root cause attribution: stale emulator data from a prior session, or the subscription thrash / stale-auth-keyed listeners fixed on 2026-04-18 / 2026-04-17 (both predate-or-explain the observation).
   - Only outstanding item: an optional confirmatory device run (seed → open map). There is no longer a defect to fix.
   - **Repro the verification anytime**: start emulator → `node src/dev/runSeed.js` → `node src/dev/verifyProjection.js` (expects `✅ PASS`).

## Tech Debt — Deferred

> From self-review after the Chats Tab landing. Both are Minor — worth logging so they don't get lost, not worth blocking other work on.

1. **DM get-or-create race**
   - Symptom (latent, not yet observed): two devices tapping "Message" on each other at ~the same moment can both see `undefined` from the query for the sorted 2-member match and each create their own DM doc. Result is two parallel DM rooms for the same pair.
   - Fix: make the DM doc ID deterministic — `dm_${[a, b].sort().join('_')}` — and use `setDoc(..., { merge: true })` on creation instead of `addDoc` + post-query. Same pattern would apply to `getOrCreateGroupChat` if we ever hit the race there (less likely with 3+ members).
   - Location: `src/lib/firestore.ts` → `getOrCreateDmChat`.

2. **Inline styles drift from NativeWind convention**
   - Symptom: compose modal + a couple of the new header icon buttons in `app/(tabs)/chats.tsx` use `style={{ ... }}` literals where other screens use NativeWind `className`. CLAUDE.md style guide says `className` everywhere, no inline styles.
   - Fix: port the remaining inline style props to NativeWind classes. Pure cosmetic — no behavior change.
   - Location: `app/(tabs)/chats.tsx` (compose modal + header icons).

## Default Testing Method
**Expo Go on physical Android phone** (phone & PC on same Wi-Fi) for map/native UX.
**Browser (Expo web) is now a first-class path for everything INCLUDING the map** (2026-06-10 evening): auth, chats, settings, spots list, and the full map tab (markers, clusters, group pins, cards, ghost/signal HUD) all work against the emulators — `node src/dev/runSeed.js` + `npx expo start` + open `http://localhost:8081`. The map renders via the dev shim `src/dev/fakeMaps.tsx` (no tiles, zoom ± buttons). Only the My Spots map editor + auth spots step still render web fallbacks.

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
- [x] **Nav list layout** — prototype-style nav list: profile card (avatar + Edit) + grouped `SettingsGroup`/`SettingRow` rows for My Account, Privacy & Safety, My Spots, Developer/Debug. (2026-06-03)
  - [x] Tap item → full-screen detail view. New routes `app/settings/{account,privacy,developer}.tsx` render outside `(tabs)` (no tab bar) with a back-header `SettingsDetailLayout`, mirroring `app/chat/[chatId].tsx`. My Spots reuses `MySpotsModal`.
- [x] **Gear icon routes to full settings** — Chats gear now opens `/(tabs)/settings` instead of the stale inline modal (2026-04-17)

#### Friend Clusters (GROUP type on map)
- [x] **Cluster markers** — 2+ friends within 100m merge into a single cluster node (pulsing signal-blue disc, count badge)
- [x] **Cluster callout** — tap cluster → floating card with name, CLUSTER badge, facepile, "Open Group Chat" CTA (2026-04-18)
- [x] **Absorb clustered members** — individual pins + spot zones hide while members are in the cluster (2026-04-18)
- [x] **Open Group Chat wiring** — chat data model + `app/chat/[chatId].tsx` detail screen + `getOrCreateGroupChat` + `router.push('/chat/...')` (2026-04-18)
- [x] **Named group clusters — partial** — `ChatSummary` with `mapVisibility: 'ALWAYS'` decorates a matching proximity cluster with the chat's name + GROUP badge (seeded "Möllevången Crew"). (2026-04-18)
- [x] **Named group pins without proximity** — a named group with `fixedLocation` renders as a cluster on the map even when its members aren't actually clustered (prototype parity: "Möllevången Crew" always visible at Möllevångstorget). **Rule: proximity wins** — a live proximity cluster of the group's members is decorated at their real centroid; only when they're NOT clustered does a resting pin synthesize at `fixedLocation`. Non-absorbing: an individually-visible member keeps their own real-time pin. (`buildGroupPins` + `useGroupMemberProfiles`; verified device-free via `verifyGroupPins.js`.) (2026-06-03)

#### Dev Mock Friends (testing infrastructure)
- [x] **Seed 5 mock friends** — profiles, spots, locations, friendships in Firestore emulator
- [x] **2 friends at Rörsjögatan 8** — cluster test (Alice+Bob, both inside their spots → visible)
- [x] **1 friend at own spot in Malmö center** — individual visible pin (Charlie at Möllevången)
- [x] **2 friends not in spots** — hidden/ghost mode (Dana+Eve, location sharing off)

#### Display Seeded Friends (wire up test data)
- [x] **Show seeded friends on map** — `useFriendLocations` + `useMapProjection` + `FriendMarker`/`ClusterMarker`; clustering by 100m Haversine
- [x] **Show seeded friends in friends list** — `onFriends` subscription with per-friend profile fetch; now auth-reactive for account switching
- [x] **Render seeded friends' spots on map** — ~~mint-tinted circle + emoji label per friend~~ reverted 2026-04-23 (prototype parity: only viewer's own spots render as zones). Spot snapshot still embedded in `locations/{uid}` and surfaces as "At {spot.name}" in the friend popup card.

#### Friends Screen
- [x] **Avatar component** — `UserAvatar` with size variants + status dot in use on Chats screen
- [x] **Presence indicators** — mint dot when friend is inside an active spot (location doc exists), muted grey otherwise (2026-04-17)

#### Settings Screen
- [x] **Profile card** — `UserAvatar` + name/handle/bio, whole card taps through to `/settings/account` (Edit affordance); account detail has avatar w/ camera badge + editable name & bio + Save. (2026-06-03)
- [x] **"Test Onboarding" button** — in Developer / Debug detail, navigates to `/(auth)/phone`. (2026-06-03)

#### Tab Navigation
- [x] **Tab icons** — Lucide-style SVG icons (`MapIcon`/`UsersIcon`/`MessageSquareIcon`), no emoji. (2026-06-03)
- [x] **Active tab indicator** — focused icon scales 1.12 + signal-blue glow (halo for Android, shadow for iOS). (2026-06-03)
- [x] **Tab bar styling** — floating glass bar: `position: absolute` + `tabBarBackground` BlurView (intensity 40) under a `bg-void/80` overlay. Screens pad to clear it (chats/settings `pb-24`; map controls at `bottom: 96`, my-location button hidden while a card is open). (2026-06-03)

---

### Phase 2 — Onboarding & Auth Polish

> After MVP core is solid. Access via Settings → "Test Onboarding".

#### Onboarding Carousel (NEW)
- [x] **5-slide carousel** before auth flow — `app/(auth)/onboarding.tsx`; anti-ads (rose) / culture (purple) / events (orange) / map (signal) / control (mint); step dots, per-slide accent CTA, RN Animated orbit/radar/pulse illustrations, "Enter the Void" → `/(auth)/phone`. Developer → Test Onboarding retargeted here. (2026-06-10)

#### Auth Screens (phone → OTP → profile → permissions)
- [x] **Shared AuthLayout wrapper** — `src/components/auth/AuthLayout.tsx`: SVG radial-gradient glow blob (corner/center), "us" logo chip, step dots, accent/white CTA variants, secondary link. (2026-06-10)
- [x] **Phone screen** — "ENTER THE VOID." headline, Smartphone SVG icon, focus-reactive glass input, signal uppercase labels. (2026-06-10)
- [x] **OTP screen** — bigger boxes (kept 6 digits — emulator codes; filled = white bg/black text like prototype), "Wrong number? Retarget." (2026-06-10)
- [x] **Profile screen** — "IDENTITY." layout, dashed avatar border + Zap badge, signal uppercase labels, "Initialize Profile" CTA. (2026-06-10)
- [x] **Permissions screen** — "SYNCHRONIZE." with centered radial glow, white CTA, mint Shield privacy pill. (2026-06-10)

#### My Spots (Onboarding & Management)
- [ ] **Spots step polish** — `app/(auth)/spots.native.tsx` already exists in the flow after permissions (pre-flight finding: build done, polish optional)

---

### Phase 3 — Build & Distribution

1. Build APK with EAS: `eas build --platform android --profile preview`
2. Set up Firebase App Distribution for testers

## How to Run
1. Terminal 1: `firebase emulators:start --project demo-us-app` — **must be `demo-us-app`**: auth-user creation (seed + dev sign-in) targets it as the emulator's default project (2026-06-10)
2. Terminal 2: `npx expo start --clear`
3. Open **Expo Go** on phone → scan QR code from terminal
4. If LAN fails: `npx expo start --tunnel`
5. **Seed test data:** Settings → Developer → "Seed Test Data" (creates 5 dummy friends)
6. **Switch accounts:** Settings → Developer → tap any account to sign in as that persona

## Key Files
| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout with auth guard + real-time profile listener |
| `app/(auth)/onboarding.tsx` | 5-slide onboarding carousel — per-slide accent, animated illustrations, "Enter the Void" → phone |
| `src/components/auth/AuthLayout.tsx` | Shared onboarding/auth scaffold — glow blob (exported `GlowBlob`), logo chip, dots, CTA |
| `app/(auth)/phone.tsx` | Phone auth via emulator REST API |
| `app/(auth)/otp.tsx` | OTP verification with auto-fill |
| `app/(auth)/profile.tsx` | Profile creation with handle uniqueness check |
| `app/(auth)/permissions.tsx` | Location permission request |
| `app/(auth)/spots.native.tsx` | Spots setup (native, uses react-native-maps) |
| `app/(auth)/spots.tsx` | Spots fallback (web placeholder) |
| `app/(tabs)/chats.tsx` | Chats tab — real chat list (DMs + groups), compose-DM / compose-group / add-friend / settings icons, pending friend requests |
| `app/(tabs)/communities.tsx` | Communities tab — placeholder |
| `app/(tabs)/map.native.tsx` | Map screen (native, uses react-native-maps); wires chats → named cluster decoration + "Open Group Chat" → `/chat/[id]` |
| `app/(tabs)/map.tsx` | Map fallback (web placeholder) |
| `app/chat/[chatId].tsx` | Chat detail screen — inverted FlatList of messages, member-count header, send input |
| `app/(tabs)/settings.tsx` | Settings home — profile card + nav list (My Account, Privacy & Safety, My Spots, Developer) + Sign Out |
| `app/settings/account.tsx` | My Account detail — avatar (camera badge), editable name + bio, read-only handle, Save |
| `app/settings/privacy.tsx` | Privacy & Safety detail — location sharing / friend requests / online status toggles |
| `app/settings/developer.tsx` | Developer / Debug detail — Seed Test Data, account switcher, Test Onboarding → `/(auth)/phone` |
| `src/components/settings/SettingRow.tsx` | Nav-list row (icon + label + subtitle + value/badge/chevron or custom right accessory) |
| `src/components/settings/SettingsGroup.tsx` | Titled glass card grouping `SettingRow`s with hairline dividers |
| `src/components/settings/SettingsDetailLayout.tsx` | Full-screen detail scaffold — back-header + title + scroll body |
| `src/components/map/ClusterCard.tsx` | Floating glass card for a selected cluster (prototype parity); renders GROUP badge + named chat title when matched |
| `src/components/map/FriendCard.tsx` | Floating glass card for a tapped friend marker — name, optional signal + spot pills, ONLINE/OFFLINE status, Message → `getOrCreateDmChat` → `/chat/[id]` |
| `src/config/mapStyles.ts` | Shared dark map style constant (`DARK_MAP_STYLE`) |
| `src/config/firebase.ts` | Firebase config + emulator connection + `getEmulatorHost()` |
| `src/lib/firestore.ts` | Firestore helpers (profile, handles, friends, location, spots) |
| `firebase.json` | Emulators: auth@9099, firestore@8088, ui@4000 (host 0.0.0.0) |
| `src/dev/fakeMaps.tsx` | Web stand-in for react-native-maps (metro resolver target) — real map screens run in the browser |
| `src/dev/fixtures.json` | 5 test personas with Malmö locations, spots, signals |
| `src/dev/seedDevData.ts` | Seeds auth users + Firestore data (profiles, locations, spots, friendships) — in-app version |
| `src/dev/devAccounts.ts` | Account switcher: DEV_ACCOUNTS list, switchAccount(), getCurrentAccountId() |
| `src/dev/runSeed.js` | Node-only seed (no RN deps) — writes fixtures to emulator via admin REST `:commit`. Run: `node src/dev/runSeed.js` |
| `src/dev/verifyProjection.js` | Device-free Bug #3 check — reads live emulator data through the app's read path + projection; expects `CLUSTER(alice+bob) + FRIEND(charlie)` |
| `src/dev/verifyGroupPins.js` | Device-free named-group-pin check — mirrors `buildGroupPins`; asserts proximity-wins (Case A) and resting fixed pin at `fixedLocation` (Case B). Run after `runSeed.js` |
| `src/dev/testProjection.js` | Pure-logic projection test with mock coords (proves clustering math) |
| `src/features/map/groupPins.ts` | `buildGroupPins` — decorates live proximity clusters with a named group + synthesizes a resting pin at `fixedLocation` when members aren't clustered |
| `src/features/map/useGroupMemberProfiles.ts` | Subscribes to profiles of named always-on group members (facepile source for the fixed pin); stable-string-key to avoid subscription thrash |
