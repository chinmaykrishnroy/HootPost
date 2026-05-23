import { View, Image, useColorScheme  } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import { icons } from "../../constants";
import { HomeScreenOptions } from "./home";
import { UserScreenOptions } from "./user";
import { ChatScreenOptions } from "./chat";
import { SearchScreenOptions } from "./search";

const TabIcon = ({ icon, color }) => {
  return (
    <View className="items-center justify-center h-full w-full">
      <Image
        source={icon}
        resizeMode="contain"
        tintColor={color}
        className="w-8 h-8"
      />
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
          height: 72,
          paddingTop: 4,
          paddingBottom: 4,
          alignItems: "center",
        },
        tabBarIconStyle: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 0,
        },
        tabBarItemStyle: {
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
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
              focused={focused}
            />
          ),
        })}
      />
      <Tabs.Screen
        name="search"
        options={({ navigation }) => ({
          ...SearchScreenOptions({ navigation }),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.search}
              color={color}
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
              focused={focused}
            />
          ),
        })}
      />
      <Tabs.Screen
        name="user"
        options={({ navigation }) => ({
          ...UserScreenOptions({ navigation }),
          unmountOnBlur: true,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.user}
              color={color}
              focused={focused}
            />
          ),
        })}
      />
    </Tabs>
  );
};

export default TabLayout;
