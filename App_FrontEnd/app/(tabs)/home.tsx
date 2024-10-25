import {
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import React, { useEffect, useState, useLayoutEffect, useMemo } from "react";
import { icons, images } from "../../constants";
import { SafeAreaView } from "react-native-safe-area-context";
import LineEdit from "../../components/LineEdit";
import PostTile from "../../components/PostTile";
import UserTile from "../../components/UserTile";
import EmptyState from "@/components/EmptyState";
import BASE_URL from '../../config.js';
import { useNavigation } from "@react-navigation/native";
import CustomModal from "@/components/CustomModal";
import downloadPostImage from "@/services/downloadPost";
import { router } from "expo-router";
import EmptyUsers from "@/components/EmptyUsers";

const Home: React.FC = () => {
  const navigation = useNavigation();
  const [people, setPeople] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPeople, setLoadingPeople] = useState<boolean>(true);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>(""); // Unified search state
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [postsResponse, peopleResponse] = await Promise.all([
        fetch(`${BASE_URL}/posts/alll`, { method: 'GET', credentials: 'include' }),
        fetch(`${BASE_URL}/users/all`, { method: 'GET', credentials: 'include' }),
      ]);
      const postsData = await postsResponse.json();
      const peopleData = await peopleResponse.json();
      setPosts(postsData);
      setPeople(peopleData);
    } catch (error) {
      router.replace('/sign-in')
      setError(error);
    } finally {
      setLoadingPosts(false);
      setLoadingPeople(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
  };

  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => post.visible !== false)
      .filter((post) => {
        const captionMatch = post.caption.toLowerCase().includes(searchText.toLowerCase());
        const usernameMatch = post.username.toLowerCase().includes(searchText.toLowerCase());
        return captionMatch || usernameMatch;
      });
  }, [posts, searchText]);

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const usernameMatch = person.firstName.toLowerCase().includes(searchText.toLowerCase());
      return usernameMatch;
    });
  }, [people, searchText]);

  useLayoutEffect(() => {
    navigation.setOptions(
      HomeScreenOptions({
        navigation,
        searchText,
        handleSearch,
        isSearching,
        setIsSearching,
        setSearchText,
      })
    );
  }, [navigation, searchText, isSearching]);

  const renderPerson = ({ item }: { item: any }) => (
    <UserTile 
      user={item} 
      borderWidth={2}
      borderColor={"#0e0c0b"}
    />
  );

  const renderPost = ({ item }: { item: any }) => (
    <PostTile 
      post={item}
      background={"bg-[#050505]"}
      title_color={"text-secondary-300"}
      border_color={"border-[#777777]/5"}
      tint_color="#f33eb7"
      onDotButtonPress={() => openModal(item.postId)}
    />
  );

  const openModal = (postId: string) => {
    setSelectedPostId(postId);
    setModalVisible(true);
  };

  const hidePost = () => {
    if (selectedPostId) {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.postId === selectedPostId ? { ...post, visible: false } : post
        )
      );
    }
    setModalVisible(false);
  };

  const downloadPost = (postId: string | null) => {
    downloadPostImage(postId);
    setModalVisible(false);
  };

  const emptyPost = () => (
    <View style={{ marginTop: '38%' }}>
      <EmptyState
        title="Where did the Owls go?"
        subtitle="Maybe off to deliver letters from Hogwarts!"
        icon={images.icon}
        onButtonPress={() => router.push('/upload')}
        tintColor={undefined}
        buttonText={undefined}
      />
    </View>
  );

  const emptyUser = () => (
    <View>
      <EmptyUsers />
    </View>
  );

  if (loadingPeople || loadingPosts) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} className="bg-black2-200">
        <ActivityIndicator size="undefined" color="#f22fb1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>Error fetching data. Please try again later.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={[]} className="bg-black2-200 flex-1 p-0">
      <View className="py-0.5 rounded-xl mx-0.5">
        <FlatList
          horizontal
          data={filteredPeople} // Apply filtering to people list
          renderItem={renderPerson}
          keyExtractor={(item) => item._id.toString()}
          // keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
          getItemLayout={(data, index) => ({ length: 72, offset: 72 * index, index })}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 0 }}
          ItemSeparatorComponent={() => <View style={{ width: 2 }} />}
          ListEmptyComponent={emptyUser}
          
        />
      </View>
      <View className="mb-14">
        <FlatList
          data={filteredPosts} // Use filtered posts here
          renderItem={renderPost}
          keyExtractor={(item) => item.postId.toString()}
          // keyExtractor={(item, index) => item.postId ? item.postId.toString() : index.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={emptyPost}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#f22fb1"]} progressBackgroundColor="black"/>}
        />
      </View>

      <CustomModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        buttons={[
          { title: "Hide", onPress: () => hidePost() },
          { title: "Download", onPress: () => downloadPost(selectedPostId) },
        ]}
        containerStyle={{
          borderWidth: 2,
          borderColor: "lightgray",
        }}
      />
    </SafeAreaView>
  );
};

export const HomeScreenOptions = ({
  navigation,
  searchText,
  handleSearch,
  isSearching,
  setIsSearching,
  setSearchText,
}: {
  navigation: any;
  searchText: string;
  handleSearch: (text: string) => void;
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
}) => {
  return {
    headerTitle: () =>
      isSearching ? (
        <View className="flex-row items-center">
          <LineEdit
            value={searchText}
            placeholder="Search Your Feed..."
            handleChangeText={handleSearch}
            icon={icons.search}
            keyboardType="default"
            autoCapitalize="none"
            disabled = {true}
          />
        </View>
      ) : (
        <View className="flex-row items-center">
          <Image source={images.icon} style={{ width: 36, height: 36, marginRight: 8 }} />
          <Text className="text-secondary text-4xl font-spotifymixuititleextrabold">Hoot<Text className=" text-primary-200">Post</Text></Text>
        </View>
      ),
    headerStyle: {
      backgroundColor: "#050405",
    },
    headerRight: () =>
      isSearching ? null : (
        <View className="flex-row gap-8 mr-4">
          <TouchableOpacity onPress={() => {console.log("Notification Pressed"); navigation.navigate("notification")}}>
            <Image source={icons.bell} style={{ width: 24, height: 24, tintColor: "#f33eb7" }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSearching(true)}>
            <Image source={icons.search} style={{ width: 24, height: 24, tintColor: "#f33eb7" }} />
          </TouchableOpacity>
        </View>
      ),
    headerLeft: () =>
      isSearching ? (
        <TouchableOpacity onPress={() => {setIsSearching(false); setSearchText("");}}>
          <Image source={icons.leftArrow} style={{ width: 24, height: 24, marginLeft: 16, tintColor: "#f33eb7" }} />
        </TouchableOpacity>
      ) : null,
  };
};

export default Home;
