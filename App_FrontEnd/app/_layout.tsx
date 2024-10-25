import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { Slot, SplashScreen, Stack } from "expo-router";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SystemUI from "expo-system-ui";
import * as NavigationBar from "expo-navigation-bar";
import GlobalProvider from "@/context/GlobalProvider";
import { GestureHandlerRootView } from 'react-native-gesture-handler'; 
import NotificationScreen, { NotificationScreenOptions } from "./notification";
import { MoreUserOptionOptions } from "./moreuseroptions";

SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  const scheme = useColorScheme();
  const isDarkMode = scheme === "dark";
  useEffect(() => {
    const backgroundColor = isDarkMode ? "#050505" : "#ffffff";
    SystemUI.setBackgroundColorAsync(backgroundColor);
    NavigationBar.setBackgroundColorAsync(backgroundColor);
  }, [isDarkMode]);
  const [fontsLoaded, error] = useFonts({
    "Open Sans": require("../assets/fonts/Open-Sans.ttf"),
    "Poppins": require("../assets/fonts/Poppins.ttf"),
    "Spotify Mix Black": require("../assets/fonts/Spotify-Mix-Black.ttf"),
    "Spotify Mix UI": require("../assets/fonts/Spotify-Mix-UI.ttf"),
    "Spotify Mix UI Title": require("../assets/fonts/Spotify-Mix-UI-Title.ttf"),
    "Spotify Mix UI Title Extrabold": require("../assets/fonts/Spotify-Mix-UI-Title-Extrabold.ttf"),
    "Spotify Mix UI Title Var": require("../assets/fonts/Spotify-Mix-UI-Title-Var.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
    if (!fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <GlobalProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(nontab)" options={{ headerShown: false }} />
        <Stack.Screen
          name="notification"
          options={NotificationScreenOptions}
        />
        <Stack.Screen
          name="moreuseroptions"
          options={MoreUserOptionOptions}
        />
      </Stack>
    </GlobalProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
