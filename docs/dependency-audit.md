# Dependency audit

> Last check 2026-11-28 (after Expo 58.1). Live list: `npm audit`. Old detail in git history.

**17 affected entries, all moderate, from 3 advisories.** All in dev / CLI / build tools, not app code.
`npm audit fix` only offers major downgrades (`expo` 52, `firebase-tools` 13, `@sentry/react-native` 8.20).
Never `npm audit fix --force` — it proposes breaking downgrades.

## Open

| Path | Advisory | What to do |
| --- | --- | --- |
| Firebase CLI → Pub/Sub → OpenTelemetry Core | Moderate: [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) | CLI telemetry only. Wait for upstream. |
| Expo fingerprint, archiver, rimraf, Sentry build plugin → glob 9–14.0.1 | Moderate: [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | Build-time file search only. Wait for upstream. |
| glob → minimatch 7–11.0.0 | Moderate: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Build-time patterns we write ourselves. Wait for upstream. |

## Overrides in `package.json`

Keep until upstream ships the fix, then remove:
`@grpc/grpc-js` 1.14.6 (Firestore), PostCSS 8.5.31, `postcss-selector-parser` 7.1.7
(Tailwind 3 — CSS output checked byte-identical), UUID 11.1.1 (`@expo/ngrok`, `gaxios`).
npm 10 can keep stale nested versions on incremental installs → check `npm ls --all` + lockfile.

## App privacy

Separate from deps. See [encryption](encryption.md) for what is protected and its limits.
Rules checked on emulator (`tests/security.rules.test.cjs`) and on the real backend once.
