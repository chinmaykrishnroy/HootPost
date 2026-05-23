import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import HeaderBackButton from '@/components/HeaderBackButton';
import LineEdit from '@/components/LineEdit';
import ChatListItem from '@/components/ChatListItem';
import { icons } from '@/constants';
import { useGlobalContext } from '@/context/GlobalProvider';
import { ChatSummary, listChats, otherParticipant } from '@/lib/chatApi';
import { getRealtimeSocket } from '@/lib/realtime';

const sortChats = (items: ChatSummary[]) =>
  [...items].sort((a, b) =>
    new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime() -
    new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime()
  );

const HeaderIconButton = ({ icon, onPress }: { icon: any; onPress: () => void }) => (
  <TouchableOpacity
    activeOpacity={0.86}
    onPress={onPress}
    className="h-10 w-10 items-center justify-center"
  >
    <Image source={icon} className="w-6 h-6" style={{ tintColor: '#f33eb7' }} />
  </TouchableOpacity>
);

const Chat = () => {
  const navigation = useNavigation();
  const { user } = useGlobalContext();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await listChats();
      setChats(sortChats(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load chats.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    let mounted = true;
    let socket: Awaited<ReturnType<typeof getRealtimeSocket>> | null = null;
    let handleStarted: any;
    let handleMessage: any;

    const connect = async () => {
      socket = await getRealtimeSocket();
      if (!socket || !mounted) return;

      handleStarted = ({ chat }: { chat: ChatSummary }) => {
        if (!chat?._id) return;
        setChats((current) => {
          const exists = current.some((item) => item._id === chat._id);
          return sortChats(exists ? current.map((item) => item._id === chat._id ? chat : item) : [chat, ...current]);
        });
      };

      handleMessage = ({ chatId, message }: any) => {
        setChats((current) => {
          const exists = current.some((chat) => chat._id === chatId);
          if (!exists) {
            load();
            return current;
          }
          return sortChats(current.map((chat) =>
            chat._id === chatId
              ? { ...chat, lastMessage: message, lastMessageAt: message.createdAt, unreadCount: (chat.unreadCount || 0) + 1 }
              : chat
          ));
        });
      };

      socket.on('chat:started', handleStarted);
      socket.on('message:new', handleMessage);
    };

    connect();
    return () => {
      mounted = false;
      if (handleStarted) socket?.off('chat:started', handleStarted);
      if (handleMessage) socket?.off('message:new', handleMessage);
    };
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions(ChatScreenOptions({
      navigation,
      isSearching,
      searchText,
      setIsSearching,
      setSearchText,
    }));
  }, [isSearching, navigation, searchText]);

  const filteredChats = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return chats;
    return chats.filter((chat) => {
      const participant = otherParticipant(chat, user?.username);
      return [
        participant?.username,
        participant?.firstName,
        participant?.lastName,
        chat.lastMessage?.content,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    });
  }, [chats, searchText, user?.username]);

  const openChat = (chat: ChatSummary) => {
    const participant = otherParticipant(chat, user?.username);
    if (!participant?.username) return;
    router.push({
      pathname: '/chat-room',
      params: {
        chatId: chat._id,
        username: participant.username,
        firstName: participant.firstName || participant.username,
      },
    });
  };

  const openConnections = () => {
    router.push('/chat-connections');
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#050505]">
        <ActivityIndicator color="#f33eb7" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#050505]">
      {error ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-secondary-300 text-2xl text-center font-spotifymixuititle">Chats need a refresh</Text>
          <Text className="text-gray-400 font-spotifymixui text-center mt-2">{error}</Text>
          <TouchableOpacity onPress={load} className="bg-primary-200 rounded-xl px-5 py-3 mt-5">
            <Text className="text-black font-spotifymixuititle">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredChats.length ? (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ChatListItem chat={item} currentUsername={user?.username} onPress={openChat} />}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-8">
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={openConnections}
            className="items-center bg-[#111] border border-[#2a2a2a] rounded-3xl p-6 w-full"
          >
            <View className="w-16 h-16 bg-primary-200 rounded-2xl items-center justify-center mb-4">
              <Feather name="plus" size={34} color="#050505" />
            </View>
            <Text className="text-secondary-300 text-3xl font-spotifymixuititleextrabold text-center">
              Start a tiny conspiracy
            </Text>
            <Text className="text-gray-400 font-spotifymixui text-center mt-2">
              Pick a connection and open your first HootPost chat.
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {!!filteredChats.length && (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={openConnections}
          className="absolute right-5 bottom-5 w-14 h-14 rounded-2xl bg-primary-200 items-center justify-center"
        >
          <Feather name="plus" size={28} color="#050505" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export const ChatScreenOptions = ({
  navigation,
  isSearching = false,
  searchText = '',
  setIsSearching = () => {},
  setSearchText = () => {},
}: any) => ({
  headerTitle: () =>
    isSearching ? (
      <View className="flex-row items-center">
        <LineEdit
          value={searchText}
          placeholder="Search Chats"
          handleChangeText={setSearchText}
          disabled={true}
          icon={icons.search}
          keyboardType="default"
          autoCapitalize="none"
        />
      </View>
    ) : (
      <View className="flex-row items-center">
        <Image source={icons.rocket} className="w-6 h-6 mr-2" style={{ tintColor: '#f33eb7' }} />
        <Text className="text-secondary text-2xl font-spotifymixuititle">Chats</Text>
      </View>
    ),
  headerStyle: {
    backgroundColor: '#050505',
  },
  headerRight: () =>
    isSearching ? null : (
      <View className="flex-row items-center gap-2 mr-4">
        <HeaderIconButton icon={icons.setting} onPress={() => {}} />
        <HeaderIconButton icon={icons.search} onPress={() => setIsSearching(true)} />
      </View>
    ),
  headerLeft: () =>
    isSearching ? (
      <HeaderBackButton onPress={() => {
        setSearchText('');
        setIsSearching(false);
      }} />
    ) : <HeaderBackButton navigation={navigation} />,
});

export default Chat;
