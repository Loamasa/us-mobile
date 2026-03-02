# Prototype Map

> UI/UX reference for the us-mobile production app.
> This prototype is a **complete feature-complete frontend** with mock data — not all features are in the MVP.
> To use: find the relevant file below, then read it from `.context/prototype/`.

---

## Core / App Shell

| File | Purpose |
|------|---------|
| `constants.ts` | Legacy mock data: CURRENT_USER, MOCK_FRIENDS (10), MOCK_CHATS (15), MOCK_COMMUNITIES (3 LOCAL), MOCK_EVENTS (3), MOCK_MAP_NODES; all centered around Malmö |
| `src/App.tsx` | Root shell: 3-tab layout (MAP/CHATS/COMMUNITIES), bottom NavButton nav, global modals, tutorial overlay chain, ghost mode toggle, custom event listeners for cross-feature navigation |
| `src/index.tsx` | React entry point (createRoot + StrictMode) |
| `src/types.ts` | All TypeScript types: User, UserSettings, UserSpot, UserSignal, Channel, PrivateGroup, Community, CommunitySpot, Message (reactions/replies/attachments), ChatSummary, Event (recurrence/visibility), MapEntity, LocationPresence, SubscriptionTier/Plan, CommunitySupporter |
| `src/utils/featureFlags.ts` | 4 boolean flags: USER_SUBSCRIPTIONS, SERVER_SUPPORT, ANIMATED_AVATARS, GATED_UPLOADS |

## UI Components

| File | Purpose |
|------|---------|
| `src/components/UserAvatar.tsx` | Avatar with size variants (xs-xxl), premium gradient border, tier ring (blue=BASIC, gradient=PREMIUM), online/away/offline status dot |
| `src/components/ui/GlassCard.tsx` | Glass-morphism card: rounded-xl, border-glassBorder, bg-glass, backdrop-blur-md, optional onClick |
| `src/components/ui/NavButton.tsx` | Bottom nav tab: active=signal-blue with scale+glow, inactive=gray-500 |
| `src/components/ui/TutorialOverlay.tsx` | Full-screen tutorial modal: dimmed backdrop, glass card, icon/title/message/action, color themes (mint/purple/orange/rose/signal), directional arrows, position anchoring |

## Context / State

| File | Purpose |
|------|---------|
| `src/context/DataContext.tsx` | Central state: all app data + ~40 CRUD methods for chats, messages, events, communities, channels, spots, groups, invites, user profile, signals, friends; simulates location presence on 10s interval |
| `src/context/MonetizationContext.tsx` | Subscription tier (FREE/BASIC/PREMIUM), per-server supporters, allocation slots; persists to localStorage |
| `src/context/TutorialContext.tsx` | Tutorial chain: tracks active tutorial, persists seen-state to localStorage, enable/disable/reset |

## Mock Data

| File | Purpose |
|------|---------|
| `src/data/chats.ts` | 16 ChatSummary entries: group chats with mapVisibility+fixedLocation, DMs, GATHERING types (Chess Club, Kitchen Table) |
| `src/data/communities.ts` | 4 TOPIC communities (Underground/Rave/Analog/Street) + 6 LOCAL communities (Malmö Ravers/Community House/Urban Explorers/Folkets Park Gardeners/Analog Club/Concrete Surfers); each with channels, spots, memberIds, topicIds |
| `src/data/map.ts` | Static map nodes: FRIEND pins, GROUP cluster at Möllevångstorget, 3 GATHERING nodes (Harbor Bunker, Community House, Basement Exit with private group gating) |
| `src/data/userPool.ts` | 65 procedural strangers across 5 persona categories (RAVER/TECHIE/EXPLORER/LOCAL/GARDENER) + USER_POOL combining all users |
| `src/data/users.ts` | CURRENT_USER (Alex Chen, PREMIUM, 4 spots, 5 privateGroups), 12 MOCK_FRIENDS, 2 MOCK_STRANGERS, 1 pending friend request, 5 suggested friends |

---

## Feature: Auth

| File | Purpose |
|------|---------|
| `src/features/auth/AuthFlow.tsx` | 4-step wizard: phone input → OTP (4-digit) → profile setup (name/handle/avatar) → location permission; glass card inputs, ambient gradient backgrounds |

## Feature: Onboarding

| File | Purpose |
|------|---------|
| `src/features/onboarding/Onboarding.tsx` | 5-slide carousel: anti-ad pitch, local culture, community events, live map, nonprofit/ghost-mode trust; color-coded accents (rose/purple/orange/signal/mint), step dots |

## Feature: Map

| File | Purpose |
|------|---------|
| `src/features/map/MapVisualizer.tsx` | Leaflet dark map, 3 modes (FULL/EMBEDDED/PERSONAL_SPOT_CREATION); renders community spots (dashed circles), user spots (emoji icons), friend/group/gathering/event markers, "me" marker, ghost mode toggle, signal broadcast button, clock widget, visibility HUD |
| `src/features/map/utils.ts` | Icon generators for FRIEND/GROUP/GATHERING/EVENT nodes, popup HTML with action buttons (join chat, create group, view event, start DM via CustomEvent), Haversine distance calc |
| `src/features/map/components/ActiveSignalHUD.tsx` | Floating pill: active signal emoji+text+countdown timer, X to clear |
| `src/features/map/components/SignalModal.tsx` | Broadcast modal: emoji picker, custom text (30 chars), duration (1h/4h/until tonight), audience (all friends/close friends/select communities), 9 activity presets (beer, studying, fika, etc.) |

## Feature: Chat

| File | Purpose |
|------|---------|
| `src/features/chat/ChatList.tsx` | Sidebar: Messages/Events toggle, search, friend requests, chat list with presence hierarchy (cluster>gathering>spot); internal nav for new message, create group, add friend (search USER_POOL) |
| `src/features/chat/ChatDetail.tsx` | Main chat view: ChatHeader + message list + typing indicator + ChatInput; reply-to, edit, reactions, blocked-user state; ChatProfileSidebar as portal overlay (mobile) or 320px panel (desktop) |
| `src/features/chat/ChatHeader.tsx` | Polymorphic header: DMHeader (avatar, presence pill with location), GroupHeader (facepile, editable name, cluster/gathering/spot status), ChannelHeader (hash icon), GatheringHeader (live pulse, friend/stranger facepile, map pill) |
| `src/features/chat/components/ChatInput.tsx` | Composer: auto-resize textarea, emoji picker (20 emojis), media attachment (photo/video/voice with size limits), reply/edit banners, upload limit enforcement via subscription tier |
| `src/features/chat/components/ChatProfileSidebar.tsx` | Member profile: avatar, handle, bio, mutual friends, close friend toggle, friend categories, shared media, notification settings, archive/block/delete. Group profile: member list, map visibility (ALWAYS/ASK/NEVER), leave/archive |
| `src/features/chat/components/MessageBubble.tsx` | Message: sent/received bubbles, avatar, premium gradient name, reply context, image/video attachments, edit indicator, timestamps, delivery status (sent/delivered/read), grouped emoji reactions, hover action bar (react/reply/edit/copy/delete) |
| `src/features/chat/components/SharedMediaGallery.tsx` | Shared media: 4-thumbnail preview widget + full overlay with ALL/MEDIA/AUDIO tabs, 3-column grid, lightbox |
| `src/features/chat/hooks/useChatMessages.ts` | Hook: messages for a chat, isTyping simulation, sendMessage/addReaction/deleteMessage/editMessage passthrough |
| `src/features/chat/utils.ts` | `getChatMembers` and `getSenderDetails`: resolve user IDs from USER_POOL/MOCK_FRIENDS with fallback avatar generation |
| `src/features/chat/index.ts` | Barrel re-export: ChatList, ChatDetail, ChatProfileSidebar |

## Feature: Community

| File | Purpose |
|------|---------|
| `src/features/community/CommunityInterface.tsx` | Top-level orchestrator: CommunityRail + CommunitySidebar + CommunityMainArea inside CommunityProvider; manages all modal visibility, tutorial triggers, join-via-link, toast notifications |
| `src/features/community/components/CommunityRail.tsx` | 72px vertical icon rail (Discord-style): local=rounded squares, topic=circles with mint ring, boost glow (golden ring), selection indicator, Add/Discover buttons |
| `src/features/community/components/CommunitySidebar.tsx` | Routes to LocalCommunitySidebar or TopicCommunitySidebar based on community.type |
| `src/features/community/components/CommunityMainArea.tsx` | Right pane: ChatDetail for channels/gatherings, EventView for events, or empty-state placeholder |
| `src/features/community/components/CommunityMobileList.tsx` | Mobile-only: "Local Communities" (squircle cards) + "Cultures" (circular mint cards) + Add/Discover buttons |
| `src/features/community/components/EventView.tsx` | Event detail: cover hero, RSVP/cancel/edit/delete, date/location metadata, embedded map, linked spot, attendee grid, cancel-with-reason modal, inline edit |

### Community Sidebar Views

| File | Purpose |
|------|---------|
| `src/features/community/components/sidebar/LocalCommunitySidebar.tsx` | LOCAL sidebar: Channels/Events/Private tab bar → ChannelListView, EventListView, or PrivateGroupListView |
| `src/features/community/components/sidebar/TopicCommunitySidebar.tsx` | TOPIC sidebar: Happenings/Local Communities tab bar → HappeningsView or LocalCommunitiesView |
| `src/features/community/components/sidebar/SidebarHeader.tsx` | Header: community icon/name/type badge, boost header, topic tags, dropdown menu (invite/settings/create channel/event), tab bar |
| `src/features/community/components/sidebar/ChannelRow.tsx` | Channel row: contextual icon (hash/mic/megaphone etc.), active glow, inline rename, notification toggle, delete; "Live Gatherings" pulsing flame |
| `src/features/community/components/sidebar/views/ChannelListView.tsx` | Channels grouped by category, collapsible headers, "Live Gatherings" pinned top, respects hideMutedChannels |
| `src/features/community/components/sidebar/views/EventListView.tsx` | Upcoming events: date badge, name, location (spot name in mint), attending dot, "Create Event" button |
| `src/features/community/components/sidebar/views/GatheringListView.tsx` | "Live Now" active gatherings + "Buzz" blurred/locked unjoined gatherings with join overlay |
| `src/features/community/components/sidebar/views/HappeningsView.tsx` | TOPIC combined feed: Live Now + Buzz gatherings + Upcoming Events |
| `src/features/community/components/sidebar/views/LocalCommunitiesView.tsx` | Connected local communities: icon, name, city, member count, Joined/Join button |
| `src/features/community/components/sidebar/views/PrivateGroupListView.tsx` | Private groups: selectable cards with rename/delete, group channels via ChannelRow, private gatherings section |

### Community Modals

| File | Purpose |
|------|---------|
| `src/features/community/components/modals/CreateCommunityModal.tsx` | 4-step wizard: Create/Join → LOCAL/TOPIC type → name/description/city/icon → starter channels toggle |
| `src/features/community/components/modals/CreateChannelModal.tsx` | Text/voice type toggle, kebab-cased name, category selector |
| `src/features/community/components/modals/CreateCategoryModal.tsx` | Single uppercase text input for category name |
| `src/features/community/components/modals/CreateEventModal.tsx` | Event form: name, description, cover image, date/time, privacy (PUBLIC/COMMUNITY_ONLY/INVITE_ONLY), recurrence, location (text or community spot) |
| `src/features/community/components/modals/CreateSpotModal.tsx` | Split-pane: sidebar form + interactive map; name, emoji icon (boost-gated), visibility (COMMUNITY/PRIVATE), private group, live threshold (1-100), radius (50-2000m), draggable marker |
| `src/features/community/components/modals/DiscoveryModal.tsx` | Explore overlay: search, topic grid → drill into local communities by topicIds; TOPIC=mint/circular, LOCAL=blue/square |
| `src/features/community/components/modals/InvitePeopleModal.tsx` | Invite link: `us.app/join/{code}`, copy/share, expiration (30min-never), max uses (1-100/unlimited), regenerate |
| `src/features/community/components/modals/ServerSettingsModal.tsx` | Settings panel: sidebar nav (Overview/Visibility/Channels/Members/Roles/Notifications/Treasury) → delegates to LocalSettingsView or TopicSettingsView |
| `src/features/community/components/modals/settings/LocalSettingsView.tsx` | LOCAL settings: Overview (name/desc/icon/city+map), Visibility (PUBLIC/LINK_ONLY/PRIVATE), Channels (drag-reorder/rename/delete), Roles (OWNER/ADMIN/MOD/MEMBER permissions), Notifications (ALL/MENTIONS/MUTED), Members (search/kick/ban/promote) |
| `src/features/community/components/modals/settings/TopicSettingsView.tsx` | TOPIC settings: Overview, Visibility (PUBLIC/LINK_ONLY), Connected Locals (pin/blacklist), Aggregation (verified-only, auto-feature, min-attendees), Notifications (Push All/Vetted Pulse), Members |

### Community State

| File | Purpose |
|------|---------|
| `src/features/community/context/CommunityContext.tsx` | Pure passthrough context: passes community state + action callbacks from orchestrator to deeply nested children |
| `src/features/community/hooks/useCommunityLogic.ts` | Central state: community/channel/event/group selection, view mode (OPEN/EVENTS/GATHERINGS/PRIVATE/HAPPENINGS/LOCAL_COMMUNITIES), data aggregation (MapEntity indexing, joined vs buzz, gathering filtering, synthetic channels), deep linking, CRUD delegation |

## Feature: Events

| File | Purpose |
|------|---------|
| `src/features/events/components/RecommendedEventsDashboard.tsx` | Events hub: Highlights/Going/Hosting tabs; spotlight hero card + recommended grid; Going/Hosting filtered lists with RSVP/delete |
| `src/features/events/hooks/useEventSystem.ts` | Event lifecycle: createEvent (auto-id), toggleRsvp, derives eventMapNodes (for map) and myEvents (attending/upcoming) |

## Feature: Monetization

| File | Purpose |
|------|---------|
| `src/features/monetization/components/UpgradeModal.tsx` | 3-tier pricing cards: FREE/BASIC/PREMIUM with feature checklists; PREMIUM highlighted as "Best Value" with signal-blue gradient |
| `src/features/monetization/components/SubscriptionSettings.tsx` | Settings page: current plan/billing, upgrade CTA, AllocationSelector, upload/profile limits, payment stub (card 4242) |
| `src/features/monetization/components/AllocationSelector.tsx` | Slot grid: assign subscription-funded slots to local communities; filled=icon+name+remove, empty=add button + selection modal |
| `src/features/monetization/components/ServerSupportModal.tsx` | Direct support modal: $2.99/mo, perks (Supporter Badge, Priority Access), confirm/cancel |
| `src/features/monetization/components/ServerSupportHeader.tsx` | Compact widget: BoostStatusBadge + heart toggle with supporter count |
| `src/features/monetization/components/BoostStatusBadge.tsx` | Badge: gold "Boosted" pill if threshold met, else progress bar (e.g. "2/3") |
| `src/features/monetization/components/CommunityTreasury.tsx` | Admin dashboard: balance, revenue, allocated slots, supporters, transaction history table, top supporters, withdraw/fund-event modals |
| `src/features/monetization/data/mockData.ts` | Plans: Standard ($0), Supporter ($4.99), Visionary ($9.99) with limits (maxUploadSize, maxServers, customBadges, animatedAvatars); MOCK_SERVER_SUPPORTERS |
| `src/features/monetization/hooks/useSubscription.ts` | Subscription state + actions: tier, upgrade, cancel, checkTier, isPremium, canUpload, hasCustomBadges |
| `src/features/monetization/hooks/useCommunityAllocation.ts` | Slot logic: PREMIUM=4, BASIC=2, FREE=0 slots at $2.00/mo each; assignSlot/removeSlot |
| `src/features/monetization/hooks/useServerBoost.ts` | Boost check: supporter count vs BOOST_THRESHOLD (3) → isBoosted boolean |
| `src/features/monetization/hooks/useServerSupport.ts` | Per-community support: isSupporting, supporterCount, support/unsupport/toggle |

## Feature: Settings

| File | Purpose |
|------|---------|
| `src/features/settings/UserSettingsModal.tsx` | 9-tab settings: Account, Subscription, Privacy, Notifications, Accessibility, Language (6 languages), Blocked Users, Help/FAQ (accordion), Debug; profile editing, tutorial reset, ManagePlaces integration, delete/logout |
| `src/features/settings/ManagePlacesModal.tsx` | Split-pane: sidebar list + map; LIST/CREATE/EDIT modes; name, emoji icon grid (15 icons), MapVisualizer in PERSONAL_SPOT_CREATION mode with draggable marker + radius slider (50-1000m) |

## Feature: Tutorial

| File | Purpose |
|------|---------|
| `src/features/tutorial/tutorialData.tsx` | 7 tutorial definitions: welcome_map, nav_communities, nav_chats, ghost_mode, community_discovery, community_types, events_intro, add_friend; each with icon, color theme, alignment position, arrow direction |

## Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useMapProjection.ts` | Transforms raw data → MapEntity[]: GROUP clusters from GROUP_MEMBER_IDS, GATHERING nodes from community spots (with private group gating + minPeople threshold), FRIEND pins at personal spots, EVENT pins from geoLocations; deduplicates via processedUserIds |
