---
name: expo-devops
description: DevOps workflows for this Expo + Firebase project. Use when setting up EAS Build, configuring Firebase emulators, managing environment variables, running CI/CD, deploying to app stores, managing OTA updates, or configuring testing infrastructure. Covers eas.json profiles, emulator setup, GitHub Actions, and versioning.
---

# Expo + Firebase DevOps

## Local Development

### Dev server

```bash
npx expo start --clear        # clear cache and start
npx expo start                 # normal start
```

### Firebase emulators

```bash
firebase emulators:start --project demo-us-app
```

Connect in app code:
```tsx
if (__DEV__) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

### Type checking

```bash
npx tsc --noEmit               # must pass before committing
```

### Dependencies

```bash
npm install --legacy-peer-deps  # always use this flag (React version conflicts)
```

## EAS Build

### eas.json profiles

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "env": { "FIREBASE_ENV": "emulator" }
    },
    "preview": {
      "distribution": "internal",
      "env": { "FIREBASE_ENV": "staging" }
    },
    "production": {
      "env": { "FIREBASE_ENV": "production" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "your@email.com", "ascAppId": "your-app-id" },
      "android": { "serviceAccountKeyPath": "./google-services-key.json" }
    }
  }
}
```

### Build commands

```bash
eas build --platform ios --profile development    # dev client
eas build --platform all --profile preview        # internal testing
eas build --platform all --profile production     # store release
```

### Submit to stores

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

## Environment Variables

### In app.config.ts

```tsx
export default ({ config }) => ({
  ...config,
  extra: {
    firebaseEnv: process.env.FIREBASE_ENV || 'emulator',
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
```

### Secrets (EAS)

```bash
eas secret:create --name FIREBASE_API_KEY --value "..." --scope project
eas secret:list
```

Never commit `.env` files. Use EAS secrets for CI builds.

## OTA Updates

```bash
eas update --branch production --message "Fix signal expiry check"
eas update --branch preview --message "Test new clustering"
```

Configure in app.config.ts:
```tsx
updates: {
  url: "https://u.expo.dev/your-project-id",
  fallbackToCacheTimeout: 0,
},
runtimeVersion: { policy: "appVersion" },
```

## App Versioning

- `version` in app.config.ts: user-facing (1.0.0, 1.1.0)
- `ios.buildNumber` / `android.versionCode`: auto-increment per build
- Bump version on feature releases, not patches
- EAS auto-increments build numbers with `autoIncrement: true`

## Testing

For testing strategies (Jest unit tests, component tests, E2E), see `references/testing.md`.

## CI/CD

For GitHub Actions workflows, see `references/ci-cd.md`.
