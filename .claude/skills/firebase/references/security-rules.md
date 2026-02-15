# Firestore Security Rules

## Base Pattern

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuth() { return request.auth != null; }
    function isOwner(uid) { return request.auth.uid == uid; }
    function isValidString(field, max) {
      return field is string && field.size() > 0 && field.size() <= max;
    }

    // Users
    match /users/{uid} {
      allow read: if isAuth();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid);
      allow delete: if false;

      // Friends subcollection
      match /friends/{friendId} {
        allow read: if isOwner(uid) || isOwner(friendId);
        allow create: if isAuth() && (isOwner(uid) || isOwner(friendId));
        allow update: if isOwner(uid) || isOwner(friendId);
        allow delete: if isOwner(uid);
      }

      // Spots subcollection
      match /spots/{spotId} {
        allow read, write: if isOwner(uid);
      }
    }

    // Locations (top-level for geoqueries)
    match /locations/{userId} {
      allow read: if isAuth();  // friends check done client-side for perf
      allow write: if isOwner(userId);
    }

    // Handle uniqueness
    match /handles/{handle} {
      allow read: if true;  // anyone can check availability
      allow create: if isAuth() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;  // immutable
    }
  }
}
```

## Key Principles

- Deny by default, allow explicitly
- Use helper functions to reduce repetition
- Validate data shape in rules for public-facing writes
- Never trust client data without validation
- Use `resource.data` for current doc, `request.resource.data` for incoming
- Test rules with emulator: `firebase emulators:start`
