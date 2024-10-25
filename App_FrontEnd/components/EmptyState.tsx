import React from "react";
import { View, Text, Image } from "react-native";
import CustomButton from "./CustomButton";

const EmptyState = ({ title, icon, subtitle, tintColor, buttonText, onButtonPress, background="bg-pink-200", border="border-1" }) => {
  return (
    <View className={`flex-1 justify-center items-center px-4 ${background} ${border} border-black2-200 m-2 rounded-2xl p-2`}>
      <Image
        source={icon}
        className="w-48 h-24 mb-4"
        style={{ tintColor }}
      />
      <Text className="text-3xl text-black font-spotifymixui mt-0">
        {title}
      </Text>
      <Text className=" text-pink-900 font-spotifymixui mt-0 mb-4">
        {subtitle}
      </Text>
      <CustomButton
        title={buttonText || "Create a Post"}
        handlePress={onButtonPress}
        containerStyles="border-2 border-black-200 w-full"
        background={"bg-pink-400"}
      />
    </View>
  );
};

export default EmptyState;
