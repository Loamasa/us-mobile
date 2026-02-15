---
name: git-workflow
description: Git workflow conventions for this Expo/Firebase mobile project. Use when committing, branching, writing commit messages, or managing the Git workflow. Covers conventional commits, branch naming, .gitignore patterns for Expo/RN, and PR conventions.
---

# Git Workflow

## Conventional Commits

```
type(scope): short description

Optional body explaining why.
```

### Types

| Type       | When                                        |
|------------|---------------------------------------------|
| `feat`     | New feature                                 |
| `fix`      | Bug fix                                     |
| `refactor` | Code change that neither fixes nor adds     |
| `style`    | Formatting, NativeWind classes              |
| `docs`     | Documentation only                          |
| `chore`    | Dependencies, config, tooling               |
| `test`     | Adding or fixing tests                      |
| `perf`     | Performance improvement                     |

### Scopes (project-specific)

`auth`, `map`, `friends`, `signals`, `spots`, `ghost`, `profile`, `nav`, `firebase`, `config`

### Examples

```
feat(map): add friend marker clustering with 100m threshold
fix(auth): handle expired token on app resume
chore(deps): upgrade expo-location to 17.x
refactor(friends): extract useFirendList hook from FriendsScreen
```

## Branch Naming

```
type/short-description
```

Examples:
- `feat/friend-clustering`
- `fix/auth-token-refresh`
- `chore/upgrade-expo-54`

## Workflow

1. Branch from `main`
2. Make commits (conventional format)
3. Run `npx tsc --noEmit` before committing (must pass)
4. Push and open PR against `main`
5. Squash merge PRs

## .gitignore Essentials

These should already be ignored (verify if creating new patterns):

```
node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
.env.local
firebase-debug.log
firestore-debug.log
ui-debug.log
```

## Pre-Commit Checklist

1. `npx tsc --noEmit` passes
2. No `.env` or secrets staged
3. Commit message follows conventional format
4. Related changes in a single commit (not one commit per file)
