import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BASE_URL from '../config.js';
import { icons } from '@/constants';
import CustomModal from '@/components/CustomModal';
import LineEdit from '@/components/LineEdit';
import PostTile from '@/components/PostTile';
import { useGlobalContext } from '@/context/GlobalProvider';

const SORT_POSTS_NEWEST_FIRST = true;

const MyPosts = () => {
  const { user } = useGlobalContext();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [postAction, setPostAction] = useState<any>(null);
  const [deleteAction, setDeleteAction] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.username) return;
    try {
      const response = await fetch(`${BASE_URL}/users/${user.username}/complete`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load your posts.');
      setUserData(await response.json());
    } catch (error) {
      Alert.alert('Posts failed', error instanceof Error ? error.message : 'Could not load your posts.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.username]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {
        setPostAction(null);
        setDeleteAction(null);
      };
    }, [fetchData])
  );

  const userPosts = useMemo(() => {
    const posts = [...(userData?.posts || [])];
    if (!SORT_POSTS_NEWEST_FIRST) return posts;
    return posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [userData?.posts]);

  const filteredPosts = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return userPosts;
    return userPosts.filter((post) => (post.caption || '').toLowerCase().includes(search));
  }, [searchText, userPosts]);

  const postForTile = useCallback((post: any) => ({
    ...post,
    username: userData?.username,
    name: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
    profilePicture: userData?.profilePicture,
    liked: !!post?.liked,
    likeCount: post?.likeCount || 0,
    updatedAt: post?.updatedAt || '',
  }), [userData?.firstName, userData?.lastName, userData?.profilePicture, userData?.username]);

  const refresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const archivePost = async (post: any) => {
    if (!post) return;
    setActionLoading('archive');
    try {
      const response = await fetch(`${BASE_URL}/posts/archive/${post.postId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Could not archive this post.');
      setPostAction(null);
      setDeleteAction(null);
      await fetchData();
    } catch (error) {
      Alert.alert('Archive failed', error instanceof Error ? error.message : 'Could not archive this post.');
    } finally {
      setActionLoading(null);
    }
  };

  const deletePost = async (post: any) => {
    if (!post) return;
    setActionLoading('delete');
    try {
      const response = await fetch(`${BASE_URL}/posts/delete/${post.postId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Could not delete this post.');
      setPostAction(null);
      setDeleteAction(null);
      await fetchData();
    } catch (error) {
      Alert.alert('Delete failed', error instanceof Error ? error.message : 'Could not delete this post.');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditPost = async (post: any) => {
    if (!post) return;
    await AsyncStorage.setItem('hootpost:edit-post', JSON.stringify(post));
    setPostAction(null);
    router.push('/edit-compose');
  };

  const renderPost = ({ item }: { item: any }) => (
    <PostTile
      post={postForTile(item)}
      background="bg-[#050505]"
      title_color="text-secondary-300"
      caption_color="text-gray-200"
      border_color="border-[#777777]/5"
      onDotButtonPress={() => setPostAction(item)}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <View className="h-14 flex-row items-center px-3 border-b border-[#161616]">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Image source={icons.leftArrow} className="w-6 h-6" style={{ tintColor: '#f33eb7' }} />
        </TouchableOpacity>
        {isSearching ? (
          <View className="flex-1 ml-2">
            <LineEdit
              value={searchText}
              placeholder="Search posts"
              handleChangeText={setSearchText}
              icon={icons.search}
              keyboardType="default"
              autoCapitalize="none"
              disabled
            />
          </View>
        ) : (
          <Text className="flex-1 text-secondary-300 text-2xl font-spotifymixuititleextrabold text-center">
            My Posts
          </Text>
        )}
        <TouchableOpacity
          onPress={() => {
            if (isSearching) setSearchText('');
            setIsSearching((value) => !value);
          }}
          className="w-10 h-10 items-center justify-center"
        >
          <Image source={isSearching ? icons.close : icons.search} className="w-6 h-6" style={{ tintColor: '#f33eb7' }} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f33eb7" />
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.postId}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#f22fb1']} progressBackgroundColor="black" />}
          ListEmptyComponent={
            <View className="items-center justify-center mt-[50%]">
              <Text className="text-gray-400 font-spotifymixui">No posts found.</Text>
            </View>
          }
        />
      )}

      <CustomModal
        title="Post options"
        isVisible={!!postAction}
        onClose={() => setPostAction(null)}
        buttons={[
          { title: actionLoading === 'archive' ? 'Archiving' : 'Archive', disabled: !!actionLoading, onPress: () => archivePost(postAction) },
          { title: 'Edit', disabled: !!actionLoading, onPress: () => openEditPost(postAction) },
          { title: 'Delete', disabled: !!actionLoading, danger: true, onPress: () => { setDeleteAction(postAction); setPostAction(null); } },
        ]}
      />
      <CustomModal
        title="Delete post?"
        isVisible={!!deleteAction}
        onClose={() => setDeleteAction(null)}
        closeTitle="Cancel"
        buttons={[
          { title: actionLoading === 'archive' ? 'Archiving' : 'Archive', disabled: !!actionLoading, onPress: () => archivePost(deleteAction) },
          { title: actionLoading === 'delete' ? 'Deleting' : 'Delete', disabled: !!actionLoading, danger: true, onPress: () => deletePost(deleteAction) },
        ]}
      />
    </SafeAreaView>
  );
};

export default MyPosts;
