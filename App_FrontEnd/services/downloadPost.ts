import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from "react-native";
import BASE_URL from '../config.js';

export default downloadPostImage = async (postId: string | null) => {
  if (!postId) return;
  const downloadUrl = `${BASE_URL}/posts/${postId}/download`;
  try {
    const response = await fetch(downloadUrl, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      const imageUrl = data.image;
      if (!imageUrl) {
        throw new Error('Image URL is not available in the response');
      }
      const fileName = imageUrl.split('/').pop().split('?')[0];
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const imageResponse = await fetch(imageUrl);
      if (imageResponse.ok) {
        const imageBlob = await imageResponse.blob();
        const base64Data = await blobToBase64(imageBlob);
        await FileSystem.writeAsStringAsync(fileUri, base64Data.split(',')[1], {
          encoding: FileSystem.EncodingType.Base64,
        });
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Media library permissions are required to save images.');
          return;
        }
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        const album = await MediaLibrary.getAlbumAsync('HootPost');
        if (album == null) {
          await MediaLibrary.createAlbumAsync('HootPost', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
        await FileSystem.deleteAsync(fileUri);
        console.log(`Image saved at: ${fileUri}`);
      } else {
        const errorMessage = await imageResponse.text();
        console.error(`Error: ${imageResponse.status} - ${errorMessage}`);
        Alert.alert('Error', `Failed to download image: ${imageResponse.status} - ${errorMessage}`);
      }
    } else {
      const errorMessage = await response.text();
      console.error(`Error: ${response.status} - ${errorMessage}`);
      Alert.alert('Error', `Failed to get image URL: ${response.status} - ${errorMessage}`);
    }
  } catch (error) {
    console.error(error);
    Alert.alert('Error', error.message);
  }
};

const blobToBase64 = (blob: Blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
