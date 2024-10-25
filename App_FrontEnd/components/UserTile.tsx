import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Dimensions, ActivityIndicator } from "react-native";
import { images, icons } from "@/constants";
import { Image } from "expo-image";
import UserModal from "./UserModal";

const UserTile = ({ user, borderStyle = "", textColor = "white" }) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handlePress = () => {
    setModalVisible(true);
  };

  return (
    <View
      style={{
        position: "relative",
        width: 72,
        height: 72,
        marginHorizontal: 0,
        borderRadius: user.who==='u'? 36 : 16,
        overflow: "hidden",
      }}
      className={`${user.who==='u'? "border-4 border-primary" 
        : user.who==='c'? "border-2 border-pink-400" : borderStyle} `}
    >
      <TouchableOpacity onPress={handlePress}>
        <View>
          {isLoading && !hasError && (
            <View className="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center">
              <ActivityIndicator 
                size="small" 
                color="#f33eb7"
              />
            </View>
          )}
          <Image
            source={user.profilePicture 
              ? { uri: user.profilePicture }
              : images.ghost
            }
            className={`w-full h-full aspect-square ${hasError ? 'hidden' : 'flex'}`}
            contentFit="cover"
            onLoadStart={() => {
              setIsLoading(true); 
              setHasError(false);
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false); 
              setHasError(true);
            }}
          />
          {hasError && (
            <Image 
              source={icons.user}
              style={{ aspectRatio: 1, tintColor: '#656565'}}
              className="w-full" 
            />
          )}
        </View>
      </TouchableOpacity>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
        <Text style={{ color: textColor, textAlign: "center", fontSize: 12, fontWeight: "600" }}>
          {user.firstName.length > 10 ? `${user.firstName.slice(0, 10)}...` : user.firstName}
        </Text>
      </View>

      {isModalVisible && (
        <UserModal
          userId={user._id}
          isVisible={isModalVisible}
          onClose={() => setModalVisible(false)}
        />
      )}
    </View>
  );
};

export default UserTile;
