# Feature Wishlist

> Features WE want that are **not in the prototype**. This list is the product backlog beyond prototype parity — ideas land here first, get confirmed, then graduate into a phase checklist in `STATUS.md`.
>
> Status legend: **DRAFT** (wording not confirmed yet) · **CONFIRMED** (agreed, not scheduled) · **SCHEDULED** (has a phase) · **SHIPPED**

---

## 1. Group Broadcast — SHIPPED v1 (2026-06-11)

> v1 landed 2026-06-11 per the spec below: `broadcasts/{id}` collection (members+invitees-only
> rules, 5 new verifyRules checks), map long-press → composer (presets/TTL/invite picker, solo
> allowed), rose pins (solid member / dashed INVITE), card with roster + "here now" + countdown,
> accept/decline, deterministic group chat spawn (`chatId` stored). Seeded fixtures:
> `broadcast_tonight` (member) + `broadcast_invite` (invite). Deferred from v1: stricter
> field-level update rule (tracked in the Phase 3 ledger); community broadcasts (below).

**One-liner:** Upgrade the personal signal broadcast into a placeable, invite-based map event: pin a broadcast anywhere on the map, invite friends, invitees accept to join, the group sees who's in — and it can spawn a group chat, exactly like clusters do.

**Why:** Today a broadcast (signal) is a status on *you* — it rides on your pin and dies with the TTL. A Group Broadcast is a status on a *place + crew*: "🍺 at Möllevångstorget tonight, who's in?" That's the core social loop of the app (get people to actually meet up) and it's the stepping stone to community broadcasts later.

**How it works (user-facing):**
1. **Create on the map tab** — the user places the broadcast pin ANYWHERE on the map (long-press or placement mode), not just at their GPS position. Pick emoji + text (same presets as signals) + duration (same TTL options: 1h / 4h / Until Tonight).
2. **Invite friends** — a friend picker like the chat composer ("To:" chips). Invited friends get an invite (like a friend request): they must **accept** to become part of the broadcast. No silent adds.
3. **The broadcast pin** — renders on the map for the creator + invitees (pre-accept they see it as an invitation; nobody else sees it at all). Visually: a signal-rose cousin of the named-group cluster pin, with countdown.
4. **Who's in** — members (creator + accepted) see the roster on the pin's card: who accepted, and who is physically there (inside the broadcast radius). This presence is **group-only** — non-members never see the roster or that the broadcast exists.
5. **Spawn a group chat** — the broadcast card has the same "Open Group Chat" CTA as clusters; deterministic on the member set (reuses `getOrCreateGroupChat` semantics). If a chat is created, who's-there visibility stays restricted to that group.
6. **Expiry** — at TTL the pin disappears; the group chat (if created) survives as a normal chat.

**Future extension (explicitly out of scope for v1):** community broadcasts — the same mechanic but open to a community instead of a hand-picked friend list.

**Architecture sketch (builds on existing primitives, nothing exotic):**
- A broadcast is close to an ephemeral named group pin: `fixedLocation` + roster + TTL — `buildGroupPins` already renders exactly this shape (`mapVisibility: 'ALWAYS'` + `fixedLocation`).
- Invites mirror the `friendRequests` accept flow (PENDING → ACCEPTED), and the rules lesson from 2026-06-11 applies: every write must be authorized as the *caller* (inviter writes the invite, invitee writes their own acceptance) — extend `verifyRules.js`.
- Data model candidate: top-level `broadcasts/{broadcastId}` (creator, emoji/text, location GeoPoint, radius, expiresAt, `memberIds`, `invitedIds`) so members can query with `array-contains`, same as chats.
- "Who is physically there" = member location within broadcast radius — same Haversine containment as spots, computed client-side from data members can already read (friends-only locations).

**Confirmed decisions (2026-06-11):**
- Roster = *accepted members*; members physically inside the broadcast radius additionally get a "here now" marker. Both visible to members only.
- Friends only in v1 — no friend-of-friend invites.
- A broadcast with zero invitees **is** the personal signal: one mental model, the existing signal becomes the solo case of Group Broadcast.
