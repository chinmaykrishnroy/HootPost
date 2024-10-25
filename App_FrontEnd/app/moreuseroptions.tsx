import { Image, Text, View, Alert, TouchableOpacity} from "react-native";
import React, { useState, useEffect } from "react";
import CustomButton from "../components/CustomButton";
import { useRouter } from "expo-router";
import BASE_URL from '../config.js';
import { icons } from '@/constants';
import { useGlobalContext } from "@/context/GlobalProvider";

const MoreUserOption = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { user, setUser } = useGlobalContext();
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
  return (
    <View className="flex-1 bg-[#050505] items-center justify-center">
      <Text className='text-primary-200 font-spotifymixui text-lg'>
        MoreOptions
      </Text>
      <CustomButton
      title="Logout"
      handlePress={handleLogout}
      containerStyles="mt-5 w-3/4 bg-primary-200 mx-auto"
      textStyles="text-white"
      isLoading={isLoading}
      />
    </View>
  );
};

export const MoreUserOptionOptions = ({ navigation }) => {
  return {
    headerTitle: () => (
      <View className="flex-row items-center">
        <Text className="text-secondary text-2xl font-spotifymixui">
          More Options
        </Text>
      </View>
    ),
    headerStyle: {
      backgroundColor: "#050405",
    },
    headerLeft: () => (
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Image
          source={icons.leftArrow}
          className="w-6 h-6 mr-4"
          style={{ tintColor: "#f33eb7" }}
        />
      </TouchableOpacity>
    ),
    headerRight: () => null,
    headerBackVisible: false,
  };
};

export default MoreUserOption;