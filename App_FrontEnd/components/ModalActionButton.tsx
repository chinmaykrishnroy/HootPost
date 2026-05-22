import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

const ModalActionButton = ({
  title,
  onPress,
  disabled = false,
  danger = false,
  variant = 'primary',
  containerClassName = '',
}: any) => {
  const background = danger
    ? 'bg-red-600'
    : variant === 'secondary'
      ? 'bg-[#222]'
      : 'bg-primary-200';
  const textColor = danger
    ? 'text-white'
    : variant === 'secondary'
      ? 'text-secondary-300'
      : 'text-black';

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      className={`flex-1 ${background} rounded-md min-h-[48px] px-4 items-center justify-center ${disabled ? 'opacity-70' : ''} ${containerClassName}`}
    >
      <Text className={`${textColor} font-spotifymixuititleextrabold text-center`} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default ModalActionButton;
