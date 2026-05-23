import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import HeaderBackButton from '@/components/HeaderBackButton';
import EmptyPosts from '@/components/EmptyPosts';
import BASE_URL from '../config.js';
import { images } from '@/constants';

const firstParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

const formatJoined = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ChatUserProfile = () => {
  const params = useLocalSearchParams();
  const username = firstParam(params.username);
  const chatId = firstParam(params.chatId);
  const title = firstParam(params.title) || username || 'Profile';
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/${username}/complete`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || data?.message || 'Could not load this profile.');
      }
      setUserData(await response.json());
    } catch (error) {
      Alert.alert('Profile unavailable', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const posts = useMemo(() => {
    const items = [...(userData?.posts || [])];
    return items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [userData?.posts]);

  const openAttachments = () => {
    if (!chatId || !username) return;
    router.push({
      pathname: '/chat-attachments',
      params: { chatId, username, title: userData?.firstName || title },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#050505] items-center justify-center">
        <ActivityIndicator color="#f33eb7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <View className="h-14 flex-row items-center px-1 border-b border-[#1f1f1f]">
        <HeaderBackButton />
        <Text className="flex-1 text-secondary-300 text-2xl font-spotifymixuititle ml-4" numberOfLines={1}>
          {userData?.firstName || title}
        </Text>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={openAttachments}
          className="w-11 h-11 items-center justify-center mr-2"
        >
          <Feather name="image" size={24} color="#f33eb7" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.postId}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 12, paddingBottom: 18 }}
        ListHeaderComponent={(
          <View>
            <View className="flex-row px-1 pb-4">
              <Image
                source={userData?.profilePicture ? { uri: userData.profilePicture } : images.ghost}
                style={{ width: 128, height: 128, borderRadius: 12, backgroundColor: '#111' }}
                contentFit="cover"
              />
              <View className="flex-1 ml-4 justify-between py-1">
                <Text className="text-white text-2xl font-spotifymixuititleextrabold" numberOfLines={1}>
                  {`${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.username}
                </Text>
                <Text className="text-white font-spotifymixui text-lg">@{userData?.username}</Text>
                {!!userData?.createdAt && (
                  <Text className="text-gray-300 font-spotifymixui text-sm">Joined on {formatJoined(userData.createdAt)}</Text>
                )}
                {!!userData?.email && (
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${userData.email}`)}>
                    <Text className="text-pink-400 font-spotifymixuititle" numberOfLines={1}>{userData.email}</Text>
                  </TouchableOpacity>
                )}
                {!!userData?.bio && (
                  <Text className="text-white font-spotifymixui" numberOfLines={2}>{userData.bio}</Text>
                )}
              </View>
            </View>

            <View className="flex-row justify-around py-4 border-y border-[#1f1f1f]">
              <Stat label="Requests" value={userData?.connectionRequestsCount || 0} />
              <Stat label="Posts" value={userData?.postsCount || 0} />
              <Stat label="Likes" value={userData?.totalLikesCount || 0} />
              <Stat label="Connections" value={userData?.connectionsCount || 0} />
            </View>

            <View className="h-[48px] bg-[#131313] items-center justify-center mb-2">
              <Text className="text-white text-2xl font-spotifymixuititleextrabold">Posts</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyPosts />}
        renderItem={({ item }) => (
          <View className="flex-1 m-1">
            <Image
              source={item.image ? { uri: item.image } : images.owl}
              style={{ width: '100%', height: 184, borderRadius: 18, backgroundColor: '#111' }}
              contentFit="cover"
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <View className="items-center w-1/4">
    <Text className="text-white font-spotifymixui text-3xl">{value}</Text>
    <Text className="text-white font-spotifymixuititle text-xs">{label}</Text>
  </View>
);

export default ChatUserProfile;
