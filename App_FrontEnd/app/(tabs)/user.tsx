import { Image, Text, View, Alert, TouchableOpacity, FlatList, Linking, RefreshControl } from "react-native";
import React, { useState, useEffect } from "react";
import CustomButton from "../../components/CustomButton";
import { useRouter } from "expo-router";
import { useRoute } from "@react-navigation/native"; 
import BASE_URL from '../../config.js';
import { icons, images } from '@/constants';
import { useGlobalContext } from "@/context/GlobalProvider";
import EmptyPosts from '@/components/EmptyPosts';
import LineEdit from "@/components/LineEdit";
import ProfilePictureModal from "@/components/ProfilePictureModal";

const User = () => {
  const route = useRoute();
  const { searchText: routeSearchText } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const { user, setUser } = useGlobalContext();
  const [userData, setUserData] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

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
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const renderPost = ({ item }) => (
    <View className="relative flex-1 m-1">
      <TouchableOpacity
      onPress={() => console.log("Post pressed")}
    >
      <Image
        source={{ uri: item.image }}
        className="w-full h-48 rounded-3xl"
      />
    </TouchableOpacity>
      <TouchableOpacity
        className="absolute right-1 top-1"
        onPress={() => console.log("Link icon pressed")}
      >
        <View className="w-10 h-10">
        <Image source={icons.dots} className="w-8 h-8 opacity-80 ml-4 mt-1" style={{ tintColor: "#454545" }}/>
        </View>
      </TouchableOpacity>
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
        <>
          <Text className="text-white font-spotifymixui text-3xl">{userData?.connectionRequestsCount}</Text>
          <Text className="text-white font-xl font-spotifymixuititle">Requests</Text>
        </>
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
        <>
          <Text className="text-white font-spotifymixui text-3xl">{userData?.connectionsCount}</Text>
          <Text className="text-white font-xl font-spotifymixuititle">Connections</Text>
        </>
      )}
    </View>
  </View>

    <View className="p-2 w-full h-[48px] bg-[#131313]">
      <Text className="text-white text-2xl text-center font-spotifymixuititleextrabold">
        Posts
      </Text>
    </View>
    
    {userData?.moreAccessible ? (
      <FlatList
        data={userData?.posts}
        keyExtractor={(item) => item.postId}
        renderItem={renderPost}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingHorizontal: 4, paddingTop: 6, paddingBottom: 6}}
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
    {isModalVisible && (
      <ProfilePictureModal
        showButtons={(userData?.username === user?.username)}
        userName={userData?.username}
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onRefresh={handleRefresh}
      />
    )}
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
