# us-mobile

us is a location-based social app for meeting friends in person. It supports selective location sharing, map gatherings, and direct and group chats. The mobile app uses Expo, React Native and Firebase.

## Development

See [Development setup](docs/development-setup.md) for prerequisites, browser and Firebase emulator startup, Android development, and available checks. On Windows, `Dev-Terminal.cmd` selects the documented Node and Java installations when they are present.

The browser map uses a substitute, so browser checks do not verify native map rendering or location permissions.

## Changes on this branch

- Upgraded Expo SDK 54 to 58, React Native 0.81.5 to 0.88.1, and React Native Maps 1.20.1 to 1.29.11, along with related dependencies.
- Added a documented development setup, recorded Node and Java versions, and a Windows toolchain launcher.
- Added regression tests for map projection, group pins and Metro proxy errors, plus Firebase SDK and authorization checks.
- Added a GitHub Actions workflow for development checks.
- Configured an Android development client and an internal APK build profile.
- Documented dependency advisories and known privacy issues.

## Current limitations

- The upgraded native Android app has not yet been built as an APK or tested on a phone.
- The GitHub Actions workflow has not yet been verified in a hosted run.
- Three authorization tests document known privacy defects as failing TODOs. A completed development check does not mean those defects are fixed.
- Dependency advisories remain; see the dated [dependency audit](docs/dependency-audit.md) and run `npm audit` for the current report.
