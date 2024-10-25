import React, { useState } from "react";
import { Text, View, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { icons, images } from "../../constants";
import LineEdit from "@/components/LineEdit";

const Chat = () => {
  return (
    <View className="flex-1 justify-center items-center bg-[#050505]">
      <Text className="text-secondary font-spotifymixui">Chat</Text>
    </View>
  );
};

export const ChatScreenOptions = ({ navigation }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");

  return {
    headerTitle: () =>
      isSearching ? (
        <View className="flex-row items-center">
          <LineEdit
            value={searchText}
            placeholder="Search Chats"
            handleChangeText={setSearchText}
            disabled={true}
            icon={icons.search}
            keyboardType={undefined}
            autoCapitalize={undefined}
          />
        </View>
      ) : (
        <View className="flex-row items-center">
          <Image
            source={icons.rocket}
            className="w-6 h-6 mr-2"
            style={{ tintColor: "#f33eb7" }}
          />
          <Text className="text-secondary text-2xl font-spotifymixuititle">
            Chats
          </Text>
        </View>
      ),
    headerStyle: {
      backgroundColor: "#050505",
    },
    headerRight: () =>
      isSearching ? null : (
        <View className="flex-row gap-8 mr-4">
          <TouchableOpacity onPress={() => navigation.navigate("navigation")}>
            <Image
              source={icons.view}
              className="w-6 h-6"
              style={{ tintColor: "#f33eb7" }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSearching(true)}>
            <Image
              source={icons.search}
              className="w-6 h-6"
              style={{ tintColor: "#f33eb7" }}
            />
          </TouchableOpacity>
        </View>
      ),
    headerLeft: () =>
      isSearching ? (
        <TouchableOpacity onPress={() => setIsSearching(false)}>
          <Image
            source={icons.leftArrow}
            className="w-6 h-6 ml-4"
            style={{ tintColor: "#f33eb7" }}
          />
        </TouchableOpacity>
      ) : null,
  };
};

export default Chat;
