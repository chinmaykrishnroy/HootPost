import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator
} from "react-native";
import { Image } from "expo-image";
import { images, icons } from "@/constants";
import BASE_URL from "../config.js";
import CustomButton from "./CustomButton";
import { useGlobalContext } from "@/context/GlobalProvider";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const UserModal = ({ userId, isVisible, onClose }) => {
  const { user: globalUser } = useGlobalContext();
  const [userData, setUserData] = useState(null);
  const { width } = Dimensions.get('window');
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [loadingBlock, setLoadingBlock] = useState(false);
  const [loadingDisconnect, setLoadingDisconnect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchUserData();
    }
  }, [isVisible]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/users/${userId}/load`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${""}`,
        },
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setUserData(data);
      } else {
        setUserData(null);
        onClose();
      }
    } catch (err) {
      setUserData(null);
      onClose();
    }
  };

  const handleConnect = async () => {
    setLoadingConnect(true);
    try {
      const response = await fetch(`${BASE_URL}/users/connect/${userData.username}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${""}`,
        },
        credentials: "include",
      });
      if (response.ok) {
        setUserData((prev) => ({ ...prev, hasRequested: true }));
      }
    } catch {}
    finally {
      setLoadingConnect(false);
    }
  };

  const handleBlock = async () => {
    setLoadingBlock(true);
    try {
      const response = await fetch(`${BASE_URL}/users/block/${userData.username}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${""}`,
        },
        credentials: "include",
      });
      if (response.ok) {
        setUserData((prev) => ({ ...prev, isBlocked: true }));
      }
    } catch {}
    finally {
      setLoadingBlock(false);
    }
  };

  const handleUnsendRequest = async () => {
    setLoadingConnect(true);
    try {
      const response = await fetch(`${BASE_URL}/users/unsend-request/${userData.username}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${""}`,
        },
        credentials: "include",
      });
      if (response.ok) {
        setUserData((prev) => ({ ...prev, hasRequested: false }));
      }
    } catch {}
    finally {
      setLoadingConnect(false);
    }
  };

  const handleDisconnect = async () => {
    setLoadingDisconnect(true);
    try {
      const response = await fetch(`${BASE_URL}/users/disconnect/${userData.username}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${""}`,
        },
        credentials: "include",
      });

      if (response.ok) {
        setUserData((prev) => ({
          ...prev,
          isConnected: false,
          isBlocked: false,
          hasRequested: false
        }));
      }
      else console.log(response)
    } catch {}
    finally {
      setLoadingDisconnect(false);
    }
  };

  if (!userData) {
    return (
      <Modal transparent={true} visible={isVisible} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60">
            <ActivityIndicator size="undefined" color="#f33eb7" />
          <TouchableOpacity onPress={onClose}>
            <Image
              source={icons.close}
              style={{ width: 30, height: 30, tintColor: '#f33eb7' }}
            />
          </ TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const connectButtonTitle = userData.isConnected ? "Connected" : userData.hasRequested ? "Requested" : "Connect";
  const connectButtonDisabled = userData.isBlocked || userData.isConnected;
  const blockButtonDisabled = loadingConnect || userData.isBlocked;

  return (
    <Modal transparent={true} visible={isVisible} animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-center items-center bg-black/60">
          <TouchableWithoutFeedback onPress={() => {}}>
            <View className="w-full mx-2 max-w-md p-2 bg-black2-200 rounded-3xl">
              <View className="flex-row justify-between items-center mb-2 ml-8">
                <Text className="text-pink-100 font-spotifymixuititle text-4xl mx-auto">
                  {userData.firstName} {userData.lastName}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Image
                    source={icons.close}
                    className="w-8 h-8"
                    style={{ tintColor: "#ff0000" }}
                  />
                </TouchableOpacity>
              </View>

              <View className="mb-2 overflow-hidden relative" style={{ width: width, height: width }}>
                {isLoading && !hasError && (
                  <View className="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center">
                    <ActivityIndicator 
                      size="small" 
                      color="#f33eb7"
                    />
                  </View>
                )}
                <Image
                  source={userData.profilePicture 
                    ? { uri: userData.profilePicture }
                    : images.owl
                  }
                  className={`w-full h-full aspect-square rounded-3xl ${hasError ? 'hidden' : 'flex'}`}
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
                    source={icons.sad}
                    style={{ aspectRatio: 1 }}
                    className="w-full rounded-lg" 
                  />
                )}
              </View>

              <View className="flex-row justify-between mt-0 mx-1">
                <Text
                  className={`${
                      userData.sex === "Male"
                      ? "text-blue-500"
                      : userData.sex === "Female"
                      ? "text-pink-500"
                      : "text-green-500"
                  } font-spotifymixblack text-xl`}
                >
                  @{userData.username}{" "}
                  {userData.sex === "Male"
                  ? "(he/him)"
                  : userData.sex === "Female"
                  ? "(she/her)"
                  : "(they/them)"}
                </Text>
                <Text className="text-pink-200 font-spotifymixui text-xs pt-1.5">Joined on {formatDate(userData.joined)}</Text>
              </View>
              
              <Text className="text-gray-300 font-spotifymixui text-lg text-center mb-2">{userData.bio}</Text>

              <View className="flex-row justify-around my-1 mx-2">
                {globalUser.username !== userData.username && (
                  <>
                    <CustomButton
                      title={connectButtonTitle}
                      handlePress={userData.isConnected ? null : userData.hasRequested ? handleUnsendRequest : handleConnect}
                      containerStyles={"w-1/2 mr-2"}
                      isLoading={loadingConnect}
                      disabled={connectButtonDisabled}
                    />
                    <CustomButton
                      title={userData.isBlocked ? "BLOCKED" : userData.isConnected ? "Disconnect" : "Block"}
                      handlePress={userData.isConnected ? handleDisconnect : handleBlock}
                      containerStyles={"w-1/2 ml-2"}
                      background={userData.isConnected ? "bg-pink-400" : "bg-red-600"}
                      isLoading={loadingBlock || loadingDisconnect}
                      disabled={loadingBlock || loadingDisconnect}
                    />
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default UserModal;
