import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image, Text, View, Alert, TouchableOpacity, FlatList, Linking, RefreshControl, Modal, TouchableWithoutFeedback } from "react-native";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect, useIsFocused, useRoute } from "@react-navigation/native"; 
import BASE_URL from '../../config.js';
import { icons, images } from '@/constants';
import { useGlobalContext } from "@/context/GlobalProvider";
import EmptyPosts from '@/components/EmptyPosts';
import LineEdit from "@/components/LineEdit";
import ProfilePictureModal from "@/components/ProfilePictureModal";
import CustomModal from "@/components/CustomModal";
import PostTile from "@/components/PostTile";

const SORT_POSTS_NEWEST_FIRST = true;

const User = () => {
  const route = useRoute();
  const { searchText: routeSearchText } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const { user, setUser } = useGlobalContext();
  const [userData, setUserData] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [postAction, setPostAction] = useState(null);
  const [deleteAction, setDeleteAction] = useState(null);
  const [previewPost, setPreviewPost] = useState(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const postsListRef = useRef(null);
  const router = useRouter();
  const isFocused = useIsFocused();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer your_token_here",
        },
        credentials: "include",
      });

      if (response.ok) {
        setUser({ username: '', userId: '' });
        router.replace("/sign-in");
      } else {
        const data = await response.json();
        const errorMessage = data.error || "Logout failed. Please try again.";
        Alert.alert("Logout Failed", errorMessage);
      }
    } catch (err) {
      Alert.alert("Logout Failed", "Something went wrong.");
    } finally {
      setIsLoading(false);
      router.replace("/sign-in");
    }
  };

  const fetchData = async (username = user?.username) => {
    try {
      const response = await fetch(`${BASE_URL}/users/${username}/complete`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer your_token_here`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();
      setUserData(data);
      
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (routeSearchText) {
      fetchData(routeSearchText);
    } else {
      fetchData();
    }
  }, [routeSearchText]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setModalVisible(false);
        setPostAction(null);
        setDeleteAction(null);
        setPreviewPost(null);
      };
    }, [])
  );
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const isSelf = userData?.username === user?.username;
  const userPosts = useMemo(() => {
    const posts = [...(userData?.posts || [])];
    if (!SORT_POSTS_NEWEST_FIRST) return posts;
    return posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [userData?.posts]);

  const scrollToSelectedPost = useCallback(() => {
    if (!userPosts.length) return;
    const index = Math.max(0, Math.min(selectedPostIndex, userPosts.length - 1));
    setTimeout(() => {
      postsListRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0.5 });
    }, 80);
  }, [selectedPostIndex, userPosts.length]);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteAction(null);
    setPostAction(null);
    scrollToSelectedPost();
  }, [scrollToSelectedPost]);

  const archivePost = async (post) => {
    if (!post) return;
    setActionLoading("archive");
    try {
      const response = await fetch(`${BASE_URL}/posts/archive/${post.postId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Could not archive this post.");
      setPostAction(null);
      setDeleteAction(null);
      await fetchData();
    } catch (error) {
      Alert.alert("Archive failed", error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const deletePost = async (post) => {
    if (!post) return;
    setActionLoading("delete");
    try {
      const response = await fetch(`${BASE_URL}/posts/delete/${post.postId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Could not delete this post.");
      setPostAction(null);
      setDeleteAction(null);
      await fetchData();
    } catch (error) {
      Alert.alert("Delete failed", error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openEditPost = async (post) => {
    if (!post) return;
    await AsyncStorage.setItem("hootpost:edit-post", JSON.stringify(post));
    setPostAction(null);
    router.push("/edit-compose");
  };

  const openPostOptions = (item, index) => {
    setSelectedPostIndex(index);
    setPostAction(item);
  };

  const openDeleteConfirm = (post) => {
    setSelectedPostIndex(userPosts.findIndex((item) => item.postId === post?.postId));
    setDeleteAction(post);
    setPostAction(null);
  };

  const postForTile = useCallback((post) => ({
    ...post,
    username: userData?.username,
    name: `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim(),
    profilePicture: userData?.profilePicture,
    liked: false,
    likeCount: post?.likeCount || 0,
    updatedAt: post?.updatedAt || "",
  }), [userData?.firstName, userData?.lastName, userData?.profilePicture, userData?.username]);

  const renderPost = ({ item, index }) => (
    <View className="relative flex-1 m-1">
      <TouchableOpacity
      onPress={() => console.log("Post pressed")}
      onLongPress={() => {
        setSelectedPostIndex(index);
        setPreviewPost(item);
      }}
      delayLongPress={260}
    >
      <Image
        source={{ uri: item.image }}
        className="w-full h-48 rounded-3xl"
      />
    </TouchableOpacity>
      {isSelf && (
        <TouchableOpacity className="absolute right-1 top-1" onPress={() => openPostOptions(item, index)}>
          <View className="w-10 h-10">
            <Image source={icons.dots} className="w-8 h-8 opacity-80 ml-4 mt-1" style={{ tintColor: "#454545" }}/>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );  

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#050505]">
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  return (
  <View className="flex-1 bg-[#050505]">
    <View className="p-2 flex-row items-stretch">
      <TouchableOpacity
      onPress={() => {console.log("Profile Picture Clicked"); setModalVisible(true);}}
      >
        <View className="relative">
          <Image
            source={ userData.profilePicture ? {uri: userData.profilePicture }: images.ghost}
            className="w-32 h-32 rounded-lg"
          />
        </View>
      </TouchableOpacity>
      <View className="justify-between mx-4 flex-1 my-2" >
        <Text className="text-white text-2xl font-spotifymixuititleextrabold" numberOfLines={1} ellipsizeMode="tail">{`${userData?.firstName} ${userData?.lastName}`}
          {userData?.moreAccessible && (
            <Text className="text-white text-lg font-spotifymixuititle">
              {`, ${userData?.age} ${userData?.gender.charAt(0)}`}
            </Text>
          )}
        </Text>
        <Text className="text-white font-spotifymixui text-lg">
          {`@${userData?.username}`}
        </Text>
        <Text className="text-white font-spotifymixui text-sm">
          {`Joined on ${new Date(userData?.createdAt).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}`}
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${userData?.email}`)}>
          <Text className="text-pink-400 font-xl font-spotifymixuititle">{userData?.email}</Text>
        </TouchableOpacity>
        <View className="w-full">
          <Text
            className="text-white font-xl font-spotifymixuititle"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ flexWrap: 'wrap' }}
          >
            {userData?.bio}
          </Text>
        </View>
      </View>
    </View>
    
    <View className="p-4 flex-row justify-around">
    <View className="items-center w-1/4">
      {userData?.moreAccessible ? (
        <TouchableOpacity onPress={() => console.log('Requests Pressed')} className="items-center">
          <Text className="text-white font-spotifymixui text-3xl">{userData?.connectionRequestsCount}</Text>
          <Text className="text-white font-xl font-spotifymixuititle">Requests</Text>
        </TouchableOpacity>
      ) : (
        <View className="items-center">
          <Text className="text-white font-spotifymixui text-3xl">{userData?.connectionRequestsCount}</Text>
          <Text className="text-white font-xl font-spotifymixuititle">Requests</Text>
        </View>
      )}
    </View>
    
    <View className="items-center w-1/4">
      <Text className="text-white font-spotifymixui text-3xl">{userData?.postsCount}</Text>
      <Text className="text-white font-xl font-spotifymixuititle">Posts</Text>
    </View>
    
    <View className="items-center w-1/4">
      <Text className="text-white font-spotifymixui text-3xl">{userData?.totalLikesCount}</Text>
      <Text className="text-white font-xl font-spotifymixuititle">Likes</Text>
    </View>
    
    <View className="items-center w-1/4">
      {userData?.moreAccessible ? (
        <TouchableOpacity onPress={() => console.log('Connections Pressed')} className="items-center">
          <Text className="text-white font-spotifymixui text-3xl">{userData?.connectionsCount}</Text>
          <Text className="text-white font-xl font-spotifymixuititle">Connections</Text>
        </TouchableOpacity>
      ) : (
        <View className="items-center">
          <Text className="text-white font-spotifymixui text-3xl">{userData?.connectionsCount}</Text>
          <Text className="text-white font-xl font-spotifymixuititle">Connections</Text>
        </View>
      )}
    </View>
  </View>

    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => router.push("/my-posts")}
      className="p-2 w-full h-[48px] bg-[#131313]"
    >
      <Text className="text-white text-2xl text-center font-spotifymixuititleextrabold">
        Posts
      </Text>
    </TouchableOpacity>
    
    {userData?.moreAccessible ? (
      <FlatList
        ref={postsListRef}
        data={userPosts}
        keyExtractor={(item) => item.postId}
        renderItem={renderPost}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingHorizontal: 4, paddingTop: 6, paddingBottom: 6}}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => postsListRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0.5 }), 180);
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#f22fb1"]} progressBackgroundColor="black"/>}
        ListEmptyComponent={
          <View className="items-center justify-center mt-[50%]">
            <EmptyPosts />
          </View>
        }
      />
    ) : (
      <EmptyPosts />
    )}
    {isFocused && isModalVisible && (
      <ProfilePictureModal
        showButtons={(userData?.username === user?.username)}
        userName={userData?.username}
        isVisible={isFocused && isModalVisible}
        onClose={() => setModalVisible(false)}
        onRefresh={handleRefresh}
      />
    )}
    <Modal
      transparent
      visible={isFocused && !!previewPost}
      animationType="fade"
      onRequestClose={() => setPreviewPost(null)}
    >
      <TouchableWithoutFeedback onPress={() => setPreviewPost(null)}>
        <View className="flex-1 justify-center bg-black/75 px-1">
          <TouchableWithoutFeedback onPress={() => {}}>
            <View>
              {previewPost && (
                <PostTile
                  post={postForTile(previewPost)}
                  background="bg-[#050505]"
                  title_color="text-secondary-300"
                  border_color="border-[#777777]/5"
                  showOptions={false}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
    <CustomModal
      title="Post options"
      isVisible={isFocused && !!postAction}
      onClose={() => setPostAction(null)}
      buttons={[
        { title: actionLoading === "archive" ? "Archiving" : "Archive", disabled: !!actionLoading, onPress: () => archivePost(postAction) },
        { title: "Edit", onPress: () => openEditPost(postAction) },
        { title: "Delete", disabled: !!actionLoading, onPress: () => openDeleteConfirm(postAction), danger: true },
      ]}
    />
    <CustomModal
      title="Delete post?"
      isVisible={isFocused && !!deleteAction}
      onClose={closeDeleteConfirm}
      closeTitle="Cancel"
      buttons={[
        { title: actionLoading === "archive" ? "Archiving" : "Archive", disabled: !!actionLoading, onPress: () => archivePost(deleteAction) },
        { title: actionLoading === "delete" ? "Deleting" : "Delete", disabled: !!actionLoading, onPress: () => deletePost(deleteAction), danger: true },
      ]}
    />
  </View>
  );
};

export const UserScreenOptions = ({ navigation }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { user } = useGlobalContext();
  const handleSearch = () => {
    if (searchText) {
      navigation.setParams({ searchText });
      console.log(searchText)
    }
  };
  const handleBack = () => {
    setSearchText("");
    navigation.setParams({ searchText: ""});
    setIsSearching(false);
  };
  return {
    headerTitle: () =>
      isSearching ? (
        <View className="flex-row items-center">
          <LineEdit
            value={searchText}
            placeholder="Search All Users"
            handleChangeText={setSearchText}
            disabled={false}
            icon={icons.search}
            keyboardType={undefined}
            autoCapitalize='none'
            onButtonPress={handleSearch}
          />
        </View>
      ) : (
        <View className="flex-row items-center">
          <Image
            source={icons.user}
            className="w-6 h-6 mr-2"
            style={{ tintColor: "#f33eb7" }}
          />
          <Text className="text-secondary text-2xl font-spotifymixuititle">
          {user ? user.username : 'User'}
          </Text>
        </View>
      ),
    headerStyle: {
      backgroundColor: "#050505",
    },
    headerRight: () =>
      isSearching ? null : (
        <View className="flex-row gap-8 mr-4">
          <TouchableOpacity onPress={() => setIsSearching(true)}>
            <Image
              source={icons.search}
              className="w-6 h-6"
              style={{ tintColor: "#f33eb7" }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("moreuseroptions")}>
            <Image
              source={icons.menu}
              className="w-6 h-6"
              style={{ tintColor: "#f33eb7" }}
            />
          </TouchableOpacity>
        </View>
      ),
    headerLeft: () =>
      isSearching ? (
        <TouchableOpacity onPress={handleBack}>
          <Image
            source={icons.leftArrow}
            className="w-6 h-6 ml-4"
            style={{ tintColor: "#f33eb7" }}
          />
        </TouchableOpacity>
      ) : null,
  };
};

export default User;
