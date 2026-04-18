import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import {
  onChatSummary,
  onMessages,
  onUserProfile,
  sendMessage,
} from '@/lib/firestore';
import UserAvatar from '@/components/UserAvatar';
import { COLORS } from '@/config/constants';
import type { ChatSummary, Message, UserProfile } from '@/types';

export default function ChatDetailScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );
  const [chat, setChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Record<string, UserProfile>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
  }, []);

  useEffect(() => {
    if (!chatId) return;
    return onChatSummary(chatId, (c) => {
      setChat(c);
      setLoaded(true);
    });
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    return onMessages(chatId, setMessages);
  }, [chatId]);

  // Subscribe to each member's profile for name + avatar resolution.
  useEffect(() => {
    if (!chat?.memberIds?.length) {
      setMembers({});
      return;
    }
    const unsubs = chat.memberIds.map((id) =>
      onUserProfile(id, (profile) => {
        setMembers((prev) => {
          if (!profile) return prev;
          return { ...prev, [id]: profile };
        });
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [chat?.memberIds]);

  const otherMemberCount = useMemo(() => {
    if (!chat || !userId) return 0;
    return chat.memberIds.filter((id) => id !== userId).length;
  }, [chat, userId]);

  const handleSend = useCallback(async () => {
    if (!chatId || !userId) return;
    const content = input.trim();
    if (!content) return;
    setSending(true);
    try {
      await sendMessage(chatId, userId, content);
      setInput('');
    } catch (e: unknown) {
      console.error('sendMessage failed', e);
      Alert.alert(
        'Could not send',
        e instanceof Error ? e.message : 'Check emulator connection.'
      );
    } finally {
      setSending(false);
    }
  }, [chatId, userId, input]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.senderId === userId;
      const sender = members[item.senderId];
      const displayName = sender?.displayName ?? '…';

      return (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: isMine ? 'flex-end' : 'flex-start',
            marginBottom: 10,
            paddingHorizontal: 12,
          }}
        >
          {!isMine && (
            <View style={{ marginRight: 8, marginTop: 2 }}>
              <UserAvatar
                displayName={displayName}
                size="sm"
                tint="signal"
              />
            </View>
          )}
          <View style={{ maxWidth: '75%' }}>
            {!isMine && chat?.type === 'GROUP' && (
              <Text
                style={{
                  color: COLORS.signal,
                  fontSize: 11,
                  fontWeight: '700',
                  marginBottom: 2,
                  marginLeft: 4,
                }}
              >
                {displayName}
              </Text>
            )}
            <View
              style={{
                backgroundColor: isMine
                  ? COLORS.signal
                  : 'rgba(255,255,255,0.06)',
                borderWidth: isMine ? 0 : 1,
                borderColor: 'rgba(255,255,255,0.08)',
                borderRadius: 16,
                borderTopRightRadius: isMine ? 4 : 16,
                borderTopLeftRadius: isMine ? 16 : 4,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: COLORS.fog, fontSize: 14, lineHeight: 19 }}>
                {item.content}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [userId, members, chat?.type]
  );

  if (!chatId) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.void }} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.void }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 14,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={{ paddingRight: 10 }}
        >
          <Text style={{ color: COLORS.fog, fontSize: 22, fontWeight: '300' }}>
            ‹
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: COLORS.fog, fontSize: 17, fontWeight: '700' }}
          >
            {chat?.name ?? (loaded ? 'Chat' : 'Loading…')}
          </Text>
          {chat && (
            <Text style={{ color: 'rgba(242,244,246,0.5)', fontSize: 11 }}>
              {chat.type === 'GROUP'
                ? `${chat.memberIds.length} members`
                : otherMemberCount === 1
                ? 'Direct message'
                : `${chat.memberIds.length} members`}
            </Text>
          )}
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loaded && !chat ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(242,244,246,0.4)' }}>
              Chat not found or you don't have access.
            </Text>
          </View>
        ) : !loaded ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={COLORS.signal} />
          </View>
        ) : messages.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
            }}
          >
            <Text style={{ color: 'rgba(242,244,246,0.4)', textAlign: 'center' }}>
              No messages yet. Say hi to the crew.
            </Text>
          </View>
        ) : (
          <FlatList
            inverted
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingVertical: 12 }}
            keyboardDismissMode="on-drag"
          />
        )}

        {/* Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
            padding: 12,
            paddingBottom: 28,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message…"
            placeholderTextColor="rgba(242,244,246,0.35)"
            multiline
            style={{
              flex: 1,
              color: COLORS.fog,
              fontSize: 15,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingTop: 10,
              paddingBottom: 10,
              maxHeight: 120,
              minHeight: 40,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !input.trim()}
            activeOpacity={0.8}
            style={{
              height: 40,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor:
                sending || !input.trim()
                  ? 'rgba(46,92,255,0.35)'
                  : COLORS.signal,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: COLORS.fog, fontWeight: '700', fontSize: 13 }}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
