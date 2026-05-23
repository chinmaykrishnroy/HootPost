import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import HeaderBackButton from '@/components/HeaderBackButton';
import LineEdit from '@/components/LineEdit';
import { icons, images } from '@/constants';
import { useGlobalContext } from '@/context/GlobalProvider';
import { ChatMessage, ChatParticipant, ChatSummary, loadChat, markChatRead, sendTextMessage } from '@/lib/chatApi';
import { getRealtimeSocket } from '@/lib/realtime';

const MAX_MESSAGE_LENGTH = 4000;
const COLLAPSED_MESSAGE_LENGTH = 700;

const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const messageId = (message: ChatMessage) => message._id || `${message.sender}-${message.createdAt}-${message.content}`;

const senderUsername = (message: ChatMessage) =>
  typeof message.sender === 'object' ? message.sender?.username : '';

const senderId = (message: ChatMessage) =>
  typeof message.sender === 'object' ? message.sender?._id : message.sender;

const formatLocalTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDetailTime = (value?: string) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const latestReceipt = (receipts?: Record<string, string>, excludeUserId?: string) => {
  const values = Object.entries(receipts || {})
    .filter(([userId]) => userId !== excludeUserId)
    .map(([, value]) => value)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return values[0];
};

const isTableText = (text: string) =>
  text.split('\n').filter((line) => (line.match(/\|/g) || []).length >= 2).length >= 2;

const renderInlineMarkdown = (text: string, baseColor: string, linkColor: string) => {
  const linkPattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s]+)/gi;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  const renderMarks = (segment: string, keyPrefix: string) => {
    const markPattern = /(`[^`]+`|\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/g;
    const parts: React.ReactNode[] = [];
    let markLastIndex = 0;
    let markMatch;

    while ((markMatch = markPattern.exec(segment))) {
      if (markMatch.index > markLastIndex) {
        parts.push(<Text key={`${keyPrefix}-plain-${markLastIndex}`}>{segment.slice(markLastIndex, markMatch.index)}</Text>);
      }
      const token = markMatch[0];
      const code = token.startsWith('`');
      const bold = token.startsWith('**');
      const clean = code || bold ? token.slice(code ? 1 : 2, code ? -1 : -2) : token.slice(1, -1);
      parts.push(
        <Text
          key={`${keyPrefix}-mark-${markMatch.index}`}
          style={{
            color: baseColor,
            fontWeight: bold ? '800' : '400',
            fontStyle: !code && !bold ? 'italic' : 'normal',
            fontFamily: code ? 'monospace' : undefined,
            backgroundColor: code ? 'rgba(255,255,255,0.12)' : 'transparent',
          }}
        >
          {clean}
        </Text>
      );
      markLastIndex = markPattern.lastIndex;
    }

    if (markLastIndex < segment.length) {
      parts.push(<Text key={`${keyPrefix}-plain-end`}>{segment.slice(markLastIndex)}</Text>);
    }
    return parts;
  };

  while ((match = linkPattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(...renderMarks(text.slice(lastIndex, match.index), `p-${lastIndex}`));
    }
    const url = match[3] || match[0];
    const label = match[2] || url;
    nodes.push(
      <Text
        key={`link-${match.index}`}
        style={{ color: linkColor, textDecorationLine: 'underline' }}
        onPress={() => Linking.openURL(url).catch(() => {})}
      >
        {label}
      </Text>
    );
    lastIndex = linkPattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(...renderMarks(text.slice(lastIndex), `p-${lastIndex}`));
  return nodes;
};

const MarkdownMessage = ({ content, mine }: { content: string; mine: boolean }) => {
  const [expanded, setExpanded] = useState(content.length <= COLLAPSED_MESSAGE_LENGTH);
  const textColor = mine ? '#050505' : '#ffffff';
  const linkColor = mine ? '#7a0052' : '#ffe1f7';
  const shouldCollapse = content.length > COLLAPSED_MESSAGE_LENGTH;
  const visibleContent = expanded || !shouldCollapse
    ? content
    : `${content.slice(0, COLLAPSED_MESSAGE_LENGTH).trim()}...`;

  if (isTableText(visibleContent)) {
    return (
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={{ color: textColor, fontFamily: 'monospace', lineHeight: 22 }}>
            {visibleContent}
          </Text>
        </ScrollView>
        {shouldCollapse && (
          <TouchableOpacity onPress={() => setExpanded((value) => !value)} className="mt-2">
            <Text style={{ color: linkColor, fontWeight: '700' }}>{expanded ? 'Show less' : 'Read more'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View>
      <Text style={{ color: textColor, fontSize: 16, lineHeight: 22 }}>
        {renderInlineMarkdown(visibleContent, textColor, linkColor)}
      </Text>
      {shouldCollapse && (
        <TouchableOpacity onPress={() => setExpanded((value) => !value)} className="mt-2">
          <Text style={{ color: linkColor, fontWeight: '700' }}>{expanded ? 'Show less' : 'Read more'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const MessageBubble = ({
  item,
  currentUserId,
  mine,
  sender,
  onReply,
  onJumpToReply,
}: {
  item: ChatMessage;
  currentUserId?: string;
  mine: boolean;
  sender?: ChatParticipant;
  onReply: (message: ChatMessage) => void;
  onJumpToReply: (messageId?: string) => void;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const translateX = useSharedValue(0);
  const avatar = sender?.profilePicture ? { uri: sender.profilePicture } : images.owl;
  const displayedTime = mine
    ? item.createdAt
    : item.deliveredAtByUser?.[currentUserId || ''] || item.createdAt;
  const deliveredAt = latestReceipt(item.deliveredAtByUser, currentUserId);
  const seenAt = latestReceipt(item.seenAtByUser, currentUserId);

  const toggleDetails = useCallback(() => {
    if (mine) setShowDetails((value) => !value);
  }, [mine]);

  const panGesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      translateX.value = Math.max(-70, Math.min(70, event.translationX));
    })
    .onEnd((event) => {
      if (event.translationX > 56) runOnJS(onReply)(item);
      if (event.translationX < -56 && mine) runOnJS(toggleDetails)();
      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
    }), [item, mine, onReply, toggleDetails, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (item.type === 'system') {
    return (
      <View className="items-center my-3 px-8">
        <View className="bg-[#161616] border border-[#292929] rounded-full px-4 py-2">
          <Text className="text-gray-300 text-center font-spotifymixui text-xs">{item.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle} className={`mb-3 flex-row ${mine ? 'self-end flex-row-reverse' : 'self-start'} max-w-[94%]`}>
        <ExpoImage source={avatar} style={{ width: 30, height: 30, borderRadius: 11, marginHorizontal: 6, marginTop: 4 }} contentFit="cover" />
        <View className={`max-w-[82%] ${mine ? 'items-end' : 'items-start'}`}>
          <View className={`${mine ? 'bg-pink-200' : 'bg-primary-200'} rounded-2xl px-4 py-3`}>
            {!!item.replyTo && (
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => onJumpToReply(item.replyTo?._id)}
                className="mb-2 rounded-xl px-3 py-2 bg-black/15 border-l-2 border-white/70"
              >
                <Text className={`${mine ? 'text-black' : 'text-white'} font-spotifymixuititle text-xs`} numberOfLines={1}>
                  Reply to {typeof item.replyTo.sender === 'object' ? item.replyTo.sender?.firstName || item.replyTo.sender?.username : 'message'}
                </Text>
                <Text className={`${mine ? 'text-black/70' : 'text-white/75'} font-spotifymixui text-xs`} numberOfLines={2}>
                  {item.replyTo.content}
                </Text>
              </TouchableOpacity>
            )}
            <MarkdownMessage content={item.content || ''} mine={mine} />
            {!!item.metadata?.links?.length && (
              <View className="mt-2">
                {item.metadata.links.slice(0, 2).map((link) => (
                  <TouchableOpacity key={link.url} onPress={() => Linking.openURL(link.url).catch(() => {})}>
                    <Text className={`${mine ? 'text-[#7a0052]' : 'text-white'} font-spotifymixui text-xs`} numberOfLines={1}>
                      {link.host || link.url}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text className={`${mine ? 'text-black/55' : 'text-white/75'} font-spotifymixui text-[11px] self-end mt-1`}>
              {formatLocalTime(displayedTime)}
            </Text>
          </View>
          {showDetails && mine && (
            <View className="mt-1 mr-1 rounded-xl bg-[#151515] border border-[#252525] px-3 py-2">
              <Text className="text-gray-400 font-spotifymixui text-xs">Sent {formatDetailTime(item.createdAt)}</Text>
              <Text className="text-gray-400 font-spotifymixui text-xs">Delivered {formatDetailTime(deliveredAt)}</Text>
              <Text className="text-gray-400 font-spotifymixui text-xs">Seen {formatDetailTime(seenAt)}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const ChatRoom = () => {
  const params = useLocalSearchParams();
  const username = firstParam(params.username);
  const firstName = firstParam(params.firstName) || username || 'Chat';
  const initialChatId = firstParam(params.chatId);
  const { user } = useGlobalContext();
  const [chat, setChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const socketRef = useRef<Awaited<ReturnType<typeof getRealtimeSocket>> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatId = chat?._id || initialChatId;

  const mergeMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => messageId(item) === messageId(message))) return current;
      return [...current, message].sort((a, b) =>
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
    });
  }, []);

  const loadConversation = useCallback(async () => {
    if (!username) return;
    try {
      const data = await loadChat(username);
      setChat(data.chat);
      setMessages(data.messages || []);
      if (data.chat?._id) markChatRead(data.chat._id).catch(() => {});
    } catch (err) {
      Alert.alert('Could not load chat', err instanceof Error ? err.message : 'Please try again.');
    }
  }, [username]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!chatId) return;
    let mounted = true;
    let handleNewMessage: any;
    let handleTypingStart: any;
    let handleTypingStop: any;
    let handleDelivered: any;
    let handleRead: any;

    const applyReceipt = (type: 'delivered' | 'seen', userId: string, at: string) => {
      setMessages((current) => current.map((message) => {
        const sentByMe = senderId(message) === user?.userId || senderUsername(message) === user?.username;
        if (!sentByMe) return message;
        return type === 'delivered'
          ? { ...message, deliveredAtByUser: { ...(message.deliveredAtByUser || {}), [userId]: at } }
          : { ...message, seenAtByUser: { ...(message.seenAtByUser || {}), [userId]: at } };
      }));
    };

    const connect = async () => {
      const socket = await getRealtimeSocket();
      if (!socket || !mounted) return;
      socketRef.current = socket;
      socket.emit('chat:join', { chatId });

      handleNewMessage = ({ chatId: eventChatId, message }: any) => {
        if (eventChatId !== chatId || !message) return;
        mergeMessage(message);
        markChatRead(chatId).catch(() => {});
      };
      handleTypingStart = ({ chatId: eventChatId, userId }: any) => {
        if (eventChatId === chatId && userId !== user?.userId) setIsTyping(true);
      };
      handleTypingStop = ({ chatId: eventChatId, userId }: any) => {
        if (eventChatId === chatId && userId !== user?.userId) setIsTyping(false);
      };
      handleDelivered = ({ chatId: eventChatId, userId, at }: any) => {
        if (eventChatId === chatId && userId !== user?.userId) applyReceipt('delivered', userId, at);
      };
      handleRead = ({ chatId: eventChatId, userId, at }: any) => {
        if (eventChatId === chatId && userId !== user?.userId) applyReceipt('seen', userId, at);
      };

      socket.on('message:new', handleNewMessage);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);
      socket.on('chat:delivered', handleDelivered);
      socket.on('chat:read', handleRead);
    };

    connect();
    return () => {
      mounted = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (socketRef.current) {
        socketRef.current.emit('chat:leave', { chatId });
        if (handleNewMessage) socketRef.current.off('message:new', handleNewMessage);
        if (handleTypingStart) socketRef.current.off('typing:start', handleTypingStart);
        if (handleTypingStop) socketRef.current.off('typing:stop', handleTypingStop);
        if (handleDelivered) socketRef.current.off('chat:delivered', handleDelivered);
        if (handleRead) socketRef.current.off('chat:read', handleRead);
      }
    };
  }, [chatId, mergeMessage, user?.userId, user?.username]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [messages.length]);

  const displayedMessages = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return messages;
    return messages.filter((message) => String(message.content || '').toLowerCase().includes(query));
  }, [messages, searchText]);

  const participantById = useMemo(() => {
    const map = new Map<string, ChatParticipant>();
    chat?.participants?.forEach((participant) => map.set(participant._id, participant));
    return map;
  }, [chat?.participants]);

  const participantByUsername = useMemo(() => {
    const map = new Map<string, ChatParticipant>();
    chat?.participants?.forEach((participant) => map.set(participant.username, participant));
    return map;
  }, [chat?.participants]);

  const senderForMessage = useCallback((message: ChatMessage) => {
    if (typeof message.sender === 'object') return message.sender;
    return participantById.get(message.sender) || participantByUsername.get(senderUsername(message));
  }, [participantById, participantByUsername]);

  const scrollToMessage = (targetId?: string) => {
    if (!targetId) return;
    const index = messages.findIndex((message) => message._id === targetId);
    if (index < 0) return;
    setSearchText('');
    setIsSearching(false);
    setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }), 80);
  };

  const emitTyping = () => {
    if (!chatId) return;
    socketRef.current?.emit('typing:start', { chatId });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { chatId });
    }, 900);
  };

  const send = async () => {
    const content = input.trim();
    if (!content || !username || isSending) return;
    setInput('');
    setReplyingTo(null);
    setIsSending(true);
    socketRef.current?.emit('typing:stop', { chatId });
    try {
      const message = await sendTextMessage(username, content, replyingTo?._id);
      mergeMessage(message);
    } catch (err) {
      setInput(content);
      setReplyingTo(replyingTo);
      Alert.alert('Message not sent', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const openAttachments = () => {
    router.push({
      pathname: '/chat-attachments',
      params: { chatId, title: firstName },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View className="h-14 flex-row items-center px-1 border-b border-[#1f1f1f]">
          <HeaderBackButton />
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={openAttachments}
            className="flex-1 h-10 rounded-xl bg-[#050505] border border-[#252525] justify-center px-3 ml-3"
          >
            <Text className="text-secondary-300 font-spotifymixuititle text-lg" numberOfLines={1}>
              {firstName}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => setIsSearching((value) => !value)}
            className="h-10 w-10 items-center justify-center ml-2"
          >
            <Image source={icons.search} className="w-6 h-6" style={{ tintColor: '#f33eb7' }} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            className="h-10 w-10 items-center justify-center ml-1 mr-3"
          >
            <Image source={icons.menu} className="w-6 h-6" style={{ tintColor: '#f33eb7' }} />
          </TouchableOpacity>
        </View>

        {isSearching && (
          <View className="px-3 py-2 border-b border-[#1f1f1f]">
            <LineEdit
              value={searchText}
              placeholder="Search this chat"
              handleChangeText={setSearchText}
              disabled={true}
              icon={icons.search}
              keyboardType="default"
              autoCapitalize="none"
            />
          </View>
        )}

        <FlatList
          ref={listRef}
          data={displayedMessages}
          keyExtractor={messageId}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 12 }}
          onScrollToIndexFailed={({ index }) => {
            setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }), 180);
          }}
          renderItem={({ item }) => {
            const mine = senderId(item) === user?.userId || senderUsername(item) === user?.username;
            return (
              <MessageBubble
                item={item}
                mine={mine}
                currentUserId={user?.userId}
                sender={senderForMessage(item)}
                onReply={setReplyingTo}
                onJumpToReply={scrollToMessage}
              />
            );
          }}
          ListEmptyComponent={(
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-secondary-300 text-2xl text-center font-spotifymixuititle">
                No messages yet
              </Text>
              <Text className="text-gray-500 text-center mt-2 font-spotifymixui">
                A single hello is enough to make the room less awkward.
              </Text>
            </View>
          )}
        />

        {isTyping && (
          <Text className="text-primary-200 font-spotifymixui px-4 pb-1">
            {firstName} is typing...
          </Text>
        )}

        {!!replyingTo && (
          <View className="mx-3 mb-2 bg-[#121212] border border-[#252525] rounded-2xl px-4 py-3 flex-row items-center">
            <TouchableOpacity className="flex-1" activeOpacity={0.8} onPress={() => scrollToMessage(replyingTo._id)}>
              <Text className="text-primary-200 font-spotifymixuititle text-xs">Replying to message</Text>
              <Text className="text-gray-300 font-spotifymixui" numberOfLines={2}>{replyingTo.content}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReplyingTo(null)} className="w-8 h-8 items-center justify-center">
              <Feather name="x" size={20} color="#f33eb7" />
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row items-end px-3 pt-2 pb-3 border-t border-[#1f1f1f] bg-[#050505]">
          <TextInput
            value={input}
            onChangeText={(value) => {
              setInput(value);
              emitTyping();
            }}
            placeholder="Message"
            placeholderTextColor="#875689"
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            className="flex-1 max-h-28 bg-[#111] border border-[#252525] rounded-2xl px-4 py-3 text-secondary-300 font-spotifymixui"
            selectionColor="#d80c94"
          />
          <TouchableOpacity
            activeOpacity={0.86}
            disabled={!input.trim() || isSending}
            onPress={send}
            className={`ml-2 w-12 h-12 rounded-2xl items-center justify-center ${input.trim() ? 'bg-primary-200' : 'bg-[#222]'}`}
          >
            <Feather name="send" size={20} color={input.trim() ? '#050505' : '#777'} />
          </TouchableOpacity>
        </View>
        {input.length > 3600 && (
          <Text className="text-gray-500 font-spotifymixui text-xs text-right pr-4 pb-2">
            {MAX_MESSAGE_LENGTH - input.length} characters left
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatRoom;
