import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import PostComposeForm from '@/components/PostComposeForm';
import { uploadPost } from '@/lib/uploadPost';

const PREPARED_UPLOAD_KEY = 'hootpost:prepared-upload';

const UploadCompose = () => {
  const [images, setImages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const payload = await AsyncStorage.getItem(PREPARED_UPLOAD_KEY);
      if (!payload) {
        router.replace('/upload');
        return;
      }
      const parsed = JSON.parse(payload);
      setImages(parsed.images || []);
    })();
  }, []);

  const submitPost = async (nextImages: any[], caption: string) => {
    setIsUploading(true);
    const result = await uploadPost({ images: nextImages, caption });
    setIsUploading(false);

    if (!result.success) {
      Alert.alert('Upload failed', result.message || 'Could not upload this post.');
      return;
    }

    await AsyncStorage.removeItem(PREPARED_UPLOAD_KEY);
    setSuccessVisible(true);
  };

  return (
    <PostComposeForm
      title="New Post"
      submitLabel="Post"
      submittingLabel="Posting"
      initialImages={images}
      isSubmitting={isUploading}
      successVisible={successVisible}
      successTitle="Upload successful"
      successText="Your post is live."
      onSubmit={submitPost}
      onBack={() => router.back()}
      onSuccessHome={() => {
        setSuccessVisible(false);
        router.replace('/home');
      }}
      onSuccessClose={() => setSuccessVisible(false)}
    />
  );
};

export default UploadCompose;
