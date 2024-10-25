import { TouchableOpacity, Text } from "react-native";
import React from "react";

const CustomButton = ({
  title,
  handlePress,
  containerStyles,
  textStyles,
  isLoading,
  disabled=false,
  background
}) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      className={`${background? background : "bg-secondary" } rounded-xl min-h-[62px] 
        justify-center items-center 
        ${containerStyles} 
        ${isLoading || disabled? "opacity-70" : ""}`}
      disabled={isLoading || disabled}
    >
      <Text
        className={`text-black font-spotifymixuititle text-lg ${textStyles}`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default CustomButton;
