import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import HeaderBackButton from '@/components/HeaderBackButton';
import { ChatMessage, listChatAttachments } from '@/lib/chatApi';
import { images } from '@/constants';

const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const tabs = ['media', 'files', 'links'] as const;

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const senderName = (message: ChatMessage) => {
  const sender = typeof message.sender === 'object' ? message.sender : null;
  return sender?.firstName || sender?.username || 'Someone';
};

const ChatAttachments = () => {
  const params = useLocalSearchParams();
  const title = firstParam(params.title) || 'Chat';
  const chatId = firstParam(params.chatId);
  const username = firstParam(params.username);
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('media');
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!chatId) return;
    setIsLoading(true);
    try {
      setItems(await listChatAttachments(chatId, activeTab));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, chatId]);

  useEffect(() => {
    load();
  }, [load]);

  const openMessage = (message: ChatMessage) => {
    if (!username) return;
    router.push({
      pathname: '/chat-room',
      params: {
        chatId,
        username,
        firstName: title,
        focusMessageId: message._id,
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <View className="h-14 flex-row items-center px-1 border-b border-[#1f1f1f]">
        <HeaderBackButton />
        <Text className="text-secondary-300 text-2xl font-spotifymixuititle ml-4" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View className="flex-row border-b border-[#1f1f1f]">
        {tabs.map((label) => (
          <TouchableOpacity
            key={label}
            activeOpacity={0.86}
            onPress={() => setActiveTab(label)}
            className="flex-1 py-4 items-center"
          >
            <Text className={`${activeTab === label ? 'text-primary-200' : 'text-gray-500'} font-spotifymixuititle capitalize`}>
              {label}
            </Text>
            {activeTab === label && <View className="h-1 w-8 bg-primary-200 rounded-full mt-2" />}
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f33eb7" />
        </View>
      ) : activeTab === 'media' ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          numColumns={3}
          contentContainerStyle={{ padding: 2, flexGrow: 1 }}
          ListEmptyComponent={<EmptyAttachment type={activeTab} />}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.86} onPress={() => openMessage(item)} className="w-1/3 p-1">
              <Image
                source={item.fileUrl ? { uri: item.fileUrl } : images.owl}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#111' }}
                contentFit="cover"
              />
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingVertical: 6, flexGrow: 1 }}
          ListEmptyComponent={<EmptyAttachment type={activeTab} />}
          renderItem={({ item }) => {
            const sender = typeof item.sender === 'object' ? item.sender : null;
            const firstLink = item.metadata?.links?.[0];
            return (
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => openMessage(item)}
                className="flex-row items-center px-4 py-3 border-b border-[#1f1f1f]"
              >
                <Image
                  source={sender?.profilePicture ? { uri: sender.profilePicture } : images.owl}
                  style={{ width: 42, height: 42, borderRadius: 14 }}
                  contentFit="cover"
                />
                <View className="flex-1 ml-3">
                  <Text className="text-secondary-300 font-spotifymixuititle text-base" numberOfLines={1}>
                    {activeTab === 'links' ? firstLink?.host || firstLink?.url || item.content : item.fileName || item.content || 'Attachment'}
                  </Text>
                  <Text className="text-gray-500 font-spotifymixui text-xs" numberOfLines={1}>
                    {senderName(item)} • {formatTime(item.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const EmptyAttachment = ({ type }: { type: string }) => (
  <View className="flex-1 items-center justify-center px-8">
    <Text className="text-secondary-300 text-2xl text-center font-spotifymixuititle">
      No {type} yet
    </Text>
    <Text className="text-gray-500 text-center mt-2 font-spotifymixui">
      Shared {type} from this chat will appear here.
    </Text>
  </View>
);

export default ChatAttachments;
