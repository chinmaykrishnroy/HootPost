// components/CustomDropdown.tsx
import { Text, View, TouchableOpacity } from "react-native";
import React, { useState, useRef } from "react";

const CustomDropdown = ({ title, options, selectedValue, setSelectedValue, otherStyles }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null); // Create a ref to get the dropdown's dimensions
  const [dropdownHeight, setDropdownHeight] = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(0);

  const handleDropdownLayout = (event: { nativeEvent: { layout: { width: any; height: any; }; }; }) => {
    const { width, height } = event.nativeEvent.layout;
    setDropdownWidth(width);
    setDropdownHeight(height);
  };

  return (
    <View className={otherStyles} onLayout={handleDropdownLayout}>
      <Text className="text-secondary-300 text-2xl font-spotifymixui px-1">
        {title}
      </Text>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        className="w-full h-16 px-4 bg-black border-2 border-black-200 rounded-xl flex-row items-center justify-between"
      >
        <Text className="text-secondary-200 text-lg font-spotifymixuititle">
          {selectedValue || "Select an option"}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View
          className="absolute bg-black border-2 border-black-200 rounded-xl mt-2"
          style={{
            width: dropdownWidth, // Set width to the same as the dropdown button
            height: dropdownHeight, // Set height to the same as the dropdown button
          }}
        >
          {options.map((option: boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.Key | null | undefined) => (
            <TouchableOpacity
              key={option}
              onPress={() => {
                setSelectedValue(option);
                setIsOpen(false);
              }}
              className="px-4 py-2"
            >
              <Text className="text-secondary-200 text-sm font-spotifymixui">{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default CustomDropdown;
