import { FlatList, StyleSheet, Text, View } from 'react-native'
import React from 'react'

const HorizontalList = ({users}) => {
  return (
    <FlatList
    data={users}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => <Text className="text-3xl">{item.id}</Text>}
    horizontal
    />
    
  )
}

export default HorizontalList

const styles = StyleSheet.create({})