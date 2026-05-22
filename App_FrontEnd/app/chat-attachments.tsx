import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import HeaderBackButton from '@/components/HeaderBackButton';

const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const ChatAttachments = () => {
  const params = useLocalSearchParams();
  const title = firstParam(params.title) || 'Chat';

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <View className="h-14 flex-row items-center px-1 border-b border-[#1f1f1f]">
        <HeaderBackButton />
        <Text className="text-secondary-300 text-2xl font-spotifymixuititle ml-4" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View className="flex-row border-b border-[#1f1f1f]">
        {['Media', 'Files', 'Links'].map((label) => (
          <View key={label} className="flex-1 py-4 items-center">
            <Text className="text-primary-200 font-spotifymixuititle">{label}</Text>
          </View>
        ))}
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-secondary-300 text-2xl text-center font-spotifymixuititle">
          Attachments will land here
        </Text>
        <Text className="text-gray-500 text-center mt-2 font-spotifymixui">
          Photos, videos, files, and shared links can plug into this screen next.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default ChatAttachments;
