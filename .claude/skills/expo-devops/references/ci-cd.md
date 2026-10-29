# Continuous integration

The authoritative workflow is `.github/workflows/checks.yml`. It uses the
versions in `.nvmrc` and `.java-version`, normal `npm ci`, type checking, tests
against production map functions, Expo alignment/Doctor, Android and web Metro
exports, and a temporary Firebase emulator run.

Dependency audit findings are reported without blocking development CI because
upstream tooling still has open advisories. Three negative authorization tests
execute as known failing TODOs and produce an explicit workflow warning. They
must become ordinary passing assertions when the privacy fixes land.

This workflow does not build a native APK or publish anything. EAS builds need
an authenticated, linked Expo project; use the committed development profile.
Never add a publishing/deployment step without the user’s authorization.
