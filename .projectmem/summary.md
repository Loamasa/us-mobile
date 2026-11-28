# projectmem - us-mobile

_Last updated: 2026-11-27_

## Project purpose
**us** = location-based social app for meeting friends in person. Share location only where you choose. Map gatherings. DM + group chat. Built with Expo, React Native, Firebase. Nonprofit.

## Recent issues
- [DONE] #legacy_43d2 Legacy issue: chore(deps): apply Expo SDK 58 patch updates (npx expo install --fix) (fixed)
- [DONE] #legacy_3b9b Legacy issue: docs: step-by-step Maps billing fix and how to try each distribution channel (fixed)
- [DONE] #legacy_1217 Legacy issue: fix(dev): check:maps-key no longer reads a disabled API as a restricted key (fixed)

## Decisions
- Guests (Firebase anonymous auth) allowed for M1 testing; sign-up stays open because closing it would also block guests. PLAN M1 step 4 parked. [app/(auth)/signin.tsx]

## Notes
- chore: drop leftover format-patch, archive Felix's phase 1 rundown
- chore(deps): Expo SDK 58 patch updates (expo 58.0.26, dev-client, router)
- Merge pull request #5 from Loamasa/claude/project-thread-03eqlp
- chore: update Expo SDK dependencies and project setup
- Merge branch 'fel/phase1' of https://github.com/Loamasa/us-mobile into fel/phase1
- New feature: feat: use OpenStreetMap on Android [src/dev/fakeMaps.tsx]
- New feature: feat: add guest sign-in [app/(auth)/signin.tsx]
- gotcha: Firebase Auth signUp returning ADMIN_ONLY_OPERATION means user sign-up is disabled in project settings; it also blocks signInAnonymously (guest). [src/dev/provisionTesters.js]
- New feature: feat(dev): mention guest sign-in in tester invites [src/dev/testerInvites.js]
- gotcha: Expo runtimeVersion policy "fingerprint" hashes package.json scripts; editing any npm script (even "test") changes the runtime, so OTA updates no longer reach already-built APKs. [app.json]

## Key files
- `package-lock.json`
- `package.json`
- `.github/workflows/checks.yml`
- `.context/memory.md`
- `STATUS.md`
- `docs/development-setup.md`
- `src/dev/fakeMaps.tsx`
- `src/dev/webMercator.ts`
- `tests/web-mercator.test.cjs`
- `tsconfig.checks.json`
- `.gitignore`
- `docs/plans/2026-11-08-invites-and-distribution.md`
- `docs/tester-distribution.md`
- `src/dev/testerInvites.js`
- `tests/tester-invites.test.cjs`
- `docs/CHANGELOG.md`
- `docs/maps-key-hardening.md`
- `docs/plans/2026-06-11-phase3-readiness-plan.md`
- `src/dev/checkMapsKey.js`
- `README.md`

## Open questions
- None logged yet.
