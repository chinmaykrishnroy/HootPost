import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const EmptyPosts = () => {
  return (
    <View className={`flex-1 justify-center items-center px-4 border-black2-200 m-2 rounded-2xl p-2`}>
      <Text className='text-white font-spotifymixui text-3xl'>No Posts to Show!</Text>
    </View>
  )
}

export default EmptyPosts