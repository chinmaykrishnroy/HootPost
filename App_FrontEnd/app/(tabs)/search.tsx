import React from 'react';
import { Image, Text, View } from 'react-native';
import { icons } from '@/constants';
import HeaderBackButton from '@/components/HeaderBackButton';

const Search = () => (
  <View className="flex-1 justify-center items-center bg-[#050505] px-8">
    <View className="w-16 h-16 rounded-2xl bg-primary-200/15 items-center justify-center mb-4">
      <Image source={icons.search} className="w-8 h-8" style={{ tintColor: '#f33eb7' }} />
    </View>
    <Text className="text-secondary-300 text-3xl font-spotifymixuititleextrabold text-center">
      Search
    </Text>
    <Text className="text-gray-400 font-spotifymixui text-center mt-2">
      People, posts, and everything worth finding will live here.
    </Text>
  </View>
);

export const SearchScreenOptions = ({ navigation }) => ({
  headerTitle: () => (
    <View className="flex-row items-center">
      <Image source={icons.search} className="w-6 h-6 mr-2" style={{ tintColor: '#f33eb7' }} />
      <Text className="text-secondary text-2xl font-spotifymixuititle">Search</Text>
    </View>
  ),
  headerStyle: {
    backgroundColor: '#050505',
  },
  headerLeft: () => <HeaderBackButton navigation={navigation} />,
});

export default Search;
