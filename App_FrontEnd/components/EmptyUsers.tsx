import { icons } from "@/constants";
import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";

const EmptyUsers = ({
    borderWidth = 0,
    borderColor = "#f00ea5",
    textColor = "white",
  }) => {
    return (
      <View
        style={{
          position: "relative",
          width: 72,
          height: 72,
          marginHorizontal: 0,
          borderRadius: 16,
          overflow: "hidden",
          borderWidth: borderWidth,
          borderColor: borderColor,
        }}
      >
        <TouchableOpacity
          onPress={() => {
              console.log(`{User Tile pressed for user empty users list}`);
          }}
        >
          <Image
          source={icons.sad}
          className="w-full h-full" 
          />
        </TouchableOpacity>
  
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: 0,
          }}
        >
          <Text
            style={{
              color: textColor,
              textAlign: "center",
              fontSize: 12,
              fontWeight: "600",
              overflow: "hidden",
            }}
          >
            No Users
          </Text>
        </View>
      </View>
    );
  };
  
  export default EmptyUsers;
  