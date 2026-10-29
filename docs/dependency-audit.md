# Dependency audit — 2026-10-24

## Update — 2026-10-29

Expo SDK 58 dependencies were aligned with the current recommended patch versions.
This also updated `node-forge` to 1.4.2 and removed its reported high-severity
advisory. `npm audit` now reports **11 affected entries: 3 high, 3 moderate and
5 low**. Counts include affected parent packages. The remaining high entries
trace to Expo CLI's Zod 3 and [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5);
the fix is in Zod 4, an incompatible major version. The moderate path remains
Firebase CLI's OpenTelemetry dependency. A low-severity deepmerge advisory
([GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4))
affects Expo's configuration dependency; the audit reports no compatible fix.
Do not use `npm audit fix --force`, which proposes breaking downgrades. Recheck
these paths when upstream dependencies are updated. The following sections
describe the earlier audit and are retained as history.

The Expo migration reduced `npm audit` from **19 affected package entries
(5 high, 14 moderate)** to **8 (5 high, 3 moderate)**. These are dependency-tree
entries, including parent packages affected by the same advisory: three
underlying advisories remain. This is not a security clearance.

## Fixed and checked

- Expo SDK 58.0.19 / React Native 0.88.0 / Maps 1.29.11 remove the older
  Metro `image-size` and Router URL-decoding advisory paths.
- Firestore uses `@grpc/grpc-js` 1.14.6, scoped to its dependency, for
  [certificate authentication](https://github.com/advisories/GHSA-m9gg-hp2v-232j)
  and [error disclosure](https://github.com/advisories/GHSA-f596-whhp-79r4) fixes.
- PostCSS 8.5.31 includes the
  [source-map file access fixes](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp).
- Tailwind 3 and `postcss-nested` use selector-parser 7.1.7 for
  [quadratic parsing](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).
  The parser major changes insertion-during-iteration behavior; the entire
  project's generated CSS was byte-identical before and after this override.
  Metro exports and browser startup were also checked. This does not prove
  compatibility for every future Tailwind plugin.
- `@expo/ngrok` and `gaxios` use UUID 11.1.1 for the
  [buffer bounds fix](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
  Their inspected call sites use the unchanged CommonJS `v4()` API. Module
  loading and a real local gaxios multipart request passed. An external ngrok
  tunnel connection was not exercised.

Normal `npm ci` and `npm ls --all` validate the lockfile and peer relationships.
Recheck overrides when updating upstream packages; remove them when upstream
resolutions include the patches. npm 10 retained stale nested resolutions during
incremental installs: inspect the lockfile and actual tree, not just override text.

## Still open

| Path | Severity / advisory | Assessment and follow-up |
| --- | --- | --- |
| Expo → CLI / signing → `node-forge` 1.4.0 | High: [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Latest forge is affected. Used by development/signing tooling; not imported by application code. Track an upstream fix and validate signing when it lands. |
| Expo → CLI → Zod 3.25.76 | High: [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | The published fix is in Zod 4.6.6+. Expo's CLI consumes Zod 3. Do not force the incompatible major into the CLI. Treat externally supplied CLI/config inputs as untrusted; update once Expo adopts a compatible fix. |
| Firebase CLI → Pub/Sub → OpenTelemetry Core 1.30.1 | Moderate: [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) | Patch is in Core 2.8+. This is CLI telemetry, not the Firebase mobile SDK. The app's emulator workflow does not exercise cloud Pub/Sub baggage propagation. Keep upstream tracking open rather than forcing the Core major. |

Scope statements above follow the installed tree and inspected call sites.
They are not a complete exploitability assessment of every CLI command.
`npm audit fix --force` currently proposes framework/CLI downgrades and is not
an appropriate remediation strategy.

## Application privacy remains separate

The authorization regressions in `tests/security.rules.test.cjs` execute two
passing denial checks and **three known failing TODO tests**: a stranger can
self-grant friendship and read location, a chat member can rewrite its creator,
and a gathering invitee can rewrite its creator. The existing 17 positive/negative
rules checks also pass, demonstrating why those earlier checks alone were insufficient.

The selected maintenance scope did not change application security rules or
location-tracking behavior. Fix these privacy findings before distributing to
real users; also review the location/privacy findings in the workspace README.
CI emits an explicit warning and does not count the TODOs as passing guarantees.
