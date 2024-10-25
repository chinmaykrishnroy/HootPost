import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert
} from "react-native";
import { Image } from "expo-image";
import { images, icons } from "@/constants";
import BASE_URL from "../config.js";
import CustomButton from "./CustomButton";
import { useGlobalContext } from "@/context/GlobalProvider";
import openMediaPicker from "@/lib/imagepicker.js";

const ProfilePictureModal = ({ showButtons, isVisible, onClose, userName, onRefresh }) => {
  const { user } = useGlobalContext();
  const [profilePicture, setProfilePicture] = useState(null);
  const { width } = Dimensions.get('window');
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchProfilePicture();
    }
  }, [isVisible]);

  const fetchProfilePicture = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/${userName}/profilePicture`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${""}`,
        },
        credentials: "include",
      });
      let data;
      if (response.ok) {
        try {
          data = await response.json();
          setProfilePicture(data);
          setIsLoading(false);
        } catch (error) {
          console.log('Profile picture doesnt exist!')
          setProfilePicture(images.icon);
        }
      } else {
        setProfilePicture(icons.sad);
      }
    } catch (err) {
      setProfilePicture(icons.sad);
      Alert.alert('Error fetching profile picture.');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadProfilePicture = async (image) => {
    setIsButtonLoading(true);
    const formData = new FormData();
    const originalFormat = image.uri.split('.').pop();
    formData.append('profilePicture', {
      uri: image.uri,
      name: `profile_picture_${Date.now()}.${originalFormat}`,
      type: image.mimeType,
    });
    try {
      const response = await fetch(`${BASE_URL}/users/uploadProfilePicture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        credentials: 'include',
        body: formData,
      });
      if (response.ok) {
        fetchProfilePicture()
        onRefresh();
      } else {
        Alert.alert(response.toString());
      }
    } catch (err) {
      console.log(err);
    } finally {
      setIsButtonLoading(false);
    }
  };

  const deleteProfilePicture = async () => {
    setIsButtonLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users/deleteProfilePicture`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${""}`,
        },
        credentials: "include",
      });
      if (response.ok) {
        if (response.status === 200){ onRefresh(); }
        setProfilePicture(images.icon);
      } else {
        Alert.alert('Failed to delete profile picture.');
      }
    } catch (err) {
      Alert.alert('Error deleting profile picture.');
    } finally {
      setIsButtonLoading(false);
    }
  };

  const handleSelectImage = async () => {
    openMediaPicker(async (image) => {
      await uploadProfilePicture(image);
    });
  };

  if (!profilePicture) {
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

  return (
<Modal transparent={true} visible={isVisible} animationType="fade">
<TouchableWithoutFeedback onPress={onClose}>
    <View className="flex-1 justify-center items-center bg-black/50">
    <TouchableWithoutFeedback onPress={() => {}}>
        <View className="w-full bg-black/60 rounded-3xl relative">
        {/* Close button */}
        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', right: 10, top: 10, zIndex: 1 }}>
            <Image
            source={icons.close}
            className="w-8 h-8"
            style={{ tintColor: "#ff0000" }}
            />
        </TouchableOpacity>

        {/* Profile Picture */}
        <View className="overflow-hidden relative" style={{ width: width, height: width }}>
            {isLoading && (
            <View className="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center">
                <ActivityIndicator size="large" color="#f33eb7" />
            </View>
            )}
            <Image
            source={profilePicture.profilePicture ? { uri: profilePicture.profilePicture } : profilePicture}
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
        <View className="flex-row justify-around my-1 mx-2">
            {showButtons && (
            <>
                <CustomButton
                title={'Upload'}
                handlePress={handleSelectImage}
                containerStyles={"w-1/2 mr-2"}
                isLoading={isButtonLoading}
                disabled={isButtonLoading}
                />
                <CustomButton
                title={'Delete'}
                handlePress={deleteProfilePicture}
                containerStyles={"w-1/2 ml-2"}
                background={"bg-red-600"}
                isLoading={isButtonLoading}
                disabled={isButtonLoading}
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

export default ProfilePictureModal;
