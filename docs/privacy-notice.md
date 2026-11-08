# us — Privacy Notice

> DRAFT for review. This is the hostable copy of the in-app notice
> (`app/settings/privacy-notice.tsx`) — keep the two in sync. Host this page
> (e.g. Firebase Hosting) before the Play listing; the same page can carry the
> account-deletion request flow Play requires.

_Last updated: 31 October 2026_

## Who is responsible

**us** is a nonprofit project run by Pål Schakonat, Malmö, Sweden.
Contact for anything in this notice: **pal.schakonat@gmail.com**.

## What we store

- **Account**: sign-in email, display name, unique handle, bio.
- **Spots**: the places you define. Your spots list is visible only to you.
- **Location**: see the next section — this is the one that matters.
- **Messages**: your chats and group chats.
- **Connections**: your friends and friend requests.
- **Gatherings**: pins you create or join, and who is invited.

## Location — the important part

- Your position is shared **only while you are inside one of your own active
  spots**, and **only with your friends**.
- In transit you are invisible — the location record is **deleted**, not
  hidden.
- **Ghost mode** turns all location sharing off instantly.
- Friends who can see you also see the **name of the spot** you are at.
- The app ignores a location record after **24 hours**, and deletes it the next time you open the app outside your spots, or sign out.

## Encryption

Messages, group names, your location, your spots, signals and gathering details
are **end-to-end encrypted**: they leave your phone encrypted and only the people
they are meant for can read them. We cannot read them, and neither can Google.
The encryption key stays on your phone, so if you uninstall the app or change
phone, old messages and spots **cannot be recovered**.

We can still see what the service needs to work: your display name, handle and
bio, who is friends and in which chat, and when things happen (not what was said).
The encryption has not been independently audited yet.

## Where it lives

Data is stored in **Google Firebase** (Google Cloud), acting as our
processor. Data may be processed in the United States under the **EU–US Data
Privacy Framework** and **Standard Contractual Clauses** (Google Cloud Data
Processing Terms).

If the app crashes, tester builds send a technical crash report (error and
device details — never your location or messages) to **Sentry**, our
error-monitoring processor.

We run **no ads, no tracking, no analytics profiles**, and we never sell
data.

## Your rights (GDPR)

You can request:

- a **copy** of your data (access / portability),
- **correction** of wrong data,
- **deletion** of your account and everything attached to it.

Email **pal.schakonat@gmail.com** — requests are handled within one month
(usually much faster at this stage). You may also lodge a complaint with the
Swedish Authority for Privacy Protection (**IMY**, [imy.se](https://imy.se)).

## Testing phase

This app is currently in a closed trusted-tester phase. Testers are adults
(18+) who received their account personally from the developer.
