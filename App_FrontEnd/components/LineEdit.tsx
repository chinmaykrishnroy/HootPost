import { Text, View, TextInput, TouchableOpacity, Image } from "react-native";
import React from "react";

const LineEdit = ({
  value,
  placeholder,
  icon,
  handleChangeText,
  keyboardType,
  autoCapitalize,
  disabled = false,
  onButtonPress,
  ...props
}) => {
  return (
    <View className="w-full h-10 px-4 bg-black border-2 border-black-200 rounded-xl focus:border-secondary-200 flex-row items-center">
      <TextInput
        className="flex-1 text-secondary-200 text-lg font-spotifymixuititle"
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#875689"
        onChangeText={handleChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        selectionColor="#d80c94"
        {...props}
      />
      <TouchableOpacity disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }} onPress={onButtonPress}>
        <Image
          source={icon}
          className="w-8 h-8 ml-4"
          style={{ tintColor: "#eab7d9" }}
        />
      </TouchableOpacity>
    </View>
  );
};

export default LineEdit;
