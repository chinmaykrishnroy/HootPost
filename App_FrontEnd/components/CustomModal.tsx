import React from 'react';
import { View, Text, Modal, TouchableWithoutFeedback } from 'react-native';
import CustomButton from './CustomButton';

const CustomModal = ({
  title = "Options",
  color = 'text-secondary-300-200',
  isVisible,
  onClose,
  buttons = [],
  containerStyles
}) => {
  return (
<Modal
  transparent
  visible={isVisible}
  animationType="slide"
  onRequestClose={onClose}
>
  <TouchableWithoutFeedback onPress={onClose}>
    <View className="flex-1 justify-end bg-black/60">
      <View className={`rounded-t-3xl p-5 bg-background-100 ${containerStyles}`} style={{ height: "auto" }}>
        <View className="w-12 h-1.5 bg-gray-300 self-center mb-3 rounded-full" />
        <Text className={`text-3xl font-spotifymixuititleextrabold mb-4 ${color}`}>{title}</Text>
        {buttons.map((button, index) => (
          <CustomButton
            key={index}
            handlePress={button.onPress}
            title={button.title}
            containerStyles="mb-2"
          />
        ))}
        <CustomButton
          handlePress={onClose}
          title="Close"
          containerStyles="mb-2 bg-pink-400"
        />
      </View>
    </View>
  </TouchableWithoutFeedback>
</Modal>
  );
};

export default CustomModal;
