import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import HeaderBackButton from '@/components/HeaderBackButton';
import LineEdit from '@/components/LineEdit';
import { icons } from '@/constants';
import { useGlobalContext } from '@/context/GlobalProvider';
import { ChatMessage, ChatSummary, loadChat, markChatRead, sendTextMessage } from '@/lib/chatApi';
import { getRealtimeSocket } from '@/lib/realtime';

const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const messageId = (message: ChatMessage) => message._id || `${message.sender}-${message.createdAt}-${message.content}`;

const senderUsername = (message: ChatMessage) =>
  typeof message.sender === 'object' ? message.sender?.username : '';

const senderId = (message: ChatMessage) =>
  typeof message.sender === 'object' ? message.sender?._id : message.sender;

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

      socket.on('message:new', handleNewMessage);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);
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
      }
    };
  }, [chatId, mergeMessage, user?.userId]);

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
    setIsSending(true);
    socketRef.current?.emit('typing:stop', { chatId });
    try {
      const message = await sendTextMessage(username, content);
      mergeMessage(message);
    } catch (err) {
      setInput(content);
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
            className="flex-1 h-10 rounded-xl bg-[#111] border border-[#252525] justify-center px-3 ml-3"
          >
            <Text className="text-secondary-300 font-spotifymixuititle text-lg" numberOfLines={1}>
              {firstName}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => setIsSearching((value) => !value)}
            className="h-10 px-3 rounded-xl bg-[#151515] border border-[#252525] items-center justify-center ml-2"
          >
            <Image source={icons.search} className="w-5 h-5" style={{ tintColor: '#f33eb7' }} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            className="h-10 px-3 rounded-xl bg-[#151515] border border-[#252525] items-center justify-center ml-2 mr-3"
          >
            <Image source={icons.menu} className="w-5 h-5" style={{ tintColor: '#f33eb7' }} />
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
          renderItem={({ item }) => {
            const mine = senderId(item) === user?.userId || senderUsername(item) === user?.username;
            return (
              <View className={`mb-2 max-w-[82%] ${mine ? 'self-end' : 'self-start'}`}>
                <View className={`${mine ? 'bg-pink-200' : 'bg-primary-200'} rounded-2xl px-4 py-3`}>
                  <Text className={`${mine ? 'text-black' : 'text-white'} font-spotifymixui text-base`}>
                    {item.content}
                  </Text>
                </View>
              </View>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatRoom;
