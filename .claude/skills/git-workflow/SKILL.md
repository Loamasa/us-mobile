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

`auth`, `map`, `chats`, `broadcasts`, `gatherings`, `friends`, `signals`, `spots`,
`ghost`, `profile`, `settings`, `onboarding`, `nav`, `firebase`, `rules`, `config`, `dev`

### Examples

```
feat(map): add friend marker clustering with 100m threshold
fix(rules): allow friendId == auth.uid writes for accept-request batch
docs(map): round-5 marker diagnosis — library-level Fabric bug
chore(deps): upgrade expo-location to 17.x
```

## Workflow (real flow — solo dev)

1. **Commit directly on `main`** when a milestone is done and verified —
   `npx tsc --noEmit` must pass first. Don't ask; don't batch unrelated work.
2. **Feature branch (`type/short-description`, e.g. `feat/phase1-map-ui`) only for
   multi-session work** that would leave `main` broken between sessions; fast-forward
   into `main` when done. No PRs, no squash merges.
3. Don't push unless asked.
4. Update STATUS.md before milestone commits (session protocol in CLAUDE.md).

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
