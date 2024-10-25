import { manipulateAsync } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import BASE_URL from '../config.js';

const getSizeMode = (aspectRatio) => {
    const aspectRatioMap = {
      1: 11,
      1.25: 54,
      1.6: 85,
    };
    return aspectRatioMap[aspectRatio] || null;
  };
  
export const uploadImage = async ({ scale = 1, aspectRatio = 1, selectedImage, imageFile, caption='Uploading Image', originX, originY }) => {
    if (!imageFile && !selectedImage) return;
    let cacheUri;
    try {
      const formData = new FormData();
      if (imageFile) {
        const originalFormat = imageFile.uri.split('.').pop();
        formData.append('image', {
          uri: imageFile.uri,
          name: `image_${Date.now()}.${originalFormat}`,
          type: imageFile.mimeType,
        });
      } 
    //   else {
    //     const originalFormat = selectedImage.split('.').pop();
    //     const { width: originalWidth, height: originalHeight } = await manipulateAsync(
    //       selectedImage,
    //       [],
    //       { compress: 0.75, format: originalFormat === 'jpg' ? 'jpeg' : originalFormat }
    //     );
    //     const newWidth = Math.floor(originalWidth / scale);
    //     const newHeight = Math.floor(newWidth * aspectRatio);
    //     if (originX === undefined || originY === undefined) {
    //       originX = Math.floor((originalWidth - newWidth) / 2);
    //       originY = Math.floor((originalHeight - newHeight) / 2);
    //     }
    //     originX = Math.max(0, Math.min(originX, originalWidth - newWidth));
    //     originY = Math.max(0, Math.min(originY, originalHeight - newHeight));
    //     const manipResult = await manipulateAsync(
    //       selectedImage,
    //       [
    //         {
    //           crop: {
    //             originX,
    //             originY,
    //             width: newWidth,
    //             height: newHeight,
    //           },
    //         },
    //       ],
    //       { compress: 1, format: originalFormat === 'jpg' ? 'jpeg' : originalFormat }
    //     );
    //     cacheUri = manipResult.uri;
    //     formData.append('image', {
    //       uri: cacheUri,
    //       name: `image_${Date.now()}.${originalFormat}`,
    //       type: `image/${originalFormat}`,
    //     });
    //   }
      else {
        const originalFormat = selectedImage.split('.').pop();
        formData.append('image', {
          uri: selectedImage,
          name: `image_${Date.now()}.${originalFormat}`,
          type: `image/${originalFormat}`,
        });
      }
      const sizeMode = getSizeMode(aspectRatio);
      if (caption)
      formData.append('caption', caption);
      if (sizeMode !== null) {
        formData.append('sizeMode', sizeMode);
      }
      const response = await fetch(`${BASE_URL}/posts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        credentials: 'include',
        body: formData,
      });
      console.log(response)
      if (response.ok) {
        return true;
      } else {
        const error = await response.json();
        console.error('Upload failed:', error.message);
        return { success: false, message: error.message };
      }
    } catch (error) {
      console.error('Error:', error.message);
      return { success: false, message: error.message };
    } finally {
      if (cacheUri) {
        try {
          await FileSystem.deleteAsync(cacheUri, { idempotent: true });
        } catch (deleteError) {
          console.error('Error deleting cache:', deleteError.message);
        }
      }
    }
  }