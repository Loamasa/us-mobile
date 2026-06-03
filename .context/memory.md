# us-mobile — Project Memory
> ⚠️ This mirrors `~/.claude/projects/.../memory/MEMORY.md`. Update both if editing.

## User
- Pål, solo developer, Malmö Sweden
- Nonprofit focus, open-source alignment important
- Studies Business Development & Leadership at Hyper Island

## Firebase Project
- Project ID: `us-v1-ff6b3`
- Package: `com.us.mobile`
- Auth: Phone enabled + test numbers configured
- Firestore: Created in test mode
- Emulators: Auth 9099, Firestore 8088, UI 4000 (per `firebase.json`)
- `google-services.json` exists for Android

## Testing
- Expo Go already installed on physical Android phone (Google Pixel 7)
- Standard method: scan QR code from `npx expo start`, phone & PC on same Wi-Fi

## Firestore Collections
- `users/{uid}` — profile + settings + currentSignal
- `users/{uid}/friends/{friendId}` — friend relationships
- `users/{uid}/friendRequests/{id}` — pending/accepted/rejected
- `users/{uid}/spots/{spotId}` — user's named places
- `locations/{uid}` — real-time GPS with geohash (top-level for fast queries)
- `handles/{handle}` — unique handle lookup
- `chats/{chatId}` — chat summary (name, type, memberIds, createdBy, lastMessage, mapVisibility, fixedLocation)
- `chats/{chatId}/messages/{messageId}` — individual messages (senderId, content, createdAt)

## Known Gotchas
- `--legacy-peer-deps` required for all npm installs (React 19 conflicts)
- `as const` arrays + useState = narrow literal types. Use `useState<string>()` explicitly
- NativeWind v4 requires Tailwind CSS v3, NOT v4
- NativeWind versions: nativewind 4.2.1 + react-native-css-interop 0.2.1
- Phone auth web SDK needs reCAPTCHA — mock ApplicationVerifier used for emulator dev
- For production: switch to `@react-native-firebase/auth` (native SDK, no reCAPTCHA)
- Metro Node 22 Windows fix persisted via `patch-package` (postinstall script)
- babel.config.js needs: nativewind/babel preset + react-native-reanimated/plugin
- **Firestore emulator enforces security rules against the client SDK.** Cross-user dev writes (seeding test personas, admin scripts) must go through the REST `:commit` endpoint (`/v1/projects/{pid}/databases/(default)/documents:commit`) with `Authorization: Bearer owner` — this is the documented admin-bypass token, same one already used for auth user creation. `writeBatch(db)` from the JS SDK always runs as the signed-in user.
- **Chats model** (added 2026-04-18): `onChats` uses `array-contains` on `memberIds` and sorts client-side by `lastMessageAt ?? createdAt` — avoids a composite index. Subcollection rules (`chats/{id}/messages/{id}`) authorize with `get(/databases/$(database)/documents/chats/$(chatId)).data.memberIds`. Named group clusters match proximity clusters by sorted `[viewer, ...cluster.friends]` == `chat.memberIds` and decorate the cluster with `groupChat: { id, name }`. Fixture: `chats[]` in `src/dev/fixtures.json` seeds via `src/dev/seedDevData.ts`.
- **Named group pins — proximity-wins** (added 2026-06-03): a named GROUP chat (`mapVisibility:'ALWAYS'` + non-null `name` + `fixedLocation`) reconciles with the live projection in `src/features/map/groupPins.ts` (`buildGroupPins`): (1) LIVE — members proximity-clustered now → decorate that cluster at their real centroid; (2) RESTING — members apart → synthesize a `CLUSTER` at `fixedLocation` (`id: group-<chatId>`, `groupChat.fixed = true`). **When both apply, proximity wins** (fixed pin suppressed). Fixed pins are **non-absorbing** — an individually-visible member keeps their own real-time pin (truthful presence > tidy map). Facepile profiles for ghost/away members come from `useGroupMemberProfiles` (stable-string-key), NOT `useFriendLocations` (needs a location doc). Verify both branches device-free: `node src/dev/runSeed.js` → `node src/dev/verifyGroupPins.js`.
- **Map/cluster bugs are verifiable WITHOUT a device** (added 2026-06-02): start the emulator → `node src/dev/runSeed.js` (Node-only seed via REST `:commit`, mirrors `seedDevData.ts`) → `node src/dev/verifyProjection.js`. The verify script reads LIVE emulator data through the app's exact read path (`users/dev-user/friends` → per-friend `users/{id}` + `locations/{id}`), assembles `friendLocations` like `useFriendLocations.commit` (needs BOTH profile + location), and runs the same clustering as `useMapProjection`. Expects `CLUSTER(alice+bob) + FRIEND(charlie)`. This resolved Bug #3 (Alice+Bob not clustering): the whole pipeline was correct — the device symptom was stale emulator data / pre-fix subscription thrash. Far faster than chasing device console logs.

## Web Prototype (Reference Setup)
- Prototype source copied to `.context/prototype/src/` (82 files, finished, won't change)
- `.context/prototype/prototype-map.md` — file-level index with one-liner per file
- Skill: `.claude/skills/prototype-reference/SKILL.md` (Claude Code)
- Skill: `.agents/skills/prototype-reference/SKILL.md` (Antigravity)
- Both skills point to the same `.context/prototype/` data — one source of truth
- Workflow: read prototype-map.md first → fetch 1-2 specific files → adapt to React Native
- Prototype is web (React/Leaflet/CSS). Production is React Native/Expo/NativeWind/Firebase.
- Prototype includes the FULL app. MVP only uses a subset of features at a time.
