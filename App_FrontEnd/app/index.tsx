import { ScrollView, Text, View, Image } from "react-native";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../constants";
import CustomButton from "../components/CustomButton";
import { useGlobalContext } from "@/context/GlobalProvider";


export default function App() {
  const {isLoading, isLoggedIn } = useGlobalContext();
  if (!isLoading && isLoggedIn) return <Redirect href={"/(tabs)/home"}/>

  return (
    <SafeAreaView className=" bg-black-200 h-full">
      <ScrollView contentContainerStyle={{ height: "100%" }} keyboardShouldPersistTaps="handled">
        <View className=" bg-black-200 w-full min-h-[90vh] justify-center items-center px-4">
          {/* <View className="flex-1 justify-center items-center px-4"> */}
          <View className="flex-row items-center mb-2 mr-4">
            <Image source={images.icon} className="w-32 h-32" />
            <View>
              <Text className="text-secondary-300 text-5xl font-spotifymixui">
                Welcome to
              </Text>
              <Text className="text-secondary text-6xl font-spotifymixuititle">Hoot<Text className="text-primary-200">Post</Text></Text>
            </View>
          </View>
          <View>
            <Text className="text-lg text-secondary-300 font-spotifymixui">
              The <Text className="text-secondary">Hoot</Text><Text className="text-primary-200">Post</Text> is
              Great for Social Owls!
            </Text>
          </View>
          <CustomButton
            title="Continue with Username or Email"
            handlePress={() => {
              router.push("/sign-in");
            } }
            containerStyles="w-full mt-12" textStyles={undefined} isLoading={undefined} background={undefined}          />
        </View>
      </ScrollView>
      <StatusBar backgroundColor="#050405" style="light" />
    </SafeAreaView>
  );
}