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

## App privacy

Separate from deps. See [encryption](encryption.md) for what is protected and its limits.
Rules checked on emulator (`tests/security.rules.test.cjs`) and on the real backend once.
