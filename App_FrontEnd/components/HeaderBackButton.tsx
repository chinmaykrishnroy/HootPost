import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { icons } from '@/constants';

const goBackOrHome = (navigation?: any) => {
  if (navigation?.canGoBack?.()) {
    navigation.goBack();
    return;
  }
  if (router.canGoBack?.()) {
    router.back();
    return;
  }
  router.replace('/home');
};

const HeaderBackButton = ({ navigation, onPress }: { navigation?: any; onPress?: () => void }) => (
  <TouchableOpacity onPress={onPress || (() => goBackOrHome(navigation))} className="ml-4">
    <Image
      source={icons.leftArrow}
      className="w-6 h-6"
      style={{ tintColor: '#f33eb7' }}
    />
  </TouchableOpacity>
);

export default HeaderBackButton;
export { goBackOrHome };
