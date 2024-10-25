import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const openMediaPicker = async (onMediaSelected, allowsEditing = true, aspect = [1, 1], quality = 1) => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permissionResult.granted === false) {
    Alert.alert('Permission to access camera roll is required!');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsEditing,
    aspect,
    quality,
  });

  if (!result.canceled) {
    onMediaSelected(result.assets[0]);
  }
};

export default openMediaPicker;
