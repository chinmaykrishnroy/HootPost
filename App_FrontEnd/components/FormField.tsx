import { Text, View, TextInput, TouchableOpacity, Image } from "react-native";
import React, { useState } from "react";
import { icons } from "../constants";

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  warning,
  keyboardType,
  autoCapitalize,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`${otherStyles}`}>
      <Text className="text-gray-200 text-2xl font-spotifymixui px-1">
        {title}
      </Text>
      <View className="w-full h-16 px-4 bg-black border-2 border-black-200 rounded-xl focus:border-secondary-200 flex-row items-center">
        <TextInput
          className="flex-1 text-secondary text-lg font-spotifymixuititle"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#875689"
          onChangeText={handleChangeText}
          secureTextEntry={title === "Password" && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          selectionColor="#f00ea5"
          {...props}
        />
        {title === "Password" && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={!showPassword ? icons.view : icons.hide}
              className="w-8 h-8 ml-4"
              style={{ tintColor: "#dd87c0" }}
            />
          </TouchableOpacity>
        )}
      </View>
      <Text className="text-red-500 text-sm font-spotifymixuivar px-1">
        {warning}
      </Text>
    </View>
  );
};

export default FormField;
