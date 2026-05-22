import React from 'react';
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';

const ActionSheetButton = ({ button }: any) => {
  const title = button.title || button.label || button.text || '';
  const disabled = button.disabled || button.isLoading;
  const isDanger = !!button.danger;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={disabled}
      onPress={button.onPress}
      className={`min-h-[56px] rounded-xl items-center justify-center px-4 mb-2 ${
        isDanger ? 'bg-red-600' : 'bg-secondary'
      } ${disabled ? 'opacity-70' : ''}`}
    >
      <Text
        className={`${isDanger ? 'text-white' : 'text-black'} font-spotifymixuititle text-lg text-center`}
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const CustomModal = ({
  title = "Options",
  color = 'text-secondary-300',
  isVisible,
  onClose,
  buttons = [],
  containerStyles,
  containerStyle,
  closeTitle = "Close",
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
          <View
            className={`rounded-t-3xl p-5 bg-background-100 ${containerStyles || ''}`}
            style={[{ height: 'auto' }, containerStyle]}
            onStartShouldSetResponder={() => true}
          >
            <View className="w-12 h-1.5 bg-gray-300 self-center mb-3 rounded-full" />
            <Text className={`text-3xl font-spotifymixuititleextrabold mb-4 ${color}`}>{title}</Text>
            <View>
              {buttons.map((button, index) => (
                <ActionSheetButton key={`${button.title || button.label || index}`} button={button} />
              ))}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={onClose}
                className="min-h-[56px] rounded-xl bg-pink-400 items-center justify-center px-4 mb-2"
              >
                <Text className="text-black font-spotifymixuititle text-lg text-center">{closeTitle}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default CustomModal;
