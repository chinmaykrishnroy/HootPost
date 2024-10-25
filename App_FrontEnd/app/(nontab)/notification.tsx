import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import EmptyState from "../../components/EmptyState";
import { images, icons } from "../../constants";

const NotificationScreen = () => {
  const navigation = useNavigation();

  return (
    <View className="flex-1 justify-center items-center bg-secondary">
      <Text className="text-white font-spotifymixui text-2xl mt-30">View Screen</Text>
      <EmptyState
        title="Where did Owls go?"
        subtitle="Maybe to deliver the letters from the Hogwarts!"
        icon={images.icon}
        onButtonPress={() => navigation.goBack()} 
        tintColor={undefined}
        buttonText={undefined}
        background="w-80"
      />
    </View>
  );
};

export default NotificationScreen;
