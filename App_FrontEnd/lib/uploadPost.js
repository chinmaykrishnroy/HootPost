import BASE_URL from '../config.js';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const extensionFromUri = (uri = '') => {
  const cleanUri = uri.split('?')[0];
  const extension = cleanUri.split('.').pop()?.toLowerCase();
  return extension && extension.length <= 5 ? extension : 'jpg';
};

const contentTypeFromExtension = (extension) => {
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'heif') return 'image/heif';
  return 'image/jpeg';
};

const contentTypeForImage = (image, extension) => {
  if (image.mimeType?.startsWith('image/')) return image.mimeType;
  return contentTypeFromExtension(extension);
};

const cropRectFromPreview = (image) => {
  const sourceWidth = Number(image.width);
  const sourceHeight = Number(image.height);
  const displayWidth = Number(image.displayWidth);
  const displayHeight = Number(image.displayHeight);

  if (!sourceWidth || !sourceHeight || !displayWidth || !displayHeight) {
    throw new Error('Could not read image dimensions for cropping.');
  }

  const scale = Math.max(1, Number(image.crop?.scale) || 1);
  const translateX = Number(image.crop?.x) || 0;
  const translateY = Number(image.crop?.y) || 0;
  const coverScale = Math.max(displayWidth / sourceWidth, displayHeight / sourceHeight);
  const cropWidth = clamp(Math.round(displayWidth / (coverScale * scale)), 1, sourceWidth);
  const cropHeight = clamp(Math.round(displayHeight / (coverScale * scale)), 1, sourceHeight);
  const displayedWidth = sourceWidth * coverScale * scale;
  const displayedHeight = sourceHeight * coverScale * scale;
  const originX = Math.round(((displayedWidth - displayWidth) / 2 - translateX) / (coverScale * scale));
  const originY = Math.round(((displayedHeight - displayHeight) / 2 - translateY) / (coverScale * scale));

  return {
    originX: clamp(originX, 0, Math.max(0, sourceWidth - cropWidth)),
    originY: clamp(originY, 0, Math.max(0, sourceHeight - cropHeight)),
    width: Math.min(cropWidth, sourceWidth),
    height: Math.min(cropHeight, sourceHeight),
  };
};

const createPreviewUploadFile = async (image, index) => {
  const crop = cropRectFromPreview(image);
  const result = await manipulateAsync(
    image.uri,
    [{ crop }],
    { compress: 0.92, format: SaveFormat.JPEG }
  );

  return {
    ...image,
    uri: result.uri,
    previewUri: result.uri,
    fileName: `post_${Date.now()}_${index}.jpg`,
    mimeType: 'image/jpeg',
    width: result.width,
    height: result.height,
    aspectRatio: result.width / result.height,
    crop: { x: 0, y: 0, scale: 1 },
    displayWidth: result.width,
    displayHeight: result.height,
  };
};

export const uploadPost = async ({ images = [], caption = '' }) => {
  if (!images.length) {
    return { success: false, message: 'Select at least one photo.' };
  }

  let uploadImages;
  try {
    uploadImages = await Promise.all(images.map(createPreviewUploadFile));
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Could not prepare the selected crop.',
    };
  }

  const formData = new FormData();

  uploadImages.forEach((image, index) => {
    const extension = extensionFromUri(image.fileName || image.uri);
    formData.append('images', {
      uri: image.uri,
      name: `post_${Date.now()}_${index}.${extension}`,
      type: contentTypeForImage(image, extension),
    });
    if (image.width) formData.append(`media[${index}][width]`, String(image.width));
    if (image.height) formData.append(`media[${index}][height]`, String(image.height));
    if (image.aspectRatio) formData.append(`media[${index}][aspectRatio]`, String(image.aspectRatio));
    formData.append(`media[${index}][frameMode]`, image.frameMode || 'square');
    formData.append(`media[${index}][crop][x]`, String(image.crop?.x || 0));
    formData.append(`media[${index}][crop][y]`, String(image.crop?.y || 0));
    formData.append(`media[${index}][crop][scale]`, String(image.crop?.scale || 1));
  });

  formData.append('caption', caption.trim());

  try {
    const response = await fetch(`${BASE_URL}/posts/create`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        message: data.message || data.error || `Image upload failed (${response.status}).`,
      };
    }

    return { success: true, post: data.post };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Image upload failed.',
    };
  }
};

export const uploadImage = async ({ selectedImage, imageFile, caption = 'Uploading Image' }) => {
  const uri = imageFile?.uri || selectedImage;
  const result = await uploadPost({
    images: uri ? [{ uri }] : [],
    caption,
  });
  return result.success ? true : result;
};

export const editPost = async ({ postId, images = [], caption = '' }) => {
  if (!postId) return { success: false, message: 'Post id is required.' };
  if (!images.length) return { success: false, message: 'A post needs at least one photo.' };

  try {
    const response = await fetch(`${BASE_URL}/posts/edit/${postId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: caption.trim(),
        media: images.map((image, index) => ({
          id: image.id,
          width: image.width,
          height: image.height,
          aspectRatio: image.aspectRatio,
          frameMode: image.frameMode || 'original',
          crop: image.crop || { x: 0, y: 0, scale: 1 },
          order: index,
        })),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, message: data.message || data.error || 'Could not update this post.' };
    }

    return { success: true, post: data.post };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Could not update this post.',
    };
  }
};
