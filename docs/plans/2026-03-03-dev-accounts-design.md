# Dev Accounts & Test Data System

**Date:** 2026-03-03
**Status:** Approved

## Problem

Can't test account-dependent features (friends, signals, map presence) without real users. Current dev setup creates one anonymous "Dev User" but no friends or test data exist.

## Solution

JSON fixture file with 5 dummy test accounts + a seed function that writes them to Firestore emulator + an account switcher in Settings to log in as any persona.

## Test Personas

| ID | Name | Handle | Location | Scenario |
|----|------|--------|----------|----------|
| `dev-user` | Dev User | @dev | **Real GPS** | Default account, uses actual phone position |
| `alice` | Alice Svensson | @alice | Rörsjögatan 8, Malmö | Has spot, visible, active signal |
| `bob` | Bob Nilsson | @bob | Rörsjögatan 8, Malmö | Same location as Alice (cluster test) |
| `charlie` | Charlie Öberg | @charlie | Möllevången, Malmö | Has spot, visible (individual pin) |
| `dana` | Dana Lindqvist | @dana | Västra Hamnen, Malmö | No spot, not sharing (hidden) |
| `eve` | Eve Bergström | @eve | Turning Torso, Malmö | No spot, not sharing (hidden) |

All 5 dummies are bilateral friends with dev-user.

## File Structure

```
src/dev/
  fixtures.json        — test personas, locations, spots, friendships
  seedDevData.ts       — reads fixtures, writes to Firestore emulator
  devAccounts.ts       — account switching logic (sign out -> sign in as X)
```

### Modified files

- `app/(tabs)/settings.tsx` — "Seed Test Data" button + "Switch Account" picker in Developer section
- `app/_layout.tsx` — no changes (existing ensureDevUser() stays as-is)

## Seeding

- Button: "Seed Test Data" in Settings > Developer section
- Writes: 5 profiles, 5 location docs, 3 spots (Alice, Bob, Charlie), 10 friendship docs (bilateral), 1 signal (Alice), 5 handle reservations
- Idempotent: uses setDoc (overwrites), safe to re-seed
- Shows success toast on completion, alert on failure

## Account Switching

- Picker: "Switch Account" in Settings > Developer section, shows all 6 accounts
- Mechanism: sign out current user -> sign in as selected account via Firebase Auth emulator
- Dummy accounts use fixed locations from fixture
- Dev User uses real GPS tracking
- Switching does not auto-seed — user must seed first

## Fixture Data Details

### Locations (fixed Malmö coords)
- Alice: 55.5953, 13.0115 (Rörsjögatan 8)
- Bob: 55.5954, 13.0116 (Rörsjögatan 8, ~10m offset for cluster)
- Charlie: 55.5890, 13.0010 (Möllevången)
- Dana: 55.6130, 12.9880 (Västra Hamnen)
- Eve: 55.6135, 12.9750 (Turning Torso)

### Spots
- Alice: "Home" at Rörsjögatan 8, 100m radius, active
- Bob: "Home" at Rörsjögatan 8, 100m radius, active
- Charlie: "Hangout" at Möllevången, 150m radius, active

### Signals
- Alice: "coffee" emoji, "Getting coffee, come join!", expires 1 hour from seed time

## Error Handling

- Emulator not running: alert "Firestore emulator not reachable"
- Already seeded: overwrites safely (idempotent)
- App restart after switching: stays as switched account, manual switch back
- Production safety: all dev UI and imports behind __DEV__ guards

## Architecture Decisions

- String IDs (e.g. "alice") instead of auto-generated UIDs for easy Firestore debugging
- Firebase Auth emulator REST API for switching between accounts with specific UIDs
- Fixture file is version-controlled, reviewable, and matches TypeScript types
- Dev User keeps existing anonymous auth flow from ensureDevUser()
