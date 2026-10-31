import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getOrCreateDmChat,
  leaveGroupChat,
  removeFriend,
} from '@/lib/firestore';
import UserAvatar from '@/components/UserAvatar';
import {
  XIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  LogOutIcon,
  UserIcon,
} from '@/components/ui/icons';
import { COLORS } from '@/config/constants';
import type { ChatSummary, LocationPresence, UserProfile } from '@/types';

// RNW's Alert.alert is a NO-OP — a destructive action confirmed via Alert
// silently does nothing on web. Browser builds fall back to window.confirm.
function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

interface ChatInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  chat: ChatSummary;
  viewerId: string;
  // Profiles of every chat member (already subscribed by the chat screen).
  members: Record<string, UserProfile>;
  // The viewer's friend ids — gates the Remove Friend action.
  friendIds: Set<string>;
  // Friend-universe presence (spot names + on-map dots).
  presence: Record<string, LocationPresence>;
  // The code two people compare to confirm their chat is really private.
  safetyCodeFor: (id: string) => string | null;
}

/**
 * Tap-the-header info sheet for a chat. GROUP: member list (tap a member for
 * their profile) + Leave Group. DM: the peer's profile + Remove Friend.
 */
export default function ChatInfoSheet({
  visible,
  onClose,
  chat,
  viewerId,
  members,
  friendIds,
  presence,
  safetyCodeFor,
}: ChatInfoSheetProps) {
  const router = useRouter();
  // GROUP root shows the member list; drilling into a member sets profileId.
  const [profileId, setProfileId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const peerId = useMemo(
    () =>
      chat.type === 'DM'
        ? (chat.memberIds.find((id) => id !== viewerId) ?? null)
        : null,
    [chat, viewerId]
  );

  // DMs derive the profile at render (no effect) — state-based syncing paints
  // the group root (with a Leave button!) for the first frame of a DM sheet.
  const activeProfileId = chat.type === 'DM' ? (peerId ?? '') : profileId;

  // Reset the group drill-in whenever the sheet reopens.
  useEffect(() => {
    if (visible) setProfileId(null);
  }, [visible]);

  const handleLeaveGroup = useCallback(() => {
    confirmDestructive(
      'Leave group?',
      `You'll stop seeing messages from “${chat.name ?? 'this group'}”. The group keeps its history.`,
      'Leave',
      () => {
        // Navigate first — losing membership kills this screen's own
        // listeners, and we don't want the "no access" flash. Deep-linked
        // entry has no back stack — land on the chats tab instead.
        onClose();
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/chats');
        leaveGroupChat(chat.id, viewerId).catch((e) => {
          console.error('leaveGroupChat failed', e);
          Alert.alert(
            'Could not leave',
            e instanceof Error ? e.message : 'Try again.'
          );
        });
      }
    );
  }, [chat.id, chat.name, viewerId, onClose, router]);

  const handleRemoveFriend = useCallback(
    (id: string) => {
      const name = members[id]?.displayName ?? 'this person';
      confirmDestructive(
        'Remove friend?',
        `${name} won't be notified. You'll stop seeing each other on the map, and they can send a new request later.`,
        'Remove',
        async () => {
          setBusy(true);
          try {
            await removeFriend(viewerId, id);
            onClose();
          } catch (e) {
            console.error('removeFriend failed', e);
            Alert.alert(
              'Could not remove',
              e instanceof Error ? e.message : 'Try again.'
            );
          } finally {
            setBusy(false);
          }
        }
      );
    },
    [members, viewerId, onClose]
  );

  const handleMessage = useCallback(
    async (id: string) => {
      if (busy) return;
      setBusy(true);
      // Close BEFORE navigating — a state update queued after router.push
      // lands on a backgrounded screen and the modal never dismisses.
      onClose();
      try {
        const chatId = await getOrCreateDmChat({ viewerId, peerId: id });
        router.push(`/chat/${chatId}`);
      } catch (e) {
        Alert.alert(
          'Could not open chat',
          e instanceof Error ? e.message : 'Try again.'
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, viewerId, onClose, router]
  );

  // `presence` is the FRESH-filtered friend universe (the chat screen strips
  // frozen docs before passing it) — existence here really means live.
  const presenceLine = (id: string): { label: string; live: boolean } => {
    const loc = presence[id];
    if (!loc) return { label: 'Not on the map', live: false };
    if (loc.spot) return { label: `${loc.spot.emoji} At ${loc.spot.name}`, live: true };
    return { label: 'On the map', live: true };
  };

  const renderProfile = (id: string) => {
    const profile = members[id];
    const { label, live } = presenceLine(id);
    const isFriend = friendIds.has(id);
    const showMessage = chat.type === 'GROUP' && id !== viewerId;

    return (
      <View className="items-center pt-2">
        <UserAvatar displayName={profile?.displayName ?? '?'} size="lg" />
        <Text className="text-fog text-xl font-bold mt-3">
          {profile?.displayName ?? 'Unknown'}
        </Text>
        <Text className="text-fog/50 text-sm mt-0.5">
          @{profile?.handle ?? '…'}
        </Text>
        {profile?.bio ? (
          <Text className="text-fog/40 text-sm text-center mt-2 px-6">
            {profile.bio}
          </Text>
        ) : null}

        {/* Presence */}
        <View className="flex-row items-center mt-3" style={{ gap: 6 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: live ? COLORS.mint : 'rgba(242,244,246,0.25)',
            }}
          />
          <Text className="text-fog/50 text-xs">{label}</Text>
        </View>

        {/* Encryption check */}
        {id !== viewerId && safetyCodeFor(id) && (
          <View className="w-full bg-glass border border-glass-border rounded-2xl p-3.5 mt-5">
            <Text className="text-fog/50 text-xs uppercase tracking-widest mb-1.5">
              🔒 Safety code
            </Text>
            <Text className="text-fog text-base font-bold" selectable>
              {safetyCodeFor(id)}
            </Text>
            <Text className="text-fog/40 text-xs mt-1.5">
              If {profile?.displayName ?? 'they'} sees the same code, nobody can read
              your messages but the two of you.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View className="w-full mt-6" style={{ gap: 10 }}>
          {showMessage && (
            <TouchableOpacity
              onPress={() => handleMessage(id)}
              disabled={busy}
              activeOpacity={0.85}
              className="bg-signal rounded-2xl py-3.5 flex-row items-center justify-center"
              style={{ gap: 8, opacity: busy ? 0.6 : 1 }}
            >
              <MessageSquareIcon size={16} color={COLORS.fog} />
              <Text className="text-fog font-bold text-sm">Message</Text>
            </TouchableOpacity>
          )}
          {isFriend && id !== viewerId && (
            <TouchableOpacity
              onPress={() => handleRemoveFriend(id)}
              disabled={busy}
              activeOpacity={0.85}
              className="border border-rose/40 bg-rose/10 rounded-2xl py-3.5 items-center"
              style={{ opacity: busy ? 0.6 : 1 }}
            >
              <Text className="text-rose font-bold text-sm">Remove Friend</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderGroupRoot = () => (
    <>
      {/* Group identity */}
      <View className="items-center mb-4">
        <UserAvatar displayName={chat.name ?? 'Group'} size="lg" />
        <Text className="text-fog text-xl font-bold mt-3">
          {chat.name ?? 'Group'}
        </Text>
        <Text className="text-fog/50 text-xs mt-0.5">
          {chat.memberIds.length} members
        </Text>
      </View>

      {/* Member list */}
      <Text className="text-fog/50 text-xs uppercase tracking-widest mb-2 px-1">
        Members
      </Text>
      <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
        {chat.memberIds.map((id) => {
          const profile = members[id];
          const isSelf = id === viewerId;
          const { live } = presenceLine(id);
          return (
            <TouchableOpacity
              key={id}
              disabled={isSelf}
              onPress={() => setProfileId(id)}
              activeOpacity={0.7}
              className="flex-row items-center rounded-xl px-1.5 py-2.5"
            >
              <UserAvatar
                displayName={profile?.displayName ?? '?'}
                size="sm"
                showStatus
                status={live ? 'online' : 'offline'}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text className="text-fog text-sm font-semibold">
                  {profile?.displayName ?? 'Unknown'}
                  {isSelf ? '  (you)' : ''}
                </Text>
                <Text className="text-fog/45 text-xs">
                  @{profile?.handle ?? '…'}
                </Text>
              </View>
              {!isSelf && (
                <ChevronRightIcon size={16} color="rgba(242,244,246,0.3)" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Leave */}
      <TouchableOpacity
        onPress={handleLeaveGroup}
        activeOpacity={0.85}
        className="border border-rose/40 bg-rose/10 rounded-2xl py-3.5 flex-row items-center justify-center mt-4"
        style={{ gap: 8 }}
      >
        <LogOutIcon size={16} color={COLORS.rose} />
        <Text className="text-rose font-bold text-sm">Leave Group</Text>
      </TouchableOpacity>
    </>
  );

  const showingMemberProfile = chat.type === 'GROUP' && profileId !== null;

  return (
    // animationType none on web: RNW's slide-out waits for an animationend
    // event the preview browser never fires, so the closed modal lingers.
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      // Android back pops one level: member profile → member list → closed.
      onRequestClose={() =>
        showingMemberProfile ? setProfileId(null) : onClose()
      }
    >
      <View className="flex-1 justify-end">
        {/* Dim + tap-to-dismiss backdrop */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        />
        <View className="bg-void border-t border-glass-border rounded-t-3xl px-5 pt-4 pb-8">
          {/* Sheet header: back (member profile) / title / close */}
          <View className="flex-row items-center mb-4">
            {showingMemberProfile ? (
              <TouchableOpacity
                onPress={() => setProfileId(null)}
                hitSlop={10}
                style={{ padding: 2 }}
              >
                <ArrowLeftIcon size={18} color="rgba(242,244,246,0.6)" />
              </TouchableOpacity>
            ) : (
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <UserIcon size={16} color="rgba(242,244,246,0.5)" />
                <Text className="text-fog/50 text-xs uppercase tracking-widest">
                  {chat.type === 'DM' ? 'Profile' : 'Group Info'}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={onClose} hitSlop={10} style={{ padding: 2 }}>
              <XIcon size={18} color="rgba(242,244,246,0.5)" />
            </TouchableOpacity>
          </View>

          {activeProfileId !== null
            ? renderProfile(activeProfileId)
            : renderGroupRoot()}
        </View>
      </View>
    </Modal>
  );
}
