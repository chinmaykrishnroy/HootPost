import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { images } from '@/constants';
import { ChatSummary, otherParticipant } from '@/lib/chatApi';

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatListItem = ({
  chat,
  currentUsername,
  onPress,
}: {
  chat: ChatSummary;
  currentUsername?: string | null;
  onPress: (chat: ChatSummary) => void;
}) => {
  const participant = otherParticipant(chat, currentUsername);
  const title = participant?.firstName || participant?.username || 'Chat';
  const preview = chat.lastMessage?.content || 'Say hello and make it official.';

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => onPress(chat)}
      className="flex-row items-center px-4 py-3 border-b border-[#1f1f1f]"
    >
      <Image
        source={participant?.profilePicture ? { uri: participant.profilePicture } : images.owl}
        style={{ width: 54, height: 54, borderRadius: 18 }}
        contentFit="cover"
      />
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text className="text-secondary-300 text-xl font-spotifymixuititle flex-1" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-gray-500 font-spotifymixui text-xs">{formatTime(chat.lastMessageAt || chat.updatedAt)}</Text>
        </View>
        <Text className="text-gray-400 font-spotifymixui mt-1" numberOfLines={1}>
          {preview}
        </Text>
      </View>
      {!!chat.unreadCount && (
        <View className="ml-3 bg-primary-200 rounded-full min-w-[24px] h-6 items-center justify-center px-2">
          <Text className="text-black font-spotifymixblack text-xs">{chat.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ChatListItem;
