import { Text, View, Image, useColorScheme  } from "react-native";
import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { icons } from "../../constants";
import * as SystemUI from "expo-system-ui";
import { HomeScreenOptions } from "./home";
import { UserScreenOptions } from "./user";
import { ChatScreenOptions } from "./chat";

const TabIcon = ({ icon, color, name, focused }) => {
  return (
    <View className="items-center justify-center gap-1">
      <Image
        source={icon}
        resizeMode="contain"
        tintColor={color}
        className="w-6 h-6"
      />
      <Text
        className={`${
          focused ? "font-spotifymixblack" : "font-spotifymixuititle"
        } text-xs`}
        style={{ color: color }}
      >
        {name}
      </Text>
    </View>
  );
};

const TabLayout = () => {
  const scheme = useColorScheme();
  const isDarkMode = scheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#f33eb7",
        tabBarInactiveTintColor: "#eab7d9",
        tabBarStyle: {
          backgroundColor: isDarkMode ? "#010101" : "#e6a7d1",
          borderTopColor: isDarkMode ? "#323532" : "#e2b39b",
          height: 56,
          paddingTop: 14,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={({ navigation }) => ({
          ...HomeScreenOptions({ navigation }),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.home}
              color={color}
              name="Home"
              focused={focused}
            />
          ),
        })}
      />
      <Tabs.Screen
        name="chat"
        options={({ navigation }) => ({
          ...ChatScreenOptions({ navigation }),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.chat}
              color={color}
              name="Chat"
              focused={focused}
            />
          ),
        })}
      />
      <Tabs.Screen
        name="upload"
        options={({ navigation }) => ({
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.file}
              color={color}
              name="Upload"
              focused={focused}
            />
          ),
        })}
      />
      <Tabs.Screen
        name="user"
        options={({ navigation }) => ({
          ...UserScreenOptions({ navigation }),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.user}
              color={color}
              name="Me"
              focused={focused}
            />
          ),
        })}
      />
    </Tabs>
  );
};

export default TabLayout;