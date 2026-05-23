import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import HeaderBackButton from '@/components/HeaderBackButton';
import CustomModal from '@/components/CustomModal';
import { images } from '@/constants';
import { loadConnections, startDirectChat } from '@/lib/chatApi';

const PAGE_SIZE = 25;

const ChatConnections = () => {
  const [connections, setConnections] = useState<any[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const loadPage = useCallback(async (offset = 0) => {
    if (offset === 0) setIsLoading(true);
    else setIsLoadingMore(true);
    try {
      setError('');
      const page = await loadConnections({ limit: PAGE_SIZE, offset });
      setConnections((current) => offset === 0 ? page.items : [...current, ...page.items]);
      setNextOffset(page.hasMore ? page.nextOffset : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load connections.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  const startChat = async () => {
    if (!selectedUser?.username) return;
    setIsStarting(true);
    try {
      await startDirectChat(selectedUser.username);
      router.replace('/chat');
    } catch (err) {
      Alert.alert('Could not start chat', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsStarting(false);
      setSelectedUser(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <View className="h-14 flex-row items-center px-1 border-b border-[#1f1f1f]">
        <HeaderBackButton />
        <Text className="text-secondary-300 text-2xl font-spotifymixuititle ml-4">
          My Connections
        </Text>
      </View>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f33eb7" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-secondary-300 text-2xl text-center font-spotifymixuititle">Could not load connections</Text>
          <Text className="text-gray-400 text-center mt-2 font-spotifymixui">{error}</Text>
          <TouchableOpacity onPress={() => loadPage(0)} className="bg-primary-200 rounded-xl px-5 py-3 mt-5">
            <Text className="text-black font-spotifymixuititle">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
          ListEmptyComponent={(
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-secondary-300 text-2xl text-center font-spotifymixuititle">
                No connections yet
              </Text>
              <Text className="text-gray-400 text-center mt-2 font-spotifymixui">
                Connect with someone first, then come back and start chatting.
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => setSelectedUser(item)}
              className="flex-row items-center px-4 py-3 border-b border-[#1f1f1f]"
            >
              <Image
                source={item.profilePicture ? { uri: item.profilePicture } : images.owl}
                style={{ width: 54, height: 54, borderRadius: 18 }}
                contentFit="cover"
              />
              <View className="ml-3 flex-1">
                <Text className="text-secondary-300 text-xl font-spotifymixuititle" numberOfLines={1}>
                  {item.firstName || item.username}
                </Text>
                <Text className="text-gray-500 font-spotifymixui" numberOfLines={1}>@{item.username}</Text>
              </View>
            </TouchableOpacity>
          )}
          onEndReached={() => {
            if (nextOffset !== null && !isLoadingMore) loadPage(nextOffset);
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color="#f33eb7" style={{ marginVertical: 16 }} /> : null}
        />
      )}
      <CustomModal
        title={selectedUser ? `Start chat with ${selectedUser.firstName || selectedUser.username}?` : 'Start chat?'}
        isVisible={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        closeTitle="No"
        buttons={[
          {
            title: isStarting ? 'Starting' : 'Yes',
            disabled: isStarting,
            onPress: startChat,
          },
        ]}
      />
    </SafeAreaView>
  );
};

export default ChatConnections;
