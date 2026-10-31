# Dependency audit

> Last check 2026-10-29. Live list: `npm audit`. Old detail in git history.

**11 affected entries: 3 high, 3 moderate, 5 low.** All in dev / CLI / signing tools, not app code.
Never `npm audit fix --force` — it proposes breaking downgrades.

## Open

| Path | Advisory | What to do |
| --- | --- | --- |
| Expo CLI → Zod 3.25.76 | High: [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | Fix only in Zod 4 (breaking). Wait for Expo. |
| Firebase CLI → Pub/Sub → OpenTelemetry Core 1.30.1 | Moderate: [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) | CLI telemetry only. Wait for upstream. |
| Expo config → deepmerge | Low: [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | No compatible fix. Wait. |

## Overrides in `package.json`

Keep until upstream ships the fix, then remove:
`@grpc/grpc-js` 1.14.6 (Firestore), PostCSS 8.5.31, `postcss-selector-parser` 7.1.7
(Tailwind 3 — CSS output checked byte-identical), UUID 11.1.1 (`@expo/ngrok`, `gaxios`).
npm 10 can keep stale nested versions on incremental installs → check `npm ls --all` + lockfile.

## App privacy holes

Separate from deps. `tests/security.rules.test.cjs` has 3 failing TODO tests:

1. Stranger can self-grant friendship → read your location.
2. Chat member can rewrite chat creator.
3. Gathering invitee can rewrite gathering creator.

Accepted for Milestone 1 (trusted friends only). Fix before sharing wider (M4 in [PLAN.md](../PLAN.md)).
When fixed, turn the TODOs into normal passing tests.
