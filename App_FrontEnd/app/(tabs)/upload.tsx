import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, TouchableOpacity, ScrollView, FlatList, Dimensions, Alert, Image } from 'react-native';
// import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync } from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { PinchGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import { icons } from '@/constants';
import BASE_URL from '../../config.js';
import { uploadImage } from '../../lib/uploadPost.js'
import openMediaPicker from '../../lib/imagepicker.js'

const screenWidth = Dimensions.get('window').width;
const aspectRatios = {
  '1:1': 1,
  '4:5': 5 / 4,
  '3:4': 8 / 5,
};

const Upload = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [recentImages, setRecentImages] = useState([]);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);
  const [originX, setOriginX] = useState(0);
  const [originY, setOriginY] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(aspectRatios['1:1']);
  const navigation = useNavigation();

  const handleMediaSelected = async (media: any) => {
    console.log('Selected media:', media);
    const result = await uploadImage({ imageFile: media });
    if (result === true) {
      Alert.alert('Success', 'Image uploaded successfully');
    } else {
      Alert.alert('Error', result.message || 'Image upload failed');
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => openMediaPicker(handleMediaSelected)}>
            <Image
              source={icons.upload}
              className="w-6 h-6 mr-4"
              style={{ tintColor: '#f33eb7' }}
            />
          </TouchableOpacity>
          <Text className="text-secondary text-2xl font-spotifymixuititle">New Post</Text>
        </View>
      ),
      headerStyle: {
        backgroundColor: '#050505',
      },
      headerRight: () => (
        <View className="flex-row gap-8 mr-4">
          <TouchableOpacity onPress={() => {
            console.log(`Scale: ${scale}, Aspect Ratio: ${aspectRatio}, OriginX: ${originX}, OriginY: ${originY}, Selected Image: ${selectedImage}`);
            handleNextClick();
          }}>
            <Text className="text-primary-200 text-2xl font-spotifymixuititleextrabold">Next</Text>
          </TouchableOpacity>
        </View>
      ),
      headerLeft: () => null,
    });
  }, [navigation, scale, aspectRatio, selectedImage]);

  const handleNextClick = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image to upload');
      return;
    }

    const result = await uploadImage({
      scale,
      aspectRatio,
      selectedImage,
    });

    if (result === true) {
      Alert.alert('Success', 'Image uploaded successfully');
    } else {
      Alert.alert('Error', result.message || 'Image upload failed');
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') loadRecentImages();
    })();
  }, [page]);

  const loadRecentImages = async () => {
    const media = await MediaLibrary.getAssetsAsync({
      first: 20 * page,
      mediaType: ['photo'],
      sortBy: ['creationTime'],
    });
    setRecentImages((prevImages) => [
      ...prevImages,
      ...media.assets.filter((item, index, arr) => arr.findIndex(i => i.id === item.id) === index),
    ]);
    if (media.assets.length > 0 && page === 1 && !selectedImage) setSelectedImage(media.assets[0].uri);
  };

  const loadMoreImages = () => setPage((prevPage) => prevPage + 1);

  const openGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const handlePinchGesture = useCallback(({ nativeEvent }) => {
    let newScale = lastScale * nativeEvent.scale;
    if (newScale < 1) newScale = 1;
    setScale(newScale);
  }, [lastScale]);

  const handlePinchGestureEnd = useCallback(() => {setLastScale(scale);
    if (selectedImage) {
      Image.getSize(selectedImage, (width, height) => {
        const newWidth = Math.floor(width / scale);
        const newHeight = Math.floor(newWidth * aspectRatio);
        const calculatedOriginX = Math.floor((width - newWidth) / 2);
        const calculatedOriginY = Math.floor((height - newHeight) / 2);
        
        setOriginX(Math.max(0, Math.min(calculatedOriginX, width - newWidth)));
        setOriginY(Math.max(0, Math.min(calculatedOriginY, height - newHeight)));
      });
    }
  }, [scale]);

  

  const calculateImageSize = useCallback((imageWidth, imageHeight, previewWidth, previewHeight) => {
    const imageAspectRatio = imageWidth / imageHeight;
    const previewAspectRatio = previewWidth / previewHeight;
    let width, height;
    if (imageAspectRatio > previewAspectRatio) {
      width = previewWidth;
      height = previewWidth / imageAspectRatio;
    } else {
      height = previewHeight;
      width = previewHeight * imageAspectRatio;
    }
    return { width, height };
  }, []);

  const RenderImageItem = React.memo(({ item, onPress, isSelected }) => (
    <TouchableOpacity onPress={onPress} key={item.id}>
      <Image
        source={{ uri: item.uri }}
        style={{
          width: screenWidth / 4 - 4,
          height: screenWidth / 4 - 4,
          margin: 2,
          borderRadius: 8,
          borderWidth: isSelected ? 4 : 0,
          borderColor: '#f33eb7',
        }}
      />
    </TouchableOpacity>
  ));

  const renderImageItem = useCallback(
    ({ item }) => (
      <RenderImageItem
        item={item}
        onPress={() => setSelectedImage(item.uri)}
        isSelected={item.uri === selectedImage}
      />
    ),
    [selectedImage]
  );

  return (
    <GestureHandlerRootView className="flex-1 bg-black">
      <View className="flex-1 bg-[#050505]">
        <View style={{ width: screenWidth, height: screenWidth * aspectRatio }}>
          {selectedImage ? (
            <PinchGestureHandler
              onGestureEvent={handlePinchGesture}
              onHandlerStateChange={handlePinchGestureEnd}
            >
              <Image
                source={{ uri: selectedImage }}
                style={{
                  ...calculateImageSize(screenWidth, screenWidth * aspectRatio, screenWidth, screenWidth * aspectRatio),
                  resizeMode: 'cover',
                  transform: [{ scale: scale }],
                }}
              />
            </PinchGestureHandler>
          ) : (
            <Text className="text-center justify-center text-[#f33eb7]">No Image Selected!</Text>
          )}
        </View>
        <View className="flex-row justify-between p-2 items-center bg-black">
          <TouchableOpacity onPress={openGallery}>
            <View className='bg-gray-800 rounded-md px-2'>
              <Text className="text-[#f33eb7] font-spotifymixuititle text-2xl">Recent</Text>
            </View>
          </TouchableOpacity>
          <View className="flex-row gap-6">
            {Object.keys(aspectRatios).map((ratio) => (
              <TouchableOpacity
                key={ratio}
                onPress={() => setAspectRatio(aspectRatios[ratio])}
                className={`${aspectRatio === aspectRatios[ratio] ? 'bg-primary-200' : 'bg-secondary-200'}`}
                style={{
                  width: 18 / aspectRatios[ratio],
                  height: 18,
                  borderRadius: 3,
                  borderColor: '#ffffff',
                  borderWidth: aspectRatio === aspectRatios[ratio] ? 2 : 0,
                }}
              />
            ))}
          </View>
        </View>
        <FlatList
          data={recentImages}
          renderItem={renderImageItem}
          keyExtractor={(item, index) => `${item.id}-${item.uri}-${index}`}
          numColumns={4}
          contentContainerStyle={{
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#2d2d30',
            borderRadius: 8,
          }}
          onEndReached={loadMoreImages}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={true}
          initialNumToRender={40}
          maxToRenderPerBatch={20}
          windowSize={16}
          getItemLayout={(data, index) => ({
            length: screenWidth / 4 - 4,
            offset: (screenWidth / 4 - 4) * index,
            index,
          })}
        />
      </View>
    </GestureHandlerRootView>
  );
};

export default Upload;
