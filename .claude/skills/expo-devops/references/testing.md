# Testing this project

- `npm test`: compile the actual pure map functions and run 14 Node map regressions plus three Metro proxy regressions.
- `npm run typecheck`: compile all application TypeScript without emitting files.
- `npm run verify`: run the real map projection/group-pin functions against seeded
  emulator data, plus the existing 17 authorization checks. Requires running emulators.
- `npm run verify:sdk`: real Firebase SDK sign-in/read/listener against seeded emulators.
- `npm run test:rules`: run two passing negative authorization checks and three
  known failing TODO regressions. Uses disposable users/documents and cleans them up.
- `npm run check:emulators`: manage a temporary emulator instance, seed fixtures,
  and run both verification suites. Do not use while another instance occupies the ports.

There is no Jest dependency. Tests use Node’s built-in runner and the existing
TypeScript compiler. Generated check JavaScript stays ignored under `.expo/test-build`.
Browser smoke checks exercise the real screens through `src/dev/fakeMaps.tsx`.
They cannot verify native Maps rendering, location permissions or physical device behavior.
