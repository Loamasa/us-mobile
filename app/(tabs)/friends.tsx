import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { auth } from '@/config/firebase';
import {
  onFriends,
  onFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getUserProfile,
} from '@/lib/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Friend, FriendRequest, UserProfile } from '@/types';
import GlassCard from '@/components/ui/GlassCard';
import UserAvatar from '@/components/UserAvatar';
import { SearchIcon, UserPlusIcon, UsersIcon } from '@/components/ui/icons';
import { COLORS } from '@/config/constants';

type FriendWithProfile = Friend & { profile?: UserProfile };
type RequestWithProfile = FriendRequest & { fromProfile?: UserProfile };

export default function FriendsScreen() {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [handleInput, setHandleInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const userId = auth.currentUser?.uid;

  // Load friends with profiles
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onFriends(userId, async (friendList) => {
      const withProfiles = await Promise.all(
        friendList.map(async (f) => {
          try {
            const profile = await getUserProfile(f.userId);
            return { ...f, profile: profile ?? undefined };
          } catch {
            return { ...f, profile: undefined };
          }
        })
      );
      setFriends(withProfiles);
    });

    return unsubscribe;
  }, [userId]);

  // Load friend requests with sender profiles
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onFriendRequests(userId, async (reqList) => {
      const withProfiles = await Promise.all(
        reqList.map(async (r) => {
          try {
            const profile = await getUserProfile(r.fromUserId);
            return { ...r, fromProfile: profile ?? undefined };
          } catch {
            return { ...r, fromProfile: undefined };
          }
        })
      );
      setRequests(withProfiles);
    });

    return unsubscribe;
  }, [userId]);

  const handleAddFriend = async () => {
    if (!userId || !handleInput.trim()) return;

    const sanitized = handleInput.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/^@/, '');
    setAddLoading(true);
    setAddError('');

    try {
      const handleDoc = await getDoc(doc(db, 'handles', sanitized));
      if (!handleDoc.exists()) {
        setAddError('User not found');
        return;
      }

      const targetUserId = handleDoc.data().userId;
      if (targetUserId === userId) {
        setAddError("That's you!");
        return;
      }

      await sendFriendRequest(userId, targetUserId);
      setShowAddModal(false);
      setHandleInput('');
      Alert.alert('Request Sent', `Friend request sent to @${sanitized}`);
    } catch (err: any) {
      setAddError(err.message ?? 'Failed to send request');
    } finally {
      setAddLoading(false);
    }
  };

  const handleAccept = async (request: FriendRequest) => {
    if (!userId) return;
    await acceptFriendRequest(userId, request.id, request.fromUserId);
  };

  const handleReject = async (request: FriendRequest) => {
    if (!userId) return;
    await rejectFriendRequest(userId, request.id);
  };

  const filteredFriends = searchQuery.trim()
    ? friends.filter((f) => {
      const q = searchQuery.toLowerCase();
      return (
        f.profile?.displayName?.toLowerCase().includes(q) ||
        f.profile?.handle?.toLowerCase().includes(q)
      );
    })
    : friends;

  return (
    <View className="flex-1 bg-void pt-16 px-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-5 px-1">
        <Text className="text-fog text-2xl font-bold">Friends</Text>
        <TouchableOpacity
          style={{
            backgroundColor: COLORS.signal,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
          onPress={() => setShowAddModal(true)}
        >
          <UserPlusIcon size={15} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginBottom: 16,
          gap: 10,
        }}
      >
        <SearchIcon size={16} color="#6B7280" />
        <TextInput
          style={{ flex: 1, color: '#F2F4F6', fontSize: 15 }}
          placeholder="Search by name or handle…"
          placeholderTextColor="rgba(242,244,246,0.3)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Friend Requests */}
      {requests.length > 0 && (
        <View className="mb-6">
          <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-1">
            Pending ({requests.length})
          </Text>
          {requests.map((req) => (
            <GlassCard key={req.id} className="mb-2 flex-row items-center">
              <UserAvatar
                displayName={req.fromProfile?.displayName}
                size="md"
                showStatus
                status="online"
              />
              <View className="flex-1 ml-3">
                <Text className="text-fog font-semibold">
                  {req.fromProfile?.displayName ?? 'Unknown'}
                </Text>
                <Text className="text-fog/50 text-xs">
                  @{req.fromProfile?.handle ?? '…'}
                </Text>
              </View>
              <TouchableOpacity
                className="bg-mint/20 rounded-lg px-3 py-2 mr-2"
                onPress={() => handleAccept(req)}
              >
                <Text className="text-mint text-xs font-semibold">Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-glass border border-glass-border rounded-lg px-3 py-2"
                onPress={() => handleReject(req)}
              >
                <Text className="text-fog/50 text-xs">Ignore</Text>
              </TouchableOpacity>
            </GlassCard>
          ))}
        </View>
      )}

      {/* Friends List */}
      <Text className="text-fog/50 text-xs uppercase tracking-widest mb-3 px-1">
        {searchQuery ? `Results (${filteredFriends.length})` : `Friends (${friends.length})`}
      </Text>

      {filteredFriends.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <UsersIcon size={48} color="rgba(242,244,246,0.15)" />
          <Text className="text-fog/40 text-base text-center mt-4">
            {searchQuery ? 'No matches found' : 'No friends yet'}
          </Text>
          <Text className="text-fog/25 text-sm text-center mt-1">
            {searchQuery ? 'Try a different search' : 'Add friends by their handle'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.userId}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <GlassCard className="mb-2 flex-row items-center">
              <UserAvatar
                displayName={item.profile?.displayName}
                size="md"
                showStatus
                status="online"
              />
              <View className="flex-1 ml-3">
                <Text className="text-fog font-semibold">
                  {item.profile?.displayName ?? 'Loading…'}
                </Text>
                <Text className="text-fog/50 text-xs">
                  @{item.profile?.handle ?? '…'}
                </Text>
              </View>
              {/* Online dot */}
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: COLORS.mint,
                }}
              />
            </GlassCard>
          )}
        />
      )}

      {/* Add Friend Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 justify-end">
          <View className="bg-void border-t border-glass-border rounded-t-3xl p-6">
            <Text className="text-fog text-xl font-bold mb-1">Add Friend</Text>
            <Text className="text-fog/40 text-sm mb-5">Search by their handle</Text>

            <View className="bg-glass border border-glass-border rounded-2xl px-4 py-4 flex-row items-center mb-4">
              <Text className="text-fog/50 text-lg mr-1">@</Text>
              <TextInput
                className="flex-1 text-fog text-lg"
                placeholder="theirhandle"
                placeholderTextColor="rgba(242, 244, 246, 0.3)"
                value={handleInput}
                onChangeText={setHandleInput}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            {addError ? (
              <Text className="text-red-400 text-sm text-center mb-4">{addError}</Text>
            ) : null}

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-2xl py-4 items-center border border-glass-border"
                onPress={() => {
                  setShowAddModal(false);
                  setHandleInput('');
                  setAddError('');
                }}
              >
                <Text className="text-fog/50 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-2xl py-4 items-center ${addLoading ? 'bg-signal/50' : 'bg-signal'}`}
                onPress={handleAddFriend}
                disabled={addLoading}
              >
                <Text className="text-fog font-semibold">
                  {addLoading ? 'Sending…' : 'Send Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
