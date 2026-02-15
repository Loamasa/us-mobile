# CI/CD with GitHub Actions

## PR Check Workflow

```yaml
# .github/workflows/pr-check.yml
name: PR Check
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci --legacy-peer-deps
      - run: npx tsc --noEmit
      - run: npx jest --ci --coverage
```

## EAS Build on Push to Main

```yaml
# .github/workflows/eas-build.yml
name: EAS Build
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci --legacy-peer-deps
      - run: eas build --platform all --profile preview --non-interactive
```

## OTA Update on Tag

```yaml
# .github/workflows/ota-update.yml
name: OTA Update
on:
  push:
    tags: ['v*']

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci --legacy-peer-deps
      - run: eas update --branch production --message "${{ github.ref_name }}" --non-interactive
```

## Required Secrets

Set in GitHub repo Settings > Secrets:
- `EXPO_TOKEN` -- from expo.dev account settings
- Firebase secrets managed via EAS secrets (not GitHub)
