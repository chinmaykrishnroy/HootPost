import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import PostComposeForm from '@/components/PostComposeForm';
import { editPost } from '@/lib/uploadPost';

const EDIT_POST_KEY = 'hootpost:edit-post';

const EditCompose = () => {
  const [postId, setPostId] = useState<string | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [caption, setCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const payload = await AsyncStorage.getItem(EDIT_POST_KEY);
      if (!payload) {
        router.replace('/user');
        return;
      }

      const parsed = JSON.parse(payload);
      setPostId(parsed.postId);
      setCaption(parsed.caption || '');
      setImages((parsed.media || []).map((item: any) => ({
        id: item.id,
        uri: item.url,
        previewUri: item.url,
        width: item.width,
        height: item.height,
        aspectRatio: item.aspectRatio || 1,
        frameMode: item.frameMode || 'original',
        crop: item.crop || { x: 0, y: 0, scale: 1 },
      })));
    })();
  }, []);

  const submitEdit = async (nextImages: any[], nextCaption: string) => {
    if (!postId) return;
    setIsSaving(true);
    const result = await editPost({ postId, images: nextImages, caption: nextCaption });
    setIsSaving(false);

    if (!result.success) {
      Alert.alert('Update failed', result.message || 'Could not update this post.');
      return;
    }

    await AsyncStorage.removeItem(EDIT_POST_KEY);
    setSuccessVisible(true);
  };

  return (
    <PostComposeForm
      title="Edit Post"
      submitLabel="Save"
      submittingLabel="Saving"
      initialImages={images}
      initialCaption={caption}
      isSubmitting={isSaving}
      successVisible={successVisible}
      successTitle="Post updated"
      successText="Your changes are saved."
      onSubmit={submitEdit}
      onBack={() => router.back()}
      onSuccessHome={() => {
        setSuccessVisible(false);
        router.replace('/home');
      }}
      onSuccessClose={() => {
        setSuccessVisible(false);
        router.replace('/user');
      }}
    />
  );
};

export default EditCompose;
