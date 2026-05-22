import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert
} from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Image } from "expo-image";
import { images, icons } from "@/constants";
import BASE_URL from "../config.js";
import ModalActionButton from "./ModalActionButton";
import openMediaPicker from "@/lib/imagepicker.js";

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const clampWorklet = (value, min, max) => {
  'worklet';
  return Math.max(min, Math.min(value, max));
};

const coverFrameForImage = (image, size) => {
  const width = image?.width || size;
  const height = image?.height || size;
  const coverScale = Math.max(size / width, size / height);
  return {
    width: width * coverScale,
    height: height * coverScale,
  };
};

const clampCrop = (image, crop, size) => {
  const scale = clamp(crop.scale || 1, 1, 4);
  const frame = coverFrameForImage(image, size);
  const maxX = Math.max(0, (frame.width * scale - size) / 2);
  const maxY = Math.max(0, (frame.height * scale - size) / 2);
  return {
    x: clamp(crop.x || 0, -maxX, maxX),
    y: clamp(crop.y || 0, -maxY, maxY),
    scale,
  };
};

const ProfileCropper = ({ image, size, crop, onCropChange }) => {
  const frame = coverFrameForImage(image, size);
  const translateX = useSharedValue(crop.x || 0);
  const translateY = useSharedValue(crop.y || 0);
  const scale = useSharedValue(crop.scale || 1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  const commitCrop = (nextCrop) => onCropChange(clampCrop(image, nextCrop, size));

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxX = Math.max(0, (frame.width * scale.value - size) / 2);
      const maxY = Math.max(0, (frame.height * scale.value - size) / 2);
      translateX.value = clampWorklet(startX.value + event.translationX, -maxX, maxX);
      translateY.value = clampWorklet(startY.value + event.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      runOnJS(commitCrop)({ x: translateX.value, y: translateY.value, scale: scale.value });
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = clampWorklet(startScale.value * event.scale, 1, 4);
      const maxX = Math.max(0, (frame.width * nextScale - size) / 2);
      const maxY = Math.max(0, (frame.height * nextScale - size) / 2);
      scale.value = nextScale;
      translateX.value = clampWorklet(translateX.value, -maxX, maxX);
      translateY.value = clampWorklet(translateY.value, -maxY, maxY);
    })
    .onEnd(() => {
      runOnJS(commitCrop)({ x: translateX.value, y: translateY.value, scale: scale.value });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View className="overflow-hidden bg-black" style={{ width: size, height: size }}>
      <GestureDetector gesture={Gesture.Simultaneous(panGesture, pinchGesture)}>
        <Animated.Image
          source={{ uri: image.uri }}
          style={[{ width: frame.width, height: frame.height }, animatedStyle]}
          resizeMode="cover"
        />
      </GestureDetector>
      <View pointerEvents="none" className="absolute inset-0 border-2 border-primary-200 rounded-lg">
        <View className="absolute left-1/3 top-0 bottom-0 border-l border-white/25" />
        <View className="absolute left-2/3 top-0 bottom-0 border-l border-white/25" />
        <View className="absolute top-1/3 left-0 right-0 border-t border-white/25" />
        <View className="absolute top-2/3 left-0 right-0 border-t border-white/25" />
      </View>
    </View>
  );
};

const ProfilePictureModal = ({ showButtons, isVisible, onClose, userName, onRefresh }) => {
  const [profilePicture, setProfilePicture] = useState(null);
  const { width } = Dimensions.get('window');
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingCrop, setPendingCrop] = useState({ x: 0, y: 0, scale: 1 });
  const modalWidth = Math.min(width - 24, 420);
  const mediaSize = modalWidth - 24;
  const cropSize = modalWidth - 24;

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

  const uploadProfilePicture = async (image, crop = { x: 0, y: 0, scale: 1 }) => {
    setIsButtonLoading(true);
    const formData = new FormData();
    const originalFormat = image.fileName?.split('.').pop() || image.uri.split('.').pop() || 'jpg';
    formData.append('profilePicture', {
      uri: image.uri,
      name: `profile_picture_${Date.now()}.${originalFormat}`,
      type: image.mimeType || 'image/jpeg',
    });
    formData.append('crop[x]', String(crop.x || 0));
    formData.append('crop[y]', String(crop.y || 0));
    formData.append('crop[scale]', String(crop.scale || 1));
    formData.append('crop[displaySize]', String(cropSize));
    formData.append('crop[sourceWidth]', String(image.width || cropSize));
    formData.append('crop[sourceHeight]', String(image.height || cropSize));
    try {
      const response = await fetch(`${BASE_URL}/users/uploadProfilePicture`, {
        method: 'POST',
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
    openMediaPicker((image) => {
      setPendingImage(image);
      setPendingCrop({ x: 0, y: 0, scale: 1 });
    });
  };

  const confirmProfileCrop = async () => {
    if (!pendingImage) return;
    await uploadProfilePicture(pendingImage, pendingCrop);
    setPendingImage(null);
  };

  if (!profilePicture) {
    return (
      <Modal transparent={true} visible={isVisible} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60">
            <ActivityIndicator size="large" color="#f33eb7" />
          <TouchableOpacity onPress={onClose}>
            <Image
              source={icons.close}
              style={{ width: 30, height: 30, tintColor: '#f33eb7' }}
            />
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent={true} visible={isVisible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/75 px-3">
        <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={pendingImage ? undefined : onClose} />
        {pendingImage ? (
          <View className="bg-[#111] rounded-xl border border-[#333] p-4" style={{ width: modalWidth }}>
            <Text className="text-secondary-300 text-2xl font-spotifymixuititleextrabold mb-3 px-1">Profile Photo</Text>
            <ProfileCropper
              image={pendingImage}
              size={cropSize}
              crop={pendingCrop}
              onCropChange={setPendingCrop}
            />
            <Text className="text-gray-400 font-spotifymixui my-3 px-1">Pinch and drag to frame your profile photo.</Text>
            <View className="flex-row gap-3 px-1">
              <ModalActionButton
                title="Cancel"
                variant="secondary"
                disabled={isButtonLoading}
                onPress={() => setPendingImage(null)}
              />
              <ModalActionButton
                title={isButtonLoading ? 'Uploading' : 'Upload'}
                disabled={isButtonLoading}
                onPress={confirmProfileCrop}
              />
            </View>
          </View>
        ) : (
          <View className="bg-black/80 rounded-3xl relative overflow-hidden p-3" style={{ width: modalWidth }}>
            <TouchableOpacity onPress={onClose} style={{ position: 'absolute', right: 10, top: 10, zIndex: 1 }}>
              <Image source={icons.close} className="w-8 h-8" style={{ tintColor: "#ff0000" }} />
            </TouchableOpacity>

            <View className="overflow-hidden relative self-center" style={{ width: mediaSize, height: mediaSize }}>
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
                <Image source={icons.sad} style={{ aspectRatio: 1 }} className="w-full rounded-lg" />
              )}
            </View>
            {showButtons && (
              <View className="flex-row gap-3 pt-3">
                <ModalActionButton
                  title="Upload"
                  disabled={isButtonLoading}
                  onPress={handleSelectImage}
                />
                <ModalActionButton
                  title="Delete"
                  danger
                  disabled={isButtonLoading}
                  onPress={deleteProfilePicture}
                />
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

export default ProfilePictureModal;
