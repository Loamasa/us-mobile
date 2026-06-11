# us-mobile — Changelog

> Dated session history, newest first. Moved out of STATUS.md on 2026-06-11 (Phase 3 Step 1
> diet) — STATUS.md now carries only current state. New session entries land HERE; STATUS.md
> gets the updated state. Entries below the move are verbatim from STATUS.md.

## 2026-06-11 (Phase 3 start — round-5 verdict + Step 1 cleanup)
- **Round 5 device result: markers STILL clipped** after attempt #3 (`collapsable={false}` + fixed size + transparent margin). Screenshot evidence: markers reduced to tiny slivers (worse-looking than round-4's quarter-circles — the now-mostly-transparent roots mean a small bitmap crop shows mostly empty margin) and the FriendMarker invisible entirely; all four entities sat at CORRECT coordinates, so data → projection → marker pipeline is confirmed on device — purely a rendering-layer failure. Map style/HUDs/tab bar all correct on device. Escalation research closed the case: it's a **library-level bug** — react-native-maps 1.20.1 + Android New Architecture breaks custom View markers (rnm [#5877](https://github.com/react-native-maps/react-native-maps/issues/5877), [#5655](https://github.com/react-native-maps/react-native-maps/issues/5655); our exact symptoms, incl. quarter circles). Every workaround in those threads was already tried and disproved in rounds 1–4. No JS-side fix exists. The fix (1.27.x, Fabric-native) **crashes Expo Go** (`RNMapsAirModule` not in the Go binary) and `newArchEnabled:false` is untestable in Expo Go (new-arch-only since SDK 53) — so the **marker fix is the first item of Step 4** (EAS dev build), per user decision. Step 0 verdict otherwise stands: all flows functionally confirmed on device.
- **Step 1 cleanup pass executed**: Antigravity removed (junction unlinked safely, `.antigravity/` + `.agents/` deleted, ready-to-test workflow folded into the expo-devops skill), memory mirror collapsed (`.context/memory.md` = single committed gotchas file; stale browser-testing entry rewritten; marker gotcha added), STATUS.md dieted with history moved here, skill fixes (emulator port 8088 in expo-devops + firebase skills, git-workflow rewritten to the real direct-to-main flow, local skill-creator deleted — plugin supersedes), npm scripts added (`typecheck`/`seed`/`verify`/`emulators`).
- **Step 3 started — RE-SCOPED to fixed tester accounts (user decision: no self-registration)**: 20 pre-provisioned email/password accounts replace the planned registration screens. NEW `src/dev/provisionTesters.js` — REST-only (no admin SDK/service account): public `signUp` creates testerNN auth users, then each account writes ITS OWN `users/{uid}` profile + `handles/testerNN` doc, so a successful run against the ENFORCED emulator rules doubles as proof the production rules permit the flow. Idempotent: `testers-credentials.csv` (gitignored) is output AND state; existing profiles never overwritten. NEW `app/(auth)/signin.tsx` (Account ID + password; bare IDs → `@us.test` via `TESTER_EMAIL_DOMAIN`; first-login routes by location-permission check → permissions → spots → map); onboarding CTA retargeted phone → signin; phone/OTP demoted to a `__DEV__`-only secondary link. **Fixed a real dev bug en route**: `ensureDevUser` checked `auth.currentUser` synchronously at boot, but auth persistence restores ASYNC — every dev reload stomped the persisted tester/persona session back to dev-user; it now waits for the first `onAuthStateChanged` emission. Browser-verified end-to-end: provision 3 → sign in as tester01 → permissions → spots → map → full reload keeps the session ("Tester 01 @tester01" in Settings) → display-name edit persisted to Firestore → reset. Zero console errors; tsc clean. Remaining: prod provisioning (needs the deploy + Email/Password provider enabled) + empty-state audit.
- **Step 2 backend wiring executed (deploy pending)**: `.firebaserc` → `us-v1-ff6b3`; friendRequests index fixed to `(status ASC, createdAt DESC)`; NEW chats composite `(type ASC, memberIds CONTAINS)` added — `getOrCreateGroupChat` combines `==` + `array-contains`, which needs a composite in production and the emulator never enforces indexes; `EXPO_PUBLIC_USE_EMULATORS=false` override in `src/config/firebase.ts` (verified default-on in browser: emulators connect, map renders all seeded entities, zero errors). Verify suite green: projection PASS, group pins 8/8, rules 17/17. `firebase deploy --only firestore` blocked on a one-time interactive `firebase login` (CLI refuses non-interactive) — the only open Step 2 item. **Billing decided: Spark for Phase 3** (email/password free, deploys free, free Firestore quota covers the cohort; Blaze only for phone-auth SMS at public release).

## 2026-06-11 (Step 0 device pass — round 4, session wrap)
**Broadcast naming + menu-first placement per user spec; marker fix attempt #3 (`collapsable={false}`).**
- **Renames (user spec)**: composer = **"Broadcast a spot"**, toggle = **"Group Spot"**, card badges BROADCAST / GROUP SPOT / INVITE, marker pill BROADCAST, "End Broadcast".
- **Menu-first placement (user spec)**: rose button opens the composer FIRST; its CTA without a location is **"📍 Place on map"** → hands the finished `BroadcastDraft` to the map screen, banner "Tap the map to place your broadcast" (✕ cancels), next map tap CREATES the broadcast there (`handlePlaceDraft`). Long-press remains the location-first shortcut (menu opens with coordinate pre-set; CTA "📡 Broadcast" creates directly). Browser-verified end-to-end: button → menu → Place on map → banner → tap → doc `visibility:FRIENDS` at tapped coord → pin renders, banner clears.
- **Marker visuals, attempt #3**: round 4 showed even content-sized flexbox roots clip (incl. FriendMarker, which had survived rounds 1–3 — so round-3's structural theory was incomplete). New defense on ALL three markers: root child `collapsable={false}` + FIXED size + ~25–30% transparent margin (defeats Fabric view-flattening; margin absorbs edge-clipping). *(Round 5 disproved this too — see top entry.)*
- `tsc` clean; 17/17 rules checks; emulator state canonical (re-seeded; test docs removed). Stale `placingGathering` console errors during the pass were mid-edit HMR artifacts — final bundle renders clean.
- **Step 0 verdict after 4 rounds**: every flow is functionally CONFIRMED on device (map data, chats, composer, friend accept, broadcast create) — the ONLY open device issue is marker bitmap rendering.

## 2026-06-11 (Step 0 device pass — round 3)
**Marker clipping attacked structurally + broadcast redesigned into the place-on-map "Gathering" flow per user spec.**
- **Marker rendering rules — three rounds of device evidence**: round 3 showed quarter-circle clipping PERSISTS with default tracking → remaining theory: fixed-size marker roots + absolutely-positioned children clip in the Fabric marker bitmap. ClusterMarker & BroadcastMarker rebuilt as content-sized flex columns (the FriendMarker structure): cluster = disc with UsersIcon + count inline (halo + corner badge gone); gathering = emoji disc + status pill BELOW ("INVITE" / "N IN" / "GATHERING"). Rule set (never tracksViewChanges / no fixed root / no absolute children / no looping Animated) recorded as NOTE comments in the marker files + memory.
- **Gathering redesign (FEATURES.md #1 v1.2, user spec)**: rose button ARMS tap-to-place mode (rose banner "Tap the map to place a gathering" + ✕ cancel) — the pin goes where you TAP, never implicitly at GPS; long-press still shortcuts. Composer renamed **"Gathering"** with a **"Group Gathering" toggle** (off by default): solo places a `visibility:'FRIENDS'` pin all friends can see, incl. whether you're physically there (replaces the v1.1 currentSignal write); toggled on reveals a **searchable** invite picker (chat-composer pattern) → `visibility:'MEMBERS'` invite-only gathering. Friends' solo pins: per-friend `createdBy+visibility` query fan-out (`onFriendSoloBroadcasts` — query shape must stay narrow or rules deny it). BroadcastCard gained **PEEK mode** (read-only: "Charlie is/isn't here right now" + countdown, no CTAs); MEMBER card hides the chat CTA for solo. Rules: FRIENDS-visibility read clause; **verifyRules now 17 checks, all PASS** (emulators restarted for the rules change). New fixture `gathering_solo_charlie` (🎮, FRIENDS).
- **Known gap (intentional)**: `currentSignal` has no setter UI anymore — marker badges/HUD/seeded signals still display. Fold the status-signal concept into gatherings (or re-add a setter) in a later pass.
- Browser-verified end-to-end: all 5 pin types render; PEEK card on charlie's solo; arm → tap → composer; toggle reveals search ("dan" filters to Dana); group placement → doc `MEMBERS` + dana invited; solo placement → doc `FRIENDS`, no invitees. Zero console errors; `tsc` clean; projection + group pins PASS.

## 2026-06-11 (Step 0 device pass — round 2)
**Markers CONFIRMED rendering on device (round-1 fix worked) but clipped; Broadcast button unified with Group Broadcast.**
- **Marker clipping — the word on `tracksViewChanges`**: round 2 showed markers rendering but clipped to quarter-circles. The round-1 "track ~1.2s then flip off" hook fixed invisibility, but the bitmap capture AT THE FLIP grabs a mis-scaled frame on the new architecture (SDK 54 / Fabric). **Never set `tracksViewChanges` on this stack** — hook deleted, all three markers use Android's default. NOTE comments in all marker files; memory updated.
- **Broadcast button → unified composer (FEATURES.md #1 v1.1)**: rose button now opens `BroadcastComposerModal` (at GPS position, else map-center via `regionRef`/`onRegionChangeComplete`); **SignalModal deleted**. One mental model: **0 invitees → writes `currentSignal`** (personal signal, old behavior exactly); **1+ invitees → pinned group broadcast**. Long-press placement unchanged. Browser-verified: solo broadcast wrote `currentSignal` (REST-confirmed, NO broadcast doc) → ActiveSignalHUD "🍺 Beer · 59m left".
- `tsc` clean; markers + broadcast pins render in the browser shim.

## 2026-06-11 (feature batch after Step 0 round 1)
**All 3 requested features BUILT & browser-verified: View-Map chat pill, onboarding spots = My Spots parity, Group Broadcast v1 (FEATURES.md #1 → SHIPPED).**
- **View Map pill in chat headers** (`app/chat/[chatId].tsx`): GROUP → members' locations fan-out (stable string key) resolves a live proximity cluster (centroid, proximity wins) else a named ALWAYS group's `fixedLocation`; DM → peer's live position (presence dot now derives from the same doc). Tap → map tab `focusLat/focusLng/focusTs` params → `animateToRegion` (retry covers lazy tab mount). Verified: crew chat pill jumps to the alice+bob cluster centroid.
- **Onboarding spots step = My Spots parity**: headline "MY SPOTS.", intro explains visibility + "switch off / schedule / ghost anytime" (user feedback); add-spot modal gained radius + weekly-hours via NEW shared `src/features/spots/{RadiusChips,ScheduleFields}.tsx` (extracted from MySpotsModal; `normalizeTime` moved into `spotSchedule.ts`). Verified end-to-end: scheduled spot created in onboarding persists with `days/start/end`.
- **Group Broadcast v1 SHIPPED** (FEATURES.md #1): top-level `broadcasts/{id}` (creator/emoji/text/GeoPoint/radius/expiresAt/memberIds/invitedIds/chatId). Rules: members+invitees-only read, creator-create, member/invitee update, creator delete — **verifyRules 15 checks, all PASS** after emulator restart (rules don't hot-reload). Map: long-press anywhere → composer (signal presets/TTL, invite picker, solo allowed) → rose pin (solid member / dashed INVITE w/ badge); card shows roster facepile + "here now" (Haversine within radius) + countdown + Join/Decline or Open Group Chat (deterministic `getOrCreateGroupChat`, `chatId` stored on the broadcast) + creator End. New `src/features/broadcasts/{useBroadcasts,BroadcastMarker,BroadcastCard,BroadcastComposerModal}` + fixtures `broadcast_tonight`/`broadcast_invite` in both seeds. `fakeMaps` shim gained `onLongPress`. **Full loop verified live in browser.** Zero console errors; `tsc` clean.

## 2026-06-11 (Step 0 device pass — round 1)
**User ran the Pixel 7 pass: 5 device bugs reported, all root-caused & FIXED (browser-verified); 3 feature requests queued.**
- **Empty map ROOT-CAUSED (and old Bug #3 re-explained)**: both markers shipped `tracksViewChanges={false}` from mount — Android snapshots Marker children to a bitmap, so async-drawn content (SVG icons, custom-font text, avatars) was captured blank → invisible markers. The prop hit ClusterMarker on 2026-04-18 (`05f3640`) — the SAME evening the device showed "only Charlie, no cluster" (Bug #3, then misattributed to stale data) — and FriendMarker on 2026-04-23 (`1b85734`); no device test ever ran after that, and the browser shim renders DOM so June verifications couldn't catch it. Fix: `useMarkerTracksViewChanges` hook (track ~1.2s after mount/content change, then off); ClusterMarker's Animated pulse → static halo. **Lesson: browser-shim verification covers data/logic, NOT react-native-maps rendering behavior.**
- **Snapshot-listener red box (rules L41) FIXED**: every `onSnapshot` in `src/lib/firestore.ts` now has an error callback (`onSnapshotError(label)`). The device error was a teardown race — REST data shows the user's alice→charlie accept SUCCEEDED 0.5s after the red box; only the uncaught-error UX was broken. Without a handler, one transient permission-denied also silently KILLS the listener.
- **Composer rows stacked on device FIXED**: layout props lived in the `Pressable` function-style, which native drops (NativeWind interop) — web rendered fine. Layout moved to an inner `className` View; function style keeps only pressed-opacity.
- **Android keyboard covering chat input FIXED**: `KeyboardAvoidingView` now `behavior="padding"` on Android too — `edgeToEdgeEnabled: true` (SDK 54) means the window no longer resizes for the keyboard.
- **Map roads/shields hidden**: `DARK_MAP_STYLE` turns off `road`, `transit`, `labels.icon` entirely (prototype = void canvas with locality names + water only). Native-only change.
- **"Request Sent" native Alert replaced**: add-friend modal swaps to a styled mint-check success state, auto-dismisses after 1.6s. Both test requests landed in the emulator (docs cleaned up after).
- `tsc` clean; browser pass: chats list, composer flow, map cluster/pin + ClusterCard, zero console errors. `verifyProjection` re-run PASS.
- **Feature requests from the pass**: (1) Group Broadcast (FEATURES.md #1) build; (2) show-group-on-map button in group chats; (3) onboarding spots step = "My Spots" parity.

## 2026-06-11 (meta-review wrap)
**Token scrubbed + settings untracked; Phase 3 plan locked & committed; project permission allowlist added.**
- **Leaked GitHub token — RESOLVED**: token line removed from `.claude/settings.local.json` and the file `git rm --cached` + gitignored — it had been TRACKED in git. Token tested still VALID → user revoked the issuing app ("Git Credential Manager") the same day — **issue fully CLOSED**. (Side effect: next HTTPS `git push` re-prompts a browser sign-in once.)
- **Phase 3 plan committed**: `docs/plans/2026-06-11-phase3-readiness-plan.md`. Decisions locked: interim **email/password** auth, **Android-only**, **EAS internal distribution**, **background location IN scope** (product core; `expo-task-manager` must ship in build #1; needs the dev build → Step 5). **Step 0 (full Expo Go device pass) gates all Phase 3 work.**
- **`.claude/settings.json` committed**: read-only allowlist from transcript scan. `preview_eval` deliberately left out (code execution — user's call).

## 2026-06-11 (pre-Phase-3 review)
**Full code review for two-real-people testing: debug features gated, 2 real bugs + 2 rules defects FIXED & verified. New device-free rules check `src/dev/verifyRules.js`.**
- **Auth gate added (`app/index.tsx`)**: signed in → `/(tabs)/map`, signed out → `/(auth)/onboarding`. Dev behavior unchanged. Sign Out routes back through the gate.
- **Developer route gated**: `app/settings/developer.tsx` returns `<Redirect>` when `!__DEV__` — the route was reachable by deep link in any build.
- **Phone auth explicitly dev-only**: `phone.tsx` short-circuits in production instead of timing out against `127.0.0.1:9099`.
- **FIXED — accepting a friend request was impossible under the old rules**: `acceptFriendRequest` batches a write into BOTH users' friend lists; owner-only write rules denied the batch. Rules now allow `friendId == auth.uid` (you may write only YOUR OWN entry into someone else's list; third-party injection stays blocked, verified).
- **FIXED — live locations were world-readable**: now owner + friends only (`exists(users/{owner}/friends/{reader})`). Handles read tightened to authed-only.
- **FIXED — OTP auto-submit stale closure** (`otp.tsx`): typing the 6th digit called `handleVerify()` from a render where `code` was still 5 digits. Now passes the fresh text.
- **FIXED — stale location doc on cold start** (`useLocationTracking`): `lastPublishedRef` now starts `true` → first out-of-spot fix cleans up a lingering doc.
- **Minor: cluster members now expiry-check signals** (`useMapProjection`).
- **`src/dev/verifyRules.js` (new)**: signs in as real emulator users (NOT `Bearer owner`) and asserts 10 rules guarantees. 10/10 PASS. `verifyProjection` + `verifyGroupPins` re-run PASS. `tsc` clean.
- **`FEATURES.md` created** — post-prototype wishlist (DRAFT → CONFIRMED → SCHEDULED). Entry #1 **Group Broadcast** CONFIRMED by user.
- Flagged-not-fixed items recorded (most now live in the Phase 3 plan's deferred ledger / STATUS open items).

## 2026-06-11 (later) — user-feedback Broadcast fix + both requested product changes
- **Broadcast button un-gated** ("can't press Broadcast"): was disabled until a GPS fix existed — but `signal.location` is consumed NOWHERE (write-only metadata). `UserSignal.location` is now `GeoPoint | null`, the modal broadcasts regardless. Verified live: broadcast on web (no GPS) → 🍺 signal with `location: null` + HUD countdown. **Never gate features on `signal.location`.**
- **Single new-message button (Messenger-style)**: ONE compose icon → "To:" picker with chips, always-multi-select rows, group-name input at 2+ (optional), adaptive CTA. 1 → `getOrCreateDmChat`, 2+ → `getOrCreateGroupChat`. Verified live incl. deterministic dedup to seeded Study Crew.
- **My Spots scheduling (weekday + time windows)**: `SpotSchedule` (`days` ISO 1–7, `start`/`end` "HH:mm", end<start spans midnight) on `UserSpot.schedule?`. Single source of truth `src/features/spots/spotSchedule.ts`. Consumers: `useLocationTracking` (+60s re-check tick), map circles/labels + HUD, `MySpotsModal` form, schedule-aware seeds (+ alice's scheduled "Uni Library" fixture). Verified live both ways (vanish outside window, reappear when window opens). `verifyProjection` + `verifyGroupPins` PASS; `tsc` clean.

## 2026-06-11 — pre-user-testing fix list executed + Phase 2 closed out
- **DM get-or-create race fixed**: deterministic id `dm_${[a,b].sort().join('_')}` + `getDoc` probe + `setDoc(merge)` (helper `dmChatId`). Rules change: `chats` read allows `resource == null` for the probe. Seeded DM renamed `chat_dm_alice` → `dm_alice_dev-user`.
- **Seeded chats now have real messages**: `fixtures.json` chats carry `messages[]`; both seeds write `chats/{id}/messages/seed_NN` docs and derive `lastMessage`/`lastMessageAt` (37 writes, was 29).
- **DM empty-state copy** branches on `chat.type`: DMs say "Say hi to {peer displayName}."
- **Back-from-chat ROOT-CAUSED & FIXED**: root layout rendered `<Slot />`, so pushing `/chat/[chatId]` unmounted the whole `(tabs)` tree; back remounted at the first tab. Now `<Stack screenOptions={{ headerShown: false }} />`. Verified both directions live.
- **Spots step polished + browser-testable**: "ANCHOR." treatment; `app/(auth)/spots.tsx` re-exports the native screen (fakeMaps shim). Verified live end-to-end.
- Browser-verified against fresh emulators + seed; `verifyProjection.js` + `verifyGroupPins.js` PASS; `tsc` clean.
- **Tutorial chain triaged**: deferred to post-user-testing; only 4 of 8 prototype tutorials target MVP features.
- Session gotchas: emulator **rules hot-reload didn't apply** (restart emulators after rules edits); a **zombie emulator suite** can shadow ports (netstat the PIDs); RNW `text-transform: uppercase` means `innerText` differs from `textContent` (match case-insensitively).

## 2026-06-10 (evening) — map fully testable in the browser (web map shim)
New `src/dev/fakeMaps.tsx`: KISS web stand-in for react-native-maps (dark pane, equirectangular lat/lng→pixel projection, Marker/Circle/animateToRegion, zoom ± buttons, "DEV MAP" watermark). `metro.config.js` resolves `react-native-maps` → the shim on web (was: empty module); the **null web stubs `FriendMarker.web.tsx`/`ClusterMarker.web.tsx` were the hidden reason nothing rendered** — they now re-export the native markers. Verified end-to-end in the preview browser against live emulator data: cluster + pin render; cluster card → group chat → message persisted; friend card → DM created; ghost toggle; signal HUD countdown → clear; **resting group pin** branch (moved Bob via REST → crew pin at fixedLocation → restored → proximity-wins); own-spot circle + label. Map-tap closes cards. `tsc` clean. Shim gotchas: RNW `onLayout` never fired (shim measures via `getBoundingClientRect`); RN Modal close animation never completes in the headless preview (DOM lingers; state flips correctly). **Findings for fix list: seeded `lastMessage` had no message docs; DM empty-state copy; back-from-chat landed on Chats tab.**

## 2026-06-10 (later) — browser-based self-testing setup works
Expo web + Firebase emulators + the Claude preview browser run the full app loop (dev auto-sign-in, chats, DM send verified persisted, settings, My Spots editor). Three root causes fixed: (1) **web bundle failed to compile** — expo-router's `require.context` pulls `*.native.tsx` routes into the web bundle → custom Metro resolver; (2) **sandboxed preview browsers only reach the Metro port** — Metro proxy middleware routes emulator traffic same-origin (path-prefix → :9099/:8088), with `getAuthEmulatorUrl()`/`getFirestoreEmulatorUrl()` helpers; (3) **auth users were created in the wrong emulator project** — key-based SDK calls resolve to the emulator's DEFAULT project (`demo-us-app`); admin REST had created users in `us-v1-ff6b3`, so password sign-in could never have worked. Auth users → `demo-us-app`; Firestore data stays in `us-v1-ff6b3`. **Emulators MUST start with `--project demo-us-app`.** `.claude/launch.json` added.

## 2026-06-10 — Phase 2 onboarding & auth polish built
5-slide onboarding carousel `app/(auth)/onboarding.tsx` (anti-ads/culture/events/map/control, per-slide accent + RN Animated orbits/radar/pulses, "Enter the Void" → phone). Shared `src/components/auth/AuthLayout.tsx` (SVG glow blob, logo chip, step dots, accent/white CTA) — phone/otp/profile rebuilt with prototype headlines ("ENTER THE VOID." / "VERIFY." / "IDENTITY." / "SYNCHRONIZE."), SVG icons replacing emoji, dashed avatar border, mint Shield pill. Kept 6-digit OTP (emulator codes). Auth logic untouched. Settings → Developer → Test Onboarding retargeted. `tsc` clean + full Android Metro export succeeds (1509 modules).

## 2026-06-10 — Phase 2 pre-flight review
Full Phase 1 ↔ prototype parity audit. **Verdict: prototype ready.** Prototype sources complete (Onboarding.tsx 5 slides + AuthFlow.tsx 4-step wizard). Phase 1 parity confirmed; intentional divergences on record (friend spot zones reverted 2026-04-23; settings as tab). The Phase 2 gap was smaller than the checklist implied — all four auth screens already worked end-to-end; Phase 2 = polish + the carousel. Adaptation decisions: keep 6-digit OTP; carousel at `app/(auth)/onboarding.tsx`. "Add your starting spots" already existed. Tutorial overlay chain flagged as unscheduled.

## 2026-06-03 — Phase 1 Core MVP map/UI COMPLETE (merged to main + pushed)
Closed the last three Phase 1 items, each verified device-free (`tsc` clean, `verifyProjection.js` + `verifyGroupPins.js` 8/8 PASS, full Android Metro bundle OK). Landed on `feat/phase1-map-ui`, fast-forwarded into `main`.
- **Tab navigation polish**: floating glass tab bar (`position: absolute` + BlurView under `bg-void/80`); active tab scales 1.12 with signal glow; screens pad to clear the bar (chats/settings `pb-24`, map controls `bottom: 96`, my-location button hides while a card is open).
- **Settings redesign**: prototype-style nav list (profile card + `SettingsGroup`/`SettingRow`) + full-screen detail routes `app/settings/{account,privacy,developer}.tsx` (`SettingsDetailLayout`, outside `(tabs)`). My Spots reuses `MySpotsModal`. New SVG icons.
- **Named group pins without proximity**: named GROUP chat (`mapVisibility:'ALWAYS'` + `fixedLocation`) renders a persistent cluster pin when members aren't together; **proximity wins** when they are. New `src/features/map/groupPins.ts` (`buildGroupPins`) + `useGroupMemberProfiles.ts`. New `src/dev/verifyGroupPins.js` (both branches PASS).

## 2026-06-02 — Bug #3 (Alice+Bob not clustering) resolved by device-free verification
Built the Node harness (`runSeed.js` + `verifyProjection.js`) that seeds the emulator and replays the exact app read path → `CLUSTER(alice+bob) + FRIEND(charlie)` against real seeded data (alice↔bob = 12.77m ≪ 100m). All three `locations/*` docs land; commit dedup correct; projection correct. Root cause attribution: stale emulator data from a prior session, or the pre-fix subscription thrash (2026-04-18) / stale auth-keyed listeners (2026-04-17). `[map-diag]` logs stripped. No code/data defect remained.

---

## Session details (April–March 2026)

### Map Bug Cleanup — Friend Popup + Spot-Zone Gut + Cluster Diagnostics (2026-04-23)
- **Bug #2 — friend marker popup fixed**: `FriendOnMap` carries optional `spot: { name, emoji } | null` from `useMapProjection`; new `src/components/map/FriendCard.tsx` (glass card, signal pill, "At 🏠 Home" pill, ONLINE/OFFLINE, Message CTA); `FriendMarker` dropped `<Callout>` for `onPress`; map screen wires Message → `getOrCreateDmChat` → `/chat/[id]`. Friend and cluster selection are mutex.
- **Bug #1 — friend spot zones gutted** (prototype parity: only viewer's own spots render as zones). Friend's containing spot survives only as `FriendOnMap.spot`.
- **Bug #3 diagnostics added** (`[map-diag]` logs) — later resolved 2026-06-02.

### Chats Tab — DMs + Group Chats (2026-04-18)
`ChatSummary.name` now `string | null` (DMs store null; viewer derives title from the peer's profile). `getOrCreateDmChat` added. Chats screen rewritten: chat list primary (`onChats`), DM presence dots, compose modal (then DM/Group segmented; replaced 2026-06-11 by the single Messenger-style composer), friend requests preserved. Chat detail: DM header resolves peer name + presence. Seed: `chat_study_crew` + alice DM. **Self-review fix: subscription thrash** — fan-out `useEffect` deps switched from array identity to joined-string keys (`profileIdKey`/`presenceIdKey`).

### Group Chat Data Model + Chat Detail Screen (2026-04-18)
Types (`ChatType`, `MapVisibility`, `ChatSummary`, `Message`, `MapEntity.groupChat`); chats + messages security rules (member-only, `get()` parent for messages); helpers (`onChats` array-contains + client sort, `onChatSummary`, `onMessages`, `sendMessage`, `getOrCreateGroupChat` deterministic by sorted memberIds); chat detail screen (inverted FlatList, bubbles, KeyboardAvoidingView); map decorates clusters with matching named ALWAYS chats; seeded "Möllevången Crew" with `fixedLocation`.

### Cluster Card UI + Absorbed Friend Markers (2026-04-18)
`ClusterCard.tsx` (glass card, facepile, Open Group Chat CTA); `ClusterMarker` dropped `<Callout>` for `onPress`; clustered friends' spot zones + pins absorbed into the cluster.

### Auth-Reactive Subscriptions (2026-04-17)
`useFriendLocations`, `useLocationTracking`, Chats, Map all re-wire Firestore listeners on `onAuthStateChanged` — switching dev accounts had left stale subscriptions keyed to the old uid.

### Seed Test Data PERMISSION_DENIED Fix (2026-04-17)
Client-SDK batch ran as `dev-user` writing other users' docs → rules denied. `seedDevData.ts` now commits via emulator REST `:commit` with `Authorization: Bearer owner` (+ `toFirestoreValue` converter).

### Friend Spot Zones on Map (2026-04-17)
Containing-spot snapshot embedded in `locations/{uid}` (privacy: leaks only the current spot, only while visible). Friend spot zones rendered as mint circles — **reverted 2026-04-23** (prototype parity); the snapshot survives as the popup's "At {spot}" line.

### Privacy Gating + UX Polish (2026-04-17)
Location doc written ONLY when inside an own active spot (deleted otherwise); `useFriendLocations` relies on doc presence; ghost mode short-circuits tracking. Settings gear → `/(tabs)/settings` (stale inline modal deleted). FriendMarker rose border on signal; ClusterMarker animated ring (later static); chats presence dots.

### My Spots System (2026-03-03)
`MySpotsModal` (LIST/CREATE/EDIT, emoji grid, radius chips, draggable marker); `updateUserSpot`/`deleteUserSpot`/`toggleUserSpot`; `SPOT_ICONS`, `SPOT_RADIUS_RANGE`; "My Places" row in Settings.

### Tab Layout Fixed (2026-03-02)
`friends.tsx` → `chats.tsx`; tab order Chats / Map / Communities (Map center); Settings became a modal (later a tab + detail routes); `communities.tsx` placeholder; `MessageSquareIcon`.

### Auth Bypass & Dev Auto-Sign-In (2026-03-02)
Auth guard removed from `app/_layout.tsx`; `ensureDevUser()` anonymous emulator sign-in + "Dev User" profile; `app/index.tsx` forces start on `(tabs)/map`; "Test Onboarding" button; STATUS Next Steps reorganized into Phases 1–3.

---

## Resolved ledgers & completed checklists (archived 2026-06-11)

### Known Bugs — all resolved
1. **Leaked GitHub token** — CLOSED 2026-06-11 (scrubbed, untracked + gitignored commit `6747567`, issuing app revoked).
2. **DM get-or-create race** — FIXED 2026-06-11 (deterministic `dm_` id + `setDoc(merge)`; rules `resource == null` probe).
3. **Seed fixtures lie about messages** — FIXED 2026-06-11 (`messages[]` seeded as `seed_NN` docs).
4. **DM empty-state copy** — FIXED 2026-06-11 (branches on `chat.type`).
5. **Back-from-chat tab bug** — ROOT-CAUSED & FIXED 2026-06-11 (`<Slot />` → root `<Stack>`).
6. **Seeded pair not clustering (Bug #3)** — RESOLVED 2026-06-02 (verified, not a code/data bug; repro: emulator → `runSeed.js` → `verifyProjection.js`).
7. **Ghost mode toggle unresponsive** — fixed (zIndex above HUD container).
8. **Signal Broadcast failure** — fixed (error alert, GPS warning, dimmed button).
9. **Seeded friends don't appear after account switch** — fixed 2026-04-17 (auth-reactive subscriptions).
10. **Seed Test Data PERMISSION_DENIED** — fixed 2026-04-17 (admin REST `:commit`).

### Tech debt resolved
- **DM get-or-create race** — fixed 2026-06-11 (the deterministic-id pattern remains available for `getOrCreateGroupChat` if the 3+-member race ever shows up).

### Phase 1 — Core MVP (COMPLETE 2026-06-03)
Map screen (visibility fix, clock widget, visibility HUD, ghost toggle, signal button + HUD); My Spots system; Settings nav-list + detail routes + gear routing; Friend clusters (markers, callout card, absorption, Open Group Chat wiring, named group clusters incl. without-proximity + proximity-wins); dev mock friends (5 personas seeded — alice+bob cluster, charlie individual, dana+eve hidden); seeded friends on map/list (clustering 100m Haversine; friend spot zones reverted 2026-04-23); avatar + presence indicators; profile card; Test Onboarding button; SVG tab icons, active indicator, floating glass bar.

### Phase 2 — Onboarding & Auth Polish (COMPLETE 2026-06-11)
5-slide onboarding carousel; shared AuthLayout; phone ("ENTER THE VOID."), OTP (6-digit), profile ("IDENTITY."), permissions ("SYNCHRONIZE.") screens; spots step "ANCHOR." polish + web re-export. Tutorial overlay chain TRIAGED → deferred to post-user-testing backlog (8 prototype definitions, only 4 target MVP features; ~1 session if built; observe first-contact UX without overlays first).

### Requested Product Changes (2026-06-10 → DONE 2026-06-11)
ONE new-message button (Messenger-style composer); My Spots scheduling (weekday + time windows).

### Non-blocking warnings (historical)
`react-native-svg` version mismatch warning; `SafeAreaView` deprecation; stale emulator data between sessions (re-seed).
